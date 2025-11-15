/**
 * Update calendar selections for an existing CalDAV connection
 * Allows users to enable/disable specific calendars
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { caldavConnections } from '@home-dashboard/database/db/schema';
import { eq, and } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const { connectionId, selectedCalendars, syncPastDays, syncFutureDays } = await request.json();

    if (!connectionId) {
      return json({ error: 'connectionId is required' }, { status: 400 });
    }

    const session = await locals.getSession();
    if (!session) {
      return json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!locals.db) {
      return json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Update connection settings
    const [updated] = await locals.db
      .update(caldavConnections)
      .set({
        selectedCalendars: selectedCalendars || [],
        syncPastDays: syncPastDays?.toString() || '30',
        syncFutureDays: syncFutureDays?.toString() || '365',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(caldavConnections.id, connectionId),
          eq(caldavConnections.userId, session.user.id)
        )
      )
      .returning();

    if (!updated) {
      return json({ error: 'Connection not found' }, { status: 404 });
    }

    return json({ success: true, connection: updated });
  } catch (error: any) {
    console.error('[CalDAV Update Calendars] Error:', error);
    return json(
      {
        error: error.message || 'Failed to update calendar selections',
      },
      { status: 500 }
    );
  }
};
