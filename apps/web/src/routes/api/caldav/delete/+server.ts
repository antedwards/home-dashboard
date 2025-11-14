import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { createDAVClient } from 'tsdav';
import { decryptPassword } from '$lib/server/crypto';

const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Delete an event from CalDAV server
 */
async function deleteEventFromCalDAV(connection: any, mapping: any): Promise<void> {
  // Decrypt password
  const decryptedPassword = await decryptPassword(connection.password_encrypted);

  // Create DAV client
  const client = await createDAVClient({
    serverUrl: connection.server_url,
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
      url: mapping.external_url,
      etag: mapping.etag || undefined,
    },
  });

  console.log(`[CalDAV Delete] Deleted event from CalDAV: ${mapping.external_uid}`);
}

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { eventId } = await request.json();

    if (!eventId) {
      return json({ error: 'Event ID required' }, { status: 400 });
    }

    // Get user from session
    const sessionCookie = cookies.get('sb-access-token');
    if (!sessionCookie) {
      return json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(sessionCookie);
    if (userError || !user) {
      return json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('user_id', user.id)
      .single();

    if (eventError || !event) {
      return json({ error: 'Event not found' }, { status: 404 });
    }

    // Get all mappings for this event
    const { data: mappings, error: mappingsError } = await supabase
      .from('caldav_event_mappings')
      .select('*, caldav_connections(*)')
      .eq('event_id', eventId);

    if (mappingsError) throw mappingsError;

    // Delete from all connected CalDAV servers
    let deleteCount = 0;
    let errorCount = 0;

    for (const mapping of mappings || []) {
      try {
        const connection = (mapping as any).caldav_connections;
        if (connection && connection.enabled) {
          await deleteEventFromCalDAV(connection, mapping);
          deleteCount++;
        }

        // Remove mapping
        await supabase
          .from('caldav_event_mappings')
          .delete()
          .eq('id', mapping.id);
      } catch (err) {
        console.error(`[CalDAV Delete] Failed to delete from mapping ${mapping.id}:`, err);
        errorCount++;
      }
    }

    // Delete the event from our database
    await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

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
