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

    const { connectionId } = await request.json();

    if (!connectionId) {
      return json({ error: 'Connection ID required' }, { status: 400 });
    }

    // Delete connection (must belong to current user) using direct database connection
    await locals.db
      .delete(caldavConnections)
      .where(
        and(
          eq(caldavConnections.id, connectionId),
          eq(caldavConnections.userId, session.user.id)
        )
      );

    return json({ success: true });
  } catch (error: any) {
    console.error('[CalDAV Delete Connection] Error:', error);
    return json(
      { error: error.message || 'Failed to delete connection' },
      { status: 500 }
    );
  }
};
