import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { createDAVClient } from 'tsdav';
import { parseICalendarData } from '$lib/caldav/ical-parser';

const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Sync a parsed event to the database (reusing logic from sync endpoint)
 */
async function syncEventToDatabase(connection: any, parsedEvent: any): Promise<void> {
  const { data: existingMapping } = await supabase
    .from('caldav_event_mappings')
    .select('*, events(*)')
    .eq('caldav_connection_id', connection.id)
    .eq('external_uid', parsedEvent.external_uid)
    .single();

  if (existingMapping && existingMapping.events) {
    const existingEvent = existingMapping.events as any;

    const needsUpdate =
      existingEvent.title !== parsedEvent.title ||
      existingEvent.description !== parsedEvent.description ||
      existingEvent.start_time !== parsedEvent.start_time ||
      existingEvent.end_time !== parsedEvent.end_time ||
      existingEvent.all_day !== parsedEvent.all_day ||
      existingEvent.location !== parsedEvent.location ||
      existingEvent.recurrence_rule !== parsedEvent.recurrence_rule ||
      existingEvent.status !== parsedEvent.status ||
      existingEvent.sequence !== parsedEvent.sequence;

    if (needsUpdate) {
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
          status: parsedEvent.status,
          sequence: parsedEvent.sequence,
          ical_uid: parsedEvent.ical_uid,
          ical_timestamp: parsedEvent.ical_timestamp,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingEvent.id);

      await supabase
        .from('caldav_event_mappings')
        .update({
          external_url: parsedEvent.external_url,
          etag: parsedEvent.etag,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', existingMapping.id);
    } else {
      await supabase
        .from('caldav_event_mappings')
        .update({
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', existingMapping.id);
    }
  } else {
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
        status: parsedEvent.status,
        sequence: parsedEvent.sequence,
        ical_uid: parsedEvent.ical_uid,
        ical_timestamp: parsedEvent.ical_timestamp,
      })
      .select()
      .single();

    if (eventError) throw eventError;

    await supabase.from('caldav_event_mappings').insert({
      event_id: newEvent.id,
      caldav_connection_id: connection.id,
      external_uid: parsedEvent.external_uid,
      external_calendar: parsedEvent.external_calendar,
      external_url: parsedEvent.external_url,
      etag: parsedEvent.etag,
      sync_direction: 'import',
      last_synced_at: new Date().toISOString(),
    });
  }
}

/**
 * Automatic sync cron job
 * Syncs all enabled connections (both pull and push)
 */
export const GET: RequestHandler = async ({ request }) => {
  try {
    // Verify this is a legitimate cron request
    // You should add authentication here (e.g., check for a secret header)
    const authHeader = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET || 'change-me-in-production';

    if (authHeader !== expectedSecret) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[CalDAV Cron] Starting automatic sync...');

    // Get all enabled connections
    const { data: connections, error: connectionsError } = await supabase
      .from('caldav_connections')
      .select('*')
      .eq('enabled', true);

    if (connectionsError) throw connectionsError;

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

        await supabase
          .from('caldav_connections')
          .update({
            last_sync_status: 'pending',
            last_sync_error: null,
          })
          .eq('id', connection.id);

        const client = await createDAVClient({
          serverUrl: connection.server_url,
          credentials: {
            username: connection.email,
            password: connection.password_encrypted,
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
                      const { data: existingMapping } = await supabase
                        .from('caldav_event_mappings')
                        .select('*, events(*)')
                        .eq('caldav_connection_id', connection.id)
                        .eq('external_uid', parsedEvent.external_uid)
                        .single();

                      if (existingMapping && existingMapping.events) {
                        await supabase
                          .from('events')
                          .update({
                            status: 'cancelled',
                            updated_at: new Date().toISOString(),
                          })
                          .eq('id', (existingMapping.events as any).id);
                      }
                    } else {
                      await syncEventToDatabase(connection, parsedEvent);
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
        });
      } catch (error: any) {
        console.error(`[CalDAV Cron] Failed for ${connection.email}:`, error);

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
