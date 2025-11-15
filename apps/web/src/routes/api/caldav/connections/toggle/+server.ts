import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { caldavConnections } from '@home-dashboard/database/db/schema';
import { eq, and } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.getSession();
    if (!session) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!locals.db) {
      return json({ error: 'Database connection not available' }, { status: 500 });
    }

    const { connectionId, enabled } = await request.json();

    if (!connectionId || typeof enabled !== 'boolean') {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use direct database connection
    await locals.db
      .update(caldavConnections)
      .set({ enabled, updatedAt: new Date() })
      .where(
        and(
          eq(caldavConnections.id, connectionId),
          eq(caldavConnections.userId, session.user.id)
        )
      );

    return json({ success: true });
  } catch (error: any) {
    console.error('[CalDAV Toggle] Error:', error);
    return json(
      { error: error.message || 'Failed to toggle connection' },
      { status: 500 }
    );
  }
};
