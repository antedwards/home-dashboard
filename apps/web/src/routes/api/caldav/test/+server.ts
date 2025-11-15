import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDAVClient } from 'tsdav';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email, password, serverUrl } = await request.json();

    if (!email || !password || !serverUrl) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`[CalDAV Test] Testing connection for ${email}...`);

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

    console.log('[CalDAV Test] Client created, fetching calendars...');

    // Fetch calendars to verify connection
    const calendars = await client.fetchCalendars();

    if (!calendars || calendars.length === 0) {
      return json({ error: 'No calendars found. Check your credentials.' }, { status: 401 });
    }

    console.log(`[CalDAV Test] Success! Found ${calendars.length} calendars`);

    // Get display name from first calendar
    const displayName = calendars[0].displayName || email;

    return json({
      success: true,
      displayName,
      calendarsFound: calendars.length,
      calendars: calendars.map(cal => ({
        displayName: cal.displayName,
        url: cal.url,
        ctag: cal.ctag,
      })),
    });
  } catch (error: any) {
    console.error('[CalDAV Test] Connection failed:', error);

    // Provide helpful error messages
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      return json({
        error: 'Invalid credentials. Please check your email and app-specific password.',
      }, { status: 401 });
    }

    if (error.message?.includes('404') || error.message?.includes('Not Found')) {
      return json({
        error: 'Calendar service not found. Please check the server URL.',
      }, { status: 404 });
    }

    if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
      return json({
        error: 'Connection timeout. Please check your internet connection.',
      }, { status: 408 });
    }

    return json({
      error: error.message || 'Failed to connect to calendar service',
    }, { status: 500 });
  }
};
