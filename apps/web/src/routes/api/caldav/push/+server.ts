import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDAVClient } from 'tsdav';
import { eventToICalendar } from '$lib/caldav/ical-parser';
import { decryptPassword } from '$lib/server/crypto';
import { caldavConnections, caldavEventMappings, events } from '@home-dashboard/database/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

/**
 * Push a local event to CalDAV server
 */
async function pushEventToCalDAV(
  db: PostgresJsDatabase,
  connection: any,
  event: any,
  mapping?: any
): Promise<void> {
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

  // Convert event to iCalendar format
  const icsData = eventToICalendar(event);

  // Get calendars
  const calendars = await client.fetchCalendars();
  if (!calendars || calendars.length === 0) {
    throw new Error('No calendars found');
  }

  // Use the first calendar (or specified calendar from mapping)
  let targetCalendar = calendars[0];
  if (mapping?.externalCalendar) {
    const foundCalendar = calendars.find((cal) => cal.displayName === mapping.externalCalendar);
    if (foundCalendar) targetCalendar = foundCalendar;
  }

  // Generate URL for the event
  const eventFileName = `${event.icalUid || event.id}.ics`;
  const eventUrl = mapping?.externalUrl || `${targetCalendar.url}/${eventFileName}`;

  if (mapping && mapping.externalUrl) {
    // Update existing event
    await client.updateCalendarObject({
      calendarObject: {
        url: eventUrl,
        data: icsData,
        etag: mapping.etag || undefined,
      },
    });
    console.log(`[CalDAV Push] Updated event: ${event.title}`);
  } else {
    // Create new event
    const result = await client.createCalendarObject({
      calendar: targetCalendar,
      filename: eventFileName,
      iCalString: icsData,
    });
    console.log(`[CalDAV Push] Created new event: ${event.title}`);

    // Create or update mapping
    if (mapping) {
      await db
        .update(caldavEventMappings)
        .set({
          externalUrl: result.url || eventUrl,
          externalCalendar: targetCalendar.displayName || 'Calendar',
          etag: result.etag || null,
          syncDirection: 'bidirectional',
          lastSyncedAt: new Date(),
        })
        .where(eq(caldavEventMappings.id, mapping.id));
    } else {
      await db.insert(caldavEventMappings).values({
        eventId: event.id,
        caldavConnectionId: connection.id,
        externalUid: event.icalUid || event.id,
        externalCalendar: targetCalendar.displayName || 'Calendar',
        externalUrl: result.url || eventUrl,
        etag: result.etag || null,
        syncDirection: 'export',
        lastSyncedAt: new Date(),
      });
    }
  }

  // Increment sequence number
  const currentSequence = parseInt(event.sequence || '0', 10);
  await db
    .update(events)
    .set({
      sequence: (currentSequence + 1).toString(),
      icalTimestamp: new Date(),
    })
    .where(eq(events.id, event.id));
}

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const { connectionId, eventId } = await request.json();

    const session = await locals.getSession();
    if (!session) {
      return json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!locals.db) {
      return json({ error: 'Database connection not available' }, { status: 500 });
    }

    const db = locals.db;

    // Get connection
    const connections = await db
      .select()
      .from(caldavConnections)
      .where(
        and(
          eq(caldavConnections.id, connectionId),
          eq(caldavConnections.userId, session.user.id),
          eq(caldavConnections.enabled, true)
        )
      )
      .limit(1);

    const connection = connections[0];

    if (!connection) {
      return json({ error: 'Connection not found' }, { status: 404 });
    }

    if (eventId) {
      // Push single event
      const eventsList = await db
        .select()
        .from(events)
        .where(and(eq(events.id, eventId), eq(events.householdId, connection.householdId)))
        .limit(1);

      const event = eventsList[0];

      if (!event) {
        return json({ error: 'Event not found' }, { status: 404 });
      }

      // Get existing mapping if any
      const mappings = await db
        .select()
        .from(caldavEventMappings)
        .where(
          and(
            eq(caldavEventMappings.eventId, eventId),
            eq(caldavEventMappings.caldavConnectionId, connectionId)
          )
        )
        .limit(1);

      const mapping = mappings[0];

      await pushEventToCalDAV(db, connection, event, mapping);

      return json({
        success: true,
        message: 'Event pushed successfully',
      });
    } else {
      // Push all unsynced events for this connection
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      const eventsList = await db
        .select()
        .from(events)
        .where(
          and(
            eq(events.householdId, connection.householdId),
            gte(events.startTime, thirtyDaysAgo),
            lte(events.startTime, oneYearFromNow)
          )
        );

      let pushedCount = 0;
      let errorCount = 0;

      for (const event of eventsList) {
        try {
          // Get mapping for this connection
          const mappings = await db
            .select()
            .from(caldavEventMappings)
            .where(
              and(
                eq(caldavEventMappings.eventId, event.id),
                eq(caldavEventMappings.caldavConnectionId, connectionId)
              )
            )
            .limit(1);

          const mapping = mappings[0];

          // Only push if:
          // 1. No mapping exists (new local event)
          // 2. Event was updated after last sync (check updated_at vs last_synced_at)
          const shouldPush =
            !mapping ||
            mapping.syncDirection === 'import' ||
            (mapping.syncDirection === 'bidirectional' &&
              event.updatedAt &&
              mapping.lastSyncedAt &&
              new Date(event.updatedAt) > new Date(mapping.lastSyncedAt));

          if (shouldPush) {
            await pushEventToCalDAV(db, connection, event, mapping);
            pushedCount++;
          }
        } catch (err) {
          console.error(`[CalDAV Push] Failed to push event ${event.id}:`, err);
          errorCount++;
        }
      }

      return json({
        success: true,
        message: `Pushed ${pushedCount} event(s), ${errorCount} error(s)`,
        pushedCount,
        errorCount,
      });
    }
  } catch (error: any) {
    console.error('[CalDAV Push] Error:', error);
    return json(
      {
        error: error.message || 'Push failed',
      },
      { status: 500 }
    );
  }
};
