import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { encryptPassword } from '$lib/server/crypto';
import { caldavConnections, householdMembers } from '@home-dashboard/database/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Create a new CalDAV connection with encrypted password
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const {
      email,
      password,
      serverUrl,
      displayName,
      selectedCalendars = [],
      syncPastDays = 30,
      syncFutureDays = 365
    } = await request.json();

    if (!email || !password || !serverUrl) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    const session = await locals.getSession();
    if (!session) {
      return json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!locals.db) {
      return json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Get user's household using direct database connection
    const householdMemberships = await locals.db
      .select()
      .from(householdMembers)
      .where(eq(householdMembers.userId, session.user.id))
      .limit(1);

    if (!householdMemberships || householdMemberships.length === 0) {
      return json({ error: 'No household found' }, { status: 400 });
    }

    const householdId = householdMemberships[0].householdId;

    // Encrypt password
    const encryptedPassword = await encryptPassword(password);

    console.log(`[CalDAV Connections] Saving connection with ${selectedCalendars.length} selected calendars:`,
      selectedCalendars.map((cal: any) => ({ name: cal.name, enabled: cal.enabled })));

    // Save connection using direct database connection
    const [connection] = await locals.db
      .insert(caldavConnections)
      .values({
        userId: session.user.id,
        householdId: householdId,
        email,
        passwordEncrypted: encryptedPassword,
        serverUrl: serverUrl,
        displayName: displayName || email,
        enabled: true,
        lastSyncStatus: 'pending',
        selectedCalendars: selectedCalendars,
        syncPastDays: syncPastDays.toString(),
        syncFutureDays: syncFutureDays.toString(),
      })
      .returning();

    return json({ success: true, connection });
  } catch (error: any) {
    console.error('[CalDAV Connections] Error:', error);
    return json(
      {
        error: error.message || 'Failed to create connection',
      },
      { status: 500 }
    );
  }
};
