import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDAVClient } from 'tsdav';
import { parseICalendarData, type ParsedEvent } from '$lib/caldav/ical-parser';
import { decryptPassword } from '$lib/server/crypto';
import { caldavConnections, caldavEventMappings, events, households, categories, eventAttendees, users, householdMembers } from '@home-dashboard/database/db/schema';
import { eq, and, or, isNull, gt } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { pushEventToCalDAVIfNeeded } from '$lib/server/caldav-push';

// Colors for auto-created categories
const CATEGORY_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

let colorIndex = 0;

/**
 * Sync attendees for an event
 * Matches attendee emails with household users and creates event_attendee records
 */
async function syncEventAttendees(
  db: PostgresJsDatabase,
  eventId: string,
  householdId: string,
  parsedAttendees: ParsedEvent['attendees']
): Promise<void> {
  // Delete existing attendees for this event
  await db.delete(eventAttendees).where(eq(eventAttendees.eventId, eventId));

  if (!parsedAttendees || parsedAttendees.length === 0) {
    return;
  }

  console.log(`[CalDAV Sync] Processing ${parsedAttendees.length} attendees for event ${eventId}`);
  console.log(`[CalDAV Sync] Attendee emails: ${parsedAttendees.map(a => a.email).join(', ')}`);

  // Get all users in the household
  const members = await db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
    })
    .from(householdMembers)
    .innerJoin(users, eq(householdMembers.userId, users.id))
    .where(eq(householdMembers.householdId, householdId));

  console.log(`[CalDAV Sync] Found ${members.length} household members: ${members.map(m => m.email).join(', ')}`);

  // Match attendees with household users by email
  const attendeesToCreate = [];
  for (const attendee of parsedAttendees) {
    // Find matching user in household
    const matchingUser = members.find(
      member => member.email?.toLowerCase() === attendee.email.toLowerCase()
    );

    if (matchingUser) {
      console.log(`[CalDAV Sync] Matched attendee ${attendee.email} to household member ${matchingUser.name}`);
      attendeesToCreate.push({
        eventId,
        userId: matchingUser.userId,
      });
    } else {
      console.log(`[CalDAV Sync] No household match for attendee ${attendee.email}`);
    }
  }

  // Create attendee records
  if (attendeesToCreate.length > 0) {
    await db.insert(eventAttendees).values(attendeesToCreate);
    console.log(`[CalDAV Sync] Created ${attendeesToCreate.length} attendee records`);
  } else {
    console.log(`[CalDAV Sync] No matching attendees found to create`);
  }
}

/**
 * Find or create a category for an external calendar
 */
async function findOrCreateCategory(
  db: PostgresJsDatabase,
  householdId: string,
  ownerId: string,
  calendarName: string,
  connectionId: string,
  calendarColor?: string
): Promise<string> {
  // Check if category exists
  const existingCategories = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.householdId, householdId),
        eq(categories.name, calendarName)
      )
    )
    .limit(1);

  if (existingCategories.length > 0) {
    // Update the connection ID if not set
    if (!existingCategories[0].caldavConnectionId) {
      await db
        .update(categories)
        .set({ caldavConnectionId: connectionId })
        .where(eq(categories.id, existingCategories[0].id));
    }
    return existingCategories[0].id;
  }

  // Create new category - use provided color or fall back to sequential color
  const color = calendarColor || CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length];
  if (!calendarColor) {
    colorIndex++;
  }

  const [newCategory] = await db
    .insert(categories)
    .values({
      householdId,
      ownerId,
      name: calendarName,
      color,
      visibility: 'household', // Default to household-visible
      caldavConnectionId: connectionId,
      source: 'caldav',
    })
    .returning();

  console.log(`[CalDAV Sync] Created new category: ${calendarName} (${color})`);
  return newCategory.id;
}

/**
 * Sync a parsed event to the database
 * Creates new event or updates existing one
 */
