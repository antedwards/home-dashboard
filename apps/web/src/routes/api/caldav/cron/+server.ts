import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDAVClient } from 'tsdav';
import { parseICalendarData, type ParsedEvent } from '$lib/caldav/ical-parser';
import { decryptPassword } from '$lib/server/crypto';
import { caldavConnections, caldavEventMappings, events } from '@home-dashboard/database/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

/**
 * Sync a parsed event to the database (reusing logic from sync endpoint)
 */
async function syncEventToDatabase(
  db: PostgresJsDatabase,
  connection: any,
  parsedEvent: ParsedEvent
): Promise<void> {
  const existingMappings = await db
    .select()
    .from(caldavEventMappings)
    .where(
      and(
        eq(caldavEventMappings.caldavConnectionId, connection.id),
        eq(caldavEventMappings.externalUid, parsedEvent.external_uid)
      )
    )
    .limit(1);

  const existingMapping = existingMappings[0];

  if (existingMapping) {
    const existingEvents = await db
      .select()
      .from(events)
      .where(eq(events.id, existingMapping.eventId))
      .limit(1);

    const existingEvent = existingEvents[0];

    if (existingEvent) {
      const needsUpdate =
        existingEvent.title !== parsedEvent.title ||
        existingEvent.description !== parsedEvent.description ||
        existingEvent.startTime?.toISOString() !== parsedEvent.start_time ||
        existingEvent.endTime?.toISOString() !== parsedEvent.end_time ||
        existingEvent.allDay !== parsedEvent.all_day ||
        existingEvent.location !== parsedEvent.location ||
        existingEvent.recurrenceRule !== parsedEvent.recurrence_rule ||
        existingEvent.status !== parsedEvent.status ||
        existingEvent.sequence !== parsedEvent.sequence?.toString();

      if (needsUpdate) {
        await db
          .update(events)
          .set({
            title: parsedEvent.title,
            description: parsedEvent.description,
            startTime: new Date(parsedEvent.start_time),
            endTime: new Date(parsedEvent.end_time),
            allDay: parsedEvent.all_day,
            location: parsedEvent.location,
            recurrenceRule: parsedEvent.recurrence_rule,
            status: parsedEvent.status,
            sequence: parsedEvent.sequence?.toString(),
            icalUid: parsedEvent.ical_uid,
            icalTimestamp: parsedEvent.ical_timestamp ? new Date(parsedEvent.ical_timestamp) : null,
            updatedAt: new Date(),
          })
          .where(eq(events.id, existingEvent.id));

        await db
          .update(caldavEventMappings)
          .set({
            externalUrl: parsedEvent.external_url,
            etag: parsedEvent.etag,
            lastSyncedAt: new Date(),
          })
          .where(eq(caldavEventMappings.id, existingMapping.id));
      } else {
        await db
          .update(caldavEventMappings)
          .set({
            lastSyncedAt: new Date(),
          })
          .where(eq(caldavEventMappings.id, existingMapping.id));
      }
    }
  } else {
    const [newEvent] = await db
      .insert(events)
      .values({
        householdId: connection.householdId,
        userId: connection.userId,
        title: parsedEvent.title,
        description: parsedEvent.description,
        startTime: new Date(parsedEvent.start_time),
        endTime: new Date(parsedEvent.end_time),
        allDay: parsedEvent.all_day,
        location: parsedEvent.location,
        recurrenceRule: parsedEvent.recurrence_rule,
        status: parsedEvent.status,
        sequence: parsedEvent.sequence?.toString(),
        icalUid: parsedEvent.ical_uid,
        icalTimestamp: parsedEvent.ical_timestamp ? new Date(parsedEvent.ical_timestamp) : null,
      })
      .returning();

    await db.insert(caldavEventMappings).values({
      eventId: newEvent.id,
      caldavConnectionId: connection.id,
      externalUid: parsedEvent.external_uid,
      externalCalendar: parsedEvent.external_calendar,
      externalUrl: parsedEvent.external_url,
      etag: parsedEvent.etag,
      syncDirection: 'import',
      lastSyncedAt: new Date(),
    });
  }
}

/**
 * Automatic sync cron job
 * Syncs all enabled connections (both pull and push)
 */
