import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { createDAVClient } from 'tsdav';
import { eventToICalendar } from '$lib/caldav/ical-parser';

const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Push a local event to CalDAV server
 */
async function pushEventToCalDAV(connection: any, event: any, mapping?: any): Promise<void> {
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

  // Convert event to iCalendar format
  const icsData = eventToICalendar(event);

  // Get calendars
  const calendars = await client.fetchCalendars();
  if (!calendars || calendars.length === 0) {
    throw new Error('No calendars found');
  }

  // Use the first calendar (or specified calendar from mapping)
  let targetCalendar = calendars[0];
  if (mapping?.external_calendar) {
    const foundCalendar = calendars.find(cal => cal.displayName === mapping.external_calendar);
    if (foundCalendar) targetCalendar = foundCalendar;
  }

  // Generate URL for the event
  const eventFileName = `${event.ical_uid || event.id}.ics`;
  const eventUrl = mapping?.external_url || `${targetCalendar.url}/${eventFileName}`;

  if (mapping && mapping.external_url) {
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
      await supabase
        .from('caldav_event_mappings')
        .update({
          external_url: result.url || eventUrl,
          external_calendar: targetCalendar.displayName || 'Calendar',
          etag: result.etag || null,
          sync_direction: 'bidirectional',
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', mapping.id);
    } else {
      await supabase
        .from('caldav_event_mappings')
        .insert({
          event_id: event.id,
          caldav_connection_id: connection.id,
          external_uid: event.ical_uid || event.id,
          external_calendar: targetCalendar.displayName || 'Calendar',
          external_url: result.url || eventUrl,
          etag: result.etag || null,
          sync_direction: 'export',
          last_synced_at: new Date().toISOString(),
        });
    }
  }

  // Increment sequence number
  await supabase
    .from('events')
    .update({
      sequence: (event.sequence || 0) + 1,
      ical_timestamp: new Date().toISOString(),
    })
    .eq('id', event.id);
}

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { connectionId, eventId } = await request.json();

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

    // Get connection
    const { data: connection, error: connectionError } = await supabase
      .from('caldav_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .eq('enabled', true)
      .single();

    if (connectionError || !connection) {
      return json({ error: 'Connection not found' }, { status: 404 });
    }

    if (eventId) {
      // Push single event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('family_id', connection.family_id)
        .single();

      if (eventError || !event) {
        return json({ error: 'Event not found' }, { status: 404 });
      }

      // Get existing mapping if any
      const { data: mapping } = await supabase
        .from('caldav_event_mappings')
        .select('*')
        .eq('event_id', eventId)
        .eq('caldav_connection_id', connectionId)
        .single();

      await pushEventToCalDAV(connection, event, mapping);

      return json({
        success: true,
        message: 'Event pushed successfully',
      });
    } else {
      // Push all unsynced events for this connection
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          caldav_event_mappings!left(*)
        `)
        .eq('family_id', connection.family_id)
        .gte('start_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .lte('start_time', new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()); // Next 365 days

      if (eventsError) throw eventsError;

      let pushedCount = 0;
      let errorCount = 0;

      for (const event of events || []) {
        try {
          // Find mapping for this connection
          const mappings = (event as any).caldav_event_mappings || [];
          const mapping = mappings.find((m: any) => m.caldav_connection_id === connectionId);

          // Only push if:
          // 1. No mapping exists (new local event)
          // 2. Event was updated after last sync (check updated_at vs last_synced_at)
          const shouldPush =
            !mapping ||
            mapping.sync_direction === 'import' ||
            (mapping.sync_direction === 'bidirectional' &&
              new Date(event.updated_at) > new Date(mapping.last_synced_at));

          if (shouldPush) {
            await pushEventToCalDAV(connection, event, mapping);
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
