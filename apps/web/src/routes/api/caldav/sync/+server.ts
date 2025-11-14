import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { createDAVClient } from 'tsdav';
import { parseICalendarData, type ParsedEvent } from '$lib/caldav/ical-parser';

const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Sync a parsed event to the database
 * Creates new event or updates existing one
 */
async function syncEventToDatabase(connection: any, parsedEvent: ParsedEvent): Promise<void> {
  // Check if mapping already exists
  const { data: existingMapping } = await supabase
    .from('caldav_event_mappings')
    .select('*, events(*)')
    .eq('caldav_connection_id', connection.id)
    .eq('external_uid', parsedEvent.external_uid)
    .single();

  if (existingMapping && existingMapping.events) {
    // Event exists, check if it needs updating
    const existingEvent = existingMapping.events as any;

    // Compare key fields to see if update needed
    const needsUpdate =
      existingEvent.title !== parsedEvent.title ||
      existingEvent.description !== parsedEvent.description ||
      existingEvent.start_time !== parsedEvent.start_time ||
      existingEvent.end_time !== parsedEvent.end_time ||
      existingEvent.all_day !== parsedEvent.all_day ||
      existingEvent.location !== parsedEvent.location ||
      existingEvent.recurrence_rule !== parsedEvent.recurrence_rule;

    if (needsUpdate) {
      // Update existing event
      await supabase
        .from('events')
        .update({
          title: parsedEvent.title,
          description: parsedEvent.description,
          start_time: parsedEvent.start_time,
          end_time: parsedEvent.end_time,
          all_day: parsedEvent.all_day,
          location: parsedEvent.location,
          recurrence_rule: parsedEvent.recurrence_rule,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingEvent.id);

      // Update mapping
      await supabase
        .from('caldav_event_mappings')
        .update({
          external_url: parsedEvent.external_url,
          etag: parsedEvent.etag,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', existingMapping.id);

      console.log(`[CalDAV Sync] Updated event: ${parsedEvent.title}`);
    } else {
      // Just update last_synced_at
      await supabase
        .from('caldav_event_mappings')
        .update({
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', existingMapping.id);
    }
  } else {
    // Create new event
    const { data: newEvent, error: eventError } = await supabase
      .from('events')
      .insert({
        family_id: connection.family_id,
        user_id: connection.user_id,
        title: parsedEvent.title,
        description: parsedEvent.description,
        start_time: parsedEvent.start_time,
        end_time: parsedEvent.end_time,
        all_day: parsedEvent.all_day,
        location: parsedEvent.location,
        recurrence_rule: parsedEvent.recurrence_rule,
      })
      .select()
      .single();

    if (eventError) throw eventError;

    // Create mapping
    await supabase
      .from('caldav_event_mappings')
      .insert({
        event_id: newEvent.id,
        caldav_connection_id: connection.id,
        external_uid: parsedEvent.external_uid,
        external_calendar: parsedEvent.external_calendar,
        external_url: parsedEvent.external_url,
        etag: parsedEvent.etag,
        sync_direction: 'import',
        last_synced_at: new Date().toISOString(),
      });

    console.log(`[CalDAV Sync] Created new event: ${parsedEvent.title}`);
  }
}

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
        let syncedEvents = 0;
        let errorCount = 0;

        for (const calendar of calendars) {
          try {
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
                    await syncEventToDatabase(connection, parsedEvent);
                    syncedEvents++;
                  } catch (err) {
                    console.error(`[CalDAV Sync] Failed to save event ${parsedEvent.external_uid}:`, err);
                    errorCount++;
                  }
                }
              } catch (err) {
                console.error('[CalDAV Sync] Failed to parse calendar object:', err);
                errorCount++;
              }
            }
          } catch (err: any) {
            console.error(`[CalDAV Sync] Failed to fetch calendar "${calendar.displayName}":`, err);
            errorCount++;
          }
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
          syncedEvents,
          errorCount,
        });

        console.log(`[CalDAV Sync] Success for ${connection.email}: ${syncedEvents}/${totalEvents} events synced, ${errorCount} errors`);
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
