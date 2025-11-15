/**
 * CalDAV push utilities
 * Handles pushing local events to CalDAV servers
 */

import { createDAVClient } from 'tsdav';
import { eventToICalendar } from '$lib/caldav/ical-parser';
import { decryptPassword } from '$lib/server/crypto';
import { caldavConnections, caldavEventMappings, categories, events } from '@home-dashboard/database/db/schema';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

/**
 * Push an event to CalDAV if its category is synced
 * Call this after creating/updating an event
 */
export async function pushEventToCalDAVIfNeeded(
  db: PostgresJsDatabase,
  event: any
): Promise<void> {
  // Skip if no category
  if (!event.categoryId) return;

  // Check if category has CalDAV connection
  const category = await db
    .select()
    .from(categories)
    .where(eq(categories.id, event.categoryId))
    .limit(1);

  if (!category[0]?.caldavConnectionId) return;

  // Get the connection
  const connection = await db
    .select()
    .from(caldavConnections)
    .where(eq(caldavConnections.id, category[0].caldavConnectionId))
    .limit(1);

  if (!connection[0]) return;

  try {
    // Mark as pending
    await db
      .update(events)
      .set({
        lastPushStatus: 'pending',
        lastPushAt: new Date(),
        lastPushError: null,
      })
      .where(eq(events.id, event.id));

    await pushEventToCalDAV(db, connection[0], event);

    // Mark as success
    await db
      .update(events)
      .set({
        lastPushStatus: 'success',
        lastPushAt: new Date(),
        lastPushError: null,
      })
      .where(eq(events.id, event.id));

    console.log(`[CalDAV Push] Successfully pushed event ${event.id} to CalDAV`);
  } catch (err: any) {
    // Mark as error
    await db
      .update(events)
      .set({
        lastPushStatus: 'error',
        lastPushAt: new Date(),
        lastPushError: err.message || 'Unknown error',
      })
      .where(eq(events.id, event.id));

    console.error(`[CalDAV Push] Failed to push event ${event.id}:`, err);
    // Don't throw - we don't want to fail the event creation if CalDAV push fails
  }
}

/**
 * Delete an event from CalDAV if its category is synced
 * Call this before deleting an event from the database
 */
export async function deleteEventFromCalDAVIfNeeded(
  db: PostgresJsDatabase,
  event: any
): Promise<void> {
  // Skip if no category
  if (!event.categoryId) return;

  // Check if category has CalDAV connection
  const category = await db
    .select()
    .from(categories)
    .where(eq(categories.id, event.categoryId))
    .limit(1);

  if (!category[0]?.caldavConnectionId) return;

  // Get the connection
  const connection = await db
    .select()
    .from(caldavConnections)
    .where(eq(caldavConnections.id, category[0].caldavConnectionId))
    .limit(1);

  if (!connection[0]) return;

  try {
    await deleteEventFromCalDAV(db, connection[0], event);
    console.log(`[CalDAV Delete] Successfully deleted event ${event.id} from CalDAV`);
  } catch (err: any) {
    console.error(`[CalDAV Delete] Failed to delete event ${event.id}:`, err);
    // Re-throw to prevent database deletion if CalDAV delete fails
    // This maintains data consistency - event stays in both places or gets deleted from both
    throw new Error(`Failed to delete from CalDAV: ${err.message}`);
  }
}

/**
 * Delete a single event from CalDAV server
 */
async function deleteEventFromCalDAV(
  db: PostgresJsDatabase,
  connection: any,
  event: any
): Promise<void> {
  // Get existing mapping to find the event in CalDAV
  const existingMapping = await db
    .select()
    .from(caldavEventMappings)
    .where(eq(caldavEventMappings.eventId, event.id))
    .limit(1);

  if (!existingMapping[0]) {
    console.log(`[CalDAV Delete] No mapping found for event ${event.id}, skipping CalDAV delete`);
    return;
  }

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

  // Delete the event using the stored URL and etag
  const eventUrl = existingMapping[0].externalUrl;
  const etag = existingMapping[0].etag;

  if (!eventUrl) {
    throw new Error('No external URL found for event');
  }

  console.log(`[CalDAV Delete] Deleting event from: ${eventUrl}`);

  await client.deleteCalendarObject({
    calendarObject: {
      url: eventUrl,
      etag: etag || undefined,
    },
  });

  // Delete the mapping from database (the event itself will be deleted by the caller)
  await db
    .delete(caldavEventMappings)
    .where(eq(caldavEventMappings.id, existingMapping[0].id));
}

/**
 * Push a single event to CalDAV server
 */
async function pushEventToCalDAV(
  db: PostgresJsDatabase,
  connection: any,
  event: any
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

  // Get existing mapping to find target calendar
  const existingMapping = await db
    .select()
    .from(caldavEventMappings)
    .where(eq(caldavEventMappings.eventId, event.id))
    .limit(1);

  // Get calendars
  const calendars = await client.fetchCalendars();
  if (!calendars || calendars.length === 0) {
    throw new Error('No calendars found');
  }

  // Use the mapped calendar or first calendar
  let targetCalendar = calendars[0];
  if (existingMapping[0]?.externalCalendar) {
    const foundCalendar = calendars.find(
      (cal) => cal.displayName === existingMapping[0].externalCalendar
    );
    if (foundCalendar) targetCalendar = foundCalendar;
  }

  console.log(`[CalDAV Push] Pushing to calendar: "${targetCalendar.displayName}" (${targetCalendar.url})`);
  console.log(`[CalDAV Push] Event details: ${event.title}, Start: ${event.startTime}, End: ${event.endTime}, AllDay: ${event.allDay}`);

  // Generate URL for the event
  const eventFileName = `${event.icalUid || event.id}.ics`;
  const eventUrl = `${targetCalendar.url}${eventFileName}`;

  console.log(`[CalDAV Push] Event URL: ${eventUrl}`);
  console.log(`[CalDAV Push] iCalendar data:\n${icsData}`);

  // Create or update the event
  await client.createCalendarObject({
    calendar: targetCalendar,
    filename: eventFileName,
    iCalString: icsData,
  });

  // Create or update mapping
  if (existingMapping[0]) {
    await db
      .update(caldavEventMappings)
      .set({
        lastSyncedAt: new Date(),
        externalUrl: eventUrl,
      })
      .where(eq(caldavEventMappings.id, existingMapping[0].id));
  } else {
    await db.insert(caldavEventMappings).values({
      eventId: event.id,
      caldavConnectionId: connection.id,
      externalUid: event.icalUid || event.id,
      externalCalendar: targetCalendar.displayName || targetCalendar.url,
      externalUrl: eventUrl,
      syncDirection: 'export',
      lastSyncedAt: new Date(),
    });
  }
}
