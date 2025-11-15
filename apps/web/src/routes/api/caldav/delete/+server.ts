import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDAVClient } from 'tsdav';
import { decryptPassword } from '$lib/server/crypto';
import { caldavConnections, caldavEventMappings, events } from '@home-dashboard/database/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Delete an event from CalDAV server
 */
async function deleteEventFromCalDAV(connection: any, mapping: any): Promise<void> {
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

  // Delete the calendar object
  await client.deleteCalendarObject({
    calendarObject: {
      url: mapping.externalUrl,
      etag: mapping.etag || undefined,
    },
  });

  console.log(`[CalDAV Delete] Deleted event from CalDAV: ${mapping.externalUid}`);
}

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const { eventId } = await request.json();

    if (!eventId) {
      return json({ error: 'Event ID required' }, { status: 400 });
    }

    const session = await locals.getSession();
    if (!session) {
      return json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!locals.db) {
      return json({ error: 'Database connection not available' }, { status: 500 });
    }

    const db = locals.db;

    // Get event
    const eventsList = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    const event = eventsList[0];

    if (!event || event.userId !== session.user.id) {
      return json({ error: 'Event not found' }, { status: 404 });
    }

    // Get all mappings for this event
    const mappings = await db
      .select()
      .from(caldavEventMappings)
      .where(eq(caldavEventMappings.eventId, eventId));

    // Delete from all connected CalDAV servers
    let deleteCount = 0;
    let errorCount = 0;

    for (const mapping of mappings) {
      try {
        // Get the connection for this mapping
        const connections = await db
          .select()
          .from(caldavConnections)
          .where(eq(caldavConnections.id, mapping.caldavConnectionId))
          .limit(1);

        const connection = connections[0];

        if (connection && connection.enabled) {
          await deleteEventFromCalDAV(connection, mapping);
          deleteCount++;
        }

        // Remove mapping
        await db.delete(caldavEventMappings).where(eq(caldavEventMappings.id, mapping.id));
      } catch (err) {
        console.error(`[CalDAV Delete] Failed to delete from mapping ${mapping.id}:`, err);
        errorCount++;
      }
    }

    // Delete the event from our database
    await db.delete(events).where(eq(events.id, eventId));

    return json({
      success: true,
      message: `Event deleted from ${deleteCount} CalDAV server(s)`,
      deleteCount,
      errorCount,
    });
  } catch (error: any) {
    console.error('[CalDAV Delete] Error:', error);
    return json(
      {
        error: error.message || 'Delete failed',
      },
      { status: 500 }
    );
  }
};
