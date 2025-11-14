import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { createDAVClient } from 'tsdav';

const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { connectionId } = await request.json();

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

    // Get connections to sync
    let query = supabase
      .from('caldav_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('enabled', true);

    if (connectionId) {
      query = query.eq('id', connectionId);
    }

    const { data: connections, error: connectionsError } = await query;

    if (connectionsError) throw connectionsError;

    if (!connections || connections.length === 0) {
      return json({ error: 'No connections found' }, { status: 404 });
    }

    console.log(`[CalDAV Sync] Starting sync for ${connections.length} connection(s)...`);

    const results = [];

    for (const connection of connections) {
      try {
        console.log(`[CalDAV Sync] Syncing ${connection.email}...`);

        // Update status to pending
        await supabase
          .from('caldav_connections')
          .update({
            last_sync_status: 'pending',
            last_sync_error: null,
          })
          .eq('id', connection.id);

        // Create DAV client
        const client = await createDAVClient({
          serverUrl: connection.server_url,
          credentials: {
            username: connection.email,
            password: connection.password_encrypted, // TODO: Decrypt this
          },
          authMethod: 'Basic',
          defaultAccountType: 'caldav',
        });

        // Fetch calendars
        const calendars = await client.fetchCalendars();

        console.log(`[CalDAV Sync] Found ${calendars.length} calendars for ${connection.email}`);

        // Fetch events from each calendar
        let totalEvents = 0;

        for (const calendar of calendars) {
          // Calculate date range (30 days back, 365 days forward)
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);

          const endDate = new Date();
          endDate.setDate(endDate.getDate() + 365);

          // Fetch events in range
          const calendarObjects = await client.fetchCalendarObjects({
            calendar: calendar,
            timeRange: {
              start: startDate.toISOString(),
              end: endDate.toISOString(),
            },
          });

          console.log(`[CalDAV Sync] Calendar "${calendar.displayName}": ${calendarObjects.length} events`);

          totalEvents += calendarObjects.length;

          // TODO: Parse iCalendar format and save to database
          // This is where we'll convert CalDAV events to our database format
          // and create/update events in the events table
        }

        // Update success status
        await supabase
          .from('caldav_connections')
          .update({
            last_sync_at: new Date().toISOString(),
            last_sync_status: 'success',
            last_sync_error: null,
          })
          .eq('id', connection.id);

        results.push({
          connectionId: connection.id,
          email: connection.email,
          success: true,
          eventsFound: totalEvents,
        });

        console.log(`[CalDAV Sync] Success for ${connection.email}: ${totalEvents} events`);
      } catch (error: any) {
        console.error(`[CalDAV Sync] Failed for ${connection.email}:`, error);

        // Update error status
        await supabase
          .from('caldav_connections')
          .update({
            last_sync_status: 'error',
            last_sync_error: error.message || 'Unknown error',
          })
          .eq('id', connection.id);

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
      message: `Synced ${results.filter(r => r.success).length} of ${results.length} connection(s)`,
    });
  } catch (error: any) {
    console.error('[CalDAV Sync] Error:', error);
    return json({
      error: error.message || 'Sync failed',
    }, { status: 500 });
  }
};