export const GET: RequestHandler = async ({ request, locals }) => {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET || 'change-me-in-production';

    if (authHeader !== expectedSecret) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!locals.db) {
      return json({ error: 'Database connection not available' }, { status: 500 });
    }

    const db = locals.db;

    console.log('[CalDAV Cron] Starting automatic sync...');

    // Get all enabled connections
    const connections = await db
      .select()
      .from(caldavConnections)
      .where(eq(caldavConnections.enabled, true));

    if (!connections || connections.length === 0) {
      return json({
        success: true,
        message: 'No enabled connections to sync',
      });
    }

    console.log(`[CalDAV Cron] Found ${connections.length} enabled connection(s)`);

    const results = [];

    for (const connection of connections) {
      try {
        console.log(`[CalDAV Cron] Syncing ${connection.email}...`);

        await db
          .update(caldavConnections)
          .set({
            lastSyncStatus: 'pending',
            lastSyncError: null,
          })
          .where(eq(caldavConnections.id, connection.id));

        // Decrypt password
        const decryptedPassword = await decryptPassword(connection.passwordEncrypted);

        const client = await createDAVClient({
          serverUrl: connection.serverUrl,
          credentials: {
            username: connection.email,
            password: decryptedPassword,
          },
          authMethod: 'Basic',
          defaultAccountType: 'caldav',
        });

        const calendars = await client.fetchCalendars();
        let totalEvents = 0;
        let syncedEvents = 0;

        // Pull events from CalDAV
        for (const calendar of calendars) {
          try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 365);

            const calendarObjects = await client.fetchCalendarObjects({
              calendar: calendar,
              timeRange: {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
              },
            });

            totalEvents += calendarObjects.length;

            for (const calObject of calendarObjects) {
              try {
                if (!calObject.data) continue;

                const parsedEvents = parseICalendarData(
                  calObject.data,
                  calendar.displayName || 'Calendar',
                  calObject.url || calendar.url
                );

                for (const parsedEvent of parsedEvents) {
                  try {
                    if (parsedEvent.status === 'cancelled') {
                      const existingMappings = await db
                        .select()
                        .from(caldavEventMappings)
                        .where(
                          and(
                            eq(caldavEventMappings.caldavConnectionId, connection.id),
                            eq(caldavEventMappings.externalUid, parsedEvent.external_uid)
                          )
                        )
                        .limit(1);

                      const existingMapping = existingMappings[0];

                      if (existingMapping) {
                        const existingEvents = await db
                          .select()
                          .from(events)
                          .where(eq(events.id, existingMapping.eventId))
                          .limit(1);

                        if (existingEvents[0]) {
                          await db
                            .update(events)
                            .set({
                              status: 'cancelled',
                              updatedAt: new Date(),
                            })
                            .where(eq(events.id, existingEvents[0].id));
                        }
                      }
                    } else {
                      await syncEventToDatabase(db, connection, parsedEvent);
                    }
                    syncedEvents++;
                  } catch (err) {
                    console.error(`[CalDAV Cron] Failed to save event:`, err);
                  }
                }
              } catch (err) {
                console.error('[CalDAV Cron] Failed to parse calendar object:', err);
              }
            }
          } catch (err: any) {
            console.error(`[CalDAV Cron] Failed to fetch calendar:`, err);
          }
        }

        await db
          .update(caldavConnections)
          .set({
            lastSyncAt: new Date(),
            lastSyncStatus: 'success',
            lastSyncError: null,
          })
          .where(eq(caldavConnections.id, connection.id));

        results.push({
          connectionId: connection.id,
          email: connection.email,
          success: true,
          eventsFound: totalEvents,
          syncedEvents,
        });
      } catch (error: any) {
        console.error(`[CalDAV Cron] Failed for ${connection.email}:`, error);

        await db
          .update(caldavConnections)
          .set({
            lastSyncStatus: 'error',
            lastSyncError: error.message || 'Unknown error',
          })
          .where(eq(caldavConnections.id, connection.id));

        results.push({
          connectionId: connection.id,
          email: connection.email,
          success: false,
          error: error.message,
        });
      }
    }

    console.log(
      `[CalDAV Cron] Completed: ${results.filter((r) => r.success).length}/${results.length} successful`
    );

    return json({
      success: true,
      results,
      message: `Synced ${results.filter((r) => r.success).length} of ${results.length} connection(s)`,
    });
  } catch (error: any) {
    console.error('[CalDAV Cron] Error:', error);
    return json(
      {
        error: error.message || 'Cron sync failed',
      },
      { status: 500 }
    );
  }
};
