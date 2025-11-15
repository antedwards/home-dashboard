/**
 * CalDAV Calendars API
 * Fetches available calendars from a CalDAV server without syncing
 * Used in the multi-step sync flow
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDAVClient } from 'tsdav';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email, password, serverUrl } = await request.json();

    if (!email || !password || !serverUrl) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`[CalDAV] Fetching calendars for ${email}...`);

    // Create DAV client
    const client = await createDAVClient({
      serverUrl,
      credentials: {
        username: email,
        password,
      },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    });

    // Fetch calendars
    const calendars = await client.fetchCalendars();

    console.log(`[CalDAV] Found ${calendars.length} calendars for ${email}`);

    // For each calendar, get a count of events
    const calendarsWithCounts = await Promise.all(
      calendars.map(async (calendar) => {
        try {
          // Fetch objects from this calendar
          const objects = await client.fetchCalendarObjects({
            calendar: calendar,
          });

          return {
            name: calendar.displayName || 'Untitled Calendar',
            url: calendar.url,
            description: calendar.description || null,
            ctag: calendar.ctag || null,
            syncToken: calendar.syncToken || null,
            eventCount: objects.length,
            // Generate a color based on calendar name (consistent hashing)
            color: generateColorFromString(calendar.displayName || calendar.url),
          };
        } catch (err) {
          console.error(`[CalDAV] Error fetching events for ${calendar.displayName}:`, err);
          return {
            name: calendar.displayName || 'Untitled Calendar',
            url: calendar.url,
            description: calendar.description || null,
            ctag: calendar.ctag || null,
            syncToken: calendar.syncToken || null,
            eventCount: 0,
            color: generateColorFromString(calendar.displayName || calendar.url),
          };
        }
      })
    );

    return json({
      success: true,
      calendars: calendarsWithCounts,
      email,
      serverUrl,
    });
  } catch (error: any) {
    console.error('[CalDAV] Failed to fetch calendars:', error);

    // Provide helpful error messages
    let errorMessage = 'Failed to fetch calendars';
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      errorMessage = 'Invalid email or password';
    } else if (error.message?.includes('Network') || error.message?.includes('ENOTFOUND')) {
      errorMessage = 'Unable to connect to server. Check your internet connection.';
    }

    return json({
      error: errorMessage,
      details: error.message
    }, { status: error.status || 500 });
  }
};

/**
 * Generate a consistent color from a string
 */
function generateColorFromString(str: string): string {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
  ];

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}