async function syncEventToDatabase(
  db: PostgresJsDatabase,
  connection: any,
  parsedEvent: ParsedEvent
): Promise<void> {
  // Check if mapping already exists
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
    // Get the associated event
    const existingEvents = await db
      .select()
      .from(events)
      .where(eq(events.id, existingMapping.eventId))
      .limit(1);

    const existingEvent = existingEvents[0];

    if (existingEvent) {
      // Conflict resolution using SEQUENCE and DTSTAMP
      // Higher sequence number wins; if equal, newer DTSTAMP wins
      const incomingSequence = parsedEvent.sequence || 0;
      const existingSequence = parseInt(existingEvent.sequence || '0', 10);

      const incomingTimestamp = parsedEvent.ical_timestamp
        ? new Date(parsedEvent.ical_timestamp).getTime()
        : 0;
      const existingTimestamp = existingEvent.icalTimestamp
        ? new Date(existingEvent.icalTimestamp).getTime()
        : 0;

      // Determine if incoming version should overwrite existing
      const shouldUpdate =
        incomingSequence > existingSequence ||
        (incomingSequence === existingSequence && incomingTimestamp > existingTimestamp);

      if (!shouldUpdate) {
        // Local version is newer, skip update but update mapping timestamp
        console.log(`[CalDAV Sync] Skipping update - local version is newer: ${parsedEvent.title}`);
        await db
          .update(caldavEventMappings)
          .set({ lastSyncedAt: new Date() })
          .where(eq(caldavEventMappings.id, existingMapping.id));
        return;
      }

      // Compare key fields to see if update needed
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
        // Update existing event
        console.log(
          `[CalDAV Sync] Updating event (seq ${existingSequence} → ${incomingSequence}): ${parsedEvent.title}`
        );
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
            organizerEmail: parsedEvent.organizer_email,
            organizerName: parsedEvent.organizer_name,
            externalAttendees: parsedEvent.attendees || [],
            updatedAt: new Date(),
          })
          .where(eq(events.id, existingEvent.id));

        // Sync attendees
        await syncEventAttendees(db, existingEvent.id, connection.householdId, parsedEvent.attendees);

        // Update mapping
        await db
          .update(caldavEventMappings)
          .set({
            externalUrl: parsedEvent.external_url,
            etag: parsedEvent.etag,
            lastSyncedAt: new Date(),
          })
          .where(eq(caldavEventMappings.id, existingMapping.id));

        console.log(`[CalDAV Sync] Updated event: ${parsedEvent.title}`);
      } else {
        // Just update last_synced_at
        await db
          .update(caldavEventMappings)
          .set({ lastSyncedAt: new Date() })
          .where(eq(caldavEventMappings.id, existingMapping.id));
      }
    }
  } else {
    // Find or create category for this calendar
    // Look up the calendar color from the connection's selected calendars
    const selectedCalendars = connection.selectedCalendars as any[] || [];
    const calendarInfo = selectedCalendars.find((cal: any) =>
      cal.name === parsedEvent.external_calendar
    );
    const calendarColor = calendarInfo?.color;

    const categoryId = await findOrCreateCategory(
      db,
      connection.householdId,
      connection.userId,
      parsedEvent.external_calendar,
      connection.id,
      calendarColor
    );

    // Create new event
    const [newEvent] = await db
      .insert(events)
      .values({
        householdId: connection.householdId,
        userId: connection.userId,
        categoryId, // Assign to the calendar's category
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
        organizerEmail: parsedEvent.organizer_email,
        organizerName: parsedEvent.organizer_name,
        externalAttendees: parsedEvent.attendees || [],
      })
      .returning();

    // Sync attendees
    await syncEventAttendees(db, newEvent.id, connection.householdId, parsedEvent.attendees);

    // Create mapping
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

    console.log(`[CalDAV Sync] Created new event: ${parsedEvent.title}`);
  }
}

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const { connectionId } = await request.json();

    const session = await locals.getSession();
    if (!session) {
      return json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!locals.db) {
      return json({ error: 'Database connection not available' }, { status: 500 });
    }

    const db = locals.db;

    // Get connections to sync
    let connectionsQuery = db
      .select()
      .from(caldavConnections)
      .where(
        and(eq(caldavConnections.userId, session.user.id), eq(caldavConnections.enabled, true))
      );

    let connections;
    if (connectionId) {
      connections = await connectionsQuery.where(eq(caldavConnections.id, connectionId));
    } else {
      connections = await connectionsQuery;
    }

    if (!connections || connections.length === 0) {
      return json({ error: 'No connections found' }, { status: 404 });
    }

    console.log(`[CalDAV Sync] Starting sync for ${connections.length} connection(s)...`);

    const results = [];

    for (const connection of connections) {
      try {
        console.log(`[CalDAV Sync] Syncing ${connection.email}...`);

        // Update status to pending
        await db
          .update(caldavConnections)
          .set({
            lastSyncStatus: 'pending',
            lastSyncError: null,
          })
          .where(eq(caldavConnections.id, connection.id));

        // Decrypt password
        const decryptedPassword = await decryptPassword(connection.passwordEncrypted);

        // Create DAV client
        const client = await createDAVClient({
          serverUrl: connection.serverUrl,
          credentials: {
            username: connection.email,
            password: decryptedPassword,
          },
          authMethod: 'Basic',
          defaultAccountType: 'caldav',
        });

        // Fetch calendars
        const allCalendars = await client.fetchCalendars();

        console.log(`[CalDAV Sync] Found ${allCalendars.length} calendars for ${connection.email}`);

        // Filter calendars based on selected_calendars setting
        const selectedCalendars = connection.selectedCalendars as any[] || [];
        console.log(`[CalDAV Sync] Selected calendars from DB (${selectedCalendars.length}):`,
          selectedCalendars.map((cal: any) => ({ name: cal.name, enabled: cal.enabled, url: cal.url })));
        console.log(`[CalDAV Sync] All calendars from server (${allCalendars.length}):`,
          allCalendars.map((cal: any) => ({ name: cal.displayName, url: cal.url })));

        const calendarsToSync = selectedCalendars.length > 0
          ? allCalendars.filter(cal => {
              // Check if this calendar is in the selected list
              const match = selectedCalendars.some(selected =>
                selected.enabled && (
                  selected.url === cal.url ||
                  selected.name === (cal.displayName || cal.url)
                )
              );
              if (match) {
                console.log(`[CalDAV Sync] Matched calendar: ${cal.displayName} (url: ${cal.url})`);
              }
              return match;
            })
          : allCalendars; // If no selection, sync all (backwards compatibility)

        console.log(`[CalDAV Sync] Syncing ${calendarsToSync.length} of ${allCalendars.length} calendars`);

        // Get date range settings from connection (with defaults)
        const syncPastDays = parseInt(connection.syncPastDays || '30', 10);
        const syncFutureDays = parseInt(connection.syncFutureDays || '365', 10);

        console.log(`[CalDAV Sync] Date range: ${syncPastDays} days past, ${syncFutureDays} days future`);

        // Fetch events from each calendar
        let totalEvents = 0;
        let syncedEvents = 0;
        let errorCount = 0;

        for (const calendar of calendarsToSync) {
          try {
            // Calculate date range based on connection settings
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - syncPastDays);

            const endDate = new Date();
            endDate.setDate(endDate.getDate() + syncFutureDays);

            // Fetch events in range
            const calendarObjects = await client.fetchCalendarObjects({
              calendar: calendar,
              timeRange: {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
              },
            });

            console.log(
              `[CalDAV Sync] Calendar "${calendar.displayName}": ${calendarObjects.length} events`
            );

            totalEvents += calendarObjects.length;

            // Parse and save each event
            for (const calObject of calendarObjects) {
              try {
                if (!calObject.data) continue;

                // Parse iCalendar data
                const parsedEvents = parseICalendarData(
                  calObject.data,
                  calendar.displayName || 'Calendar',
                  calObject.url || calendar.url
                );

                // Save each parsed event to database
                for (const parsedEvent of parsedEvents) {
                  try {
                    // If event is cancelled, handle deletion
                    if (parsedEvent.status === 'cancelled') {
                      // Find existing mapping
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
                        // Get the event
                        const existingEvents = await db
                          .select()
                          .from(events)
                          .where(eq(events.id, existingMapping.eventId))
                          .limit(1);

                        if (existingEvents[0]) {
                          // Mark event as cancelled (soft delete)
                          await db
                            .update(events)
                            .set({
                              status: 'cancelled',
                              updatedAt: new Date(),
                            })
                            .where(eq(events.id, existingEvents[0].id));

                          console.log(`[CalDAV Sync] Cancelled event: ${parsedEvent.title}`);
                        }
                      }
                    } else {
                      // Normal sync
                      await syncEventToDatabase(db, connection, parsedEvent);
                    }
                    syncedEvents++;
                  } catch (err) {
                    console.error(
                      `[CalDAV Sync] Failed to save event ${parsedEvent.external_uid}:`,
                      err
                    );
                    errorCount++;
                  }
                }
              } catch (err) {
                console.error('[CalDAV Sync] Failed to parse calendar object:', err);
                errorCount++;
              }
            }
          } catch (err: any) {
            console.error(
              `[CalDAV Sync] Failed to fetch calendar "${calendar.displayName}":`,
              err
            );
            errorCount++;
          }
        }

        // BIDIRECTIONAL SYNC: Push local changes back to CalDAV
        console.log(`[CalDAV Sync] Starting bidirectional push for ${connection.email}...`);
        let pushedEvents = 0;
        let pushErrorCount = 0;

        try {
          // Find all categories connected to this CalDAV connection
          const connectedCategories = await db
            .select()
            .from(categories)
            .where(eq(categories.caldavConnectionId, connection.id));

          if (connectedCategories.length > 0) {
            const categoryIds = connectedCategories.map(cat => cat.id);

            // Find events that need to be pushed:
            // 1. Events in these categories
            // 2. Events that have never been pushed (lastPushAt is null)
            // 3. OR events that failed to push (lastPushStatus = 'error')
            // 4. OR events that were updated after last push (updatedAt > lastPushAt)
            const eventsToPush = await db
              .select()
              .from(events)
              .where(
                and(
                  eq(events.householdId, connection.householdId),
                  // Event must be in one of the connected categories
                  or(...categoryIds.map(id => eq(events.categoryId, id))),
                  // Event hasn't been successfully pushed or was updated since last push
                  or(
                    isNull(events.lastPushAt),
                    eq(events.lastPushStatus, 'error'),
                    and(
                      gt(events.updatedAt, events.lastPushAt)
                    )
                  )
                )
              );

            console.log(`[CalDAV Sync] Found ${eventsToPush.length} events to push`);

            // Push each event
            for (const event of eventsToPush) {
              try {
                await pushEventToCalDAVIfNeeded(db, event);
                pushedEvents++;
              } catch (err) {
                console.error(`[CalDAV Sync] Failed to push event ${event.id}:`, err);
                pushErrorCount++;
              }
            }

            console.log(`[CalDAV Sync] Pushed ${pushedEvents}/${eventsToPush.length} events, ${pushErrorCount} errors`);
          }
        } catch (err) {
          console.error(`[CalDAV Sync] Bidirectional push failed:`, err);
        }

        // Update success status
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
          errorCount,
          pushedEvents,
          pushErrorCount,
        });

        console.log(
          `[CalDAV Sync] Success for ${connection.email}: ${syncedEvents}/${totalEvents} events synced, ${errorCount} errors`
        );
      } catch (error: any) {
        console.error(`[CalDAV Sync] Failed for ${connection.email}:`, error);

        // Update error status
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

    return json({
      success: true,
      results,
      message: `Synced ${results.filter((r) => r.success).length} of ${results.length} connection(s)`,
    });
  } catch (error: any) {
    console.error('[CalDAV Sync] Error:', error);
    return json(
      {
        error: error.message || 'Sync failed',
      },
      { status: 500 }
    );
  }
};
