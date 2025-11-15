import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { caldavConnections, categories, householdMembers, events } from '@home-dashboard/database/db/schema';
import { desc, eq, and, isNotNull } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.getSession();

  if (!session) {
    throw error(401, 'Unauthorized');
  }

  if (!locals.db) {
    console.error('Database connection not available');
    throw error(500, 'Database connection not available');
  }

  try {
    // Get user's household
    const userHousehold = await locals.db
      .select({ householdId: householdMembers.householdId })
      .from(householdMembers)
      .where(eq(householdMembers.userId, session.user.id))
      .limit(1);

    const householdId = userHousehold[0]?.householdId;

    // Use direct database connection (Drizzle) instead of Supabase client
    const rawConnections = await locals.db
      .select()
      .from(caldavConnections)
      .where(eq(caldavConnections.userId, session.user.id))
      .orderBy(desc(caldavConnections.createdAt));

    // Convert camelCase to snake_case for frontend compatibility
    const connections = rawConnections.map(conn => ({
      id: conn.id,
      email: conn.email,
      display_name: conn.displayName,
      server_url: conn.serverUrl,
      enabled: conn.enabled ?? true,
      last_sync_at: conn.lastSyncAt?.toISOString() ?? null,
      last_sync_status: conn.lastSyncStatus,
      last_sync_error: conn.lastSyncError,
      selected_calendars: conn.selectedCalendars || [],
      sync_past_days: conn.syncPastDays || '30',
      sync_future_days: conn.syncFutureDays || '365',
    }));

    // Load categories for the household
    const rawCategories = householdId ? await locals.db
      .select()
      .from(categories)
      .where(eq(categories.householdId, householdId))
      : [];

    const userCategories = rawCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      color: cat.color,
      visibility: cat.visibility,
      owner_id: cat.ownerId,
      is_owner: cat.ownerId === session.user.id,
    }));

    // Load events that failed to push to CalDAV
    const failedEvents = householdId ? await locals.db
      .select({
        id: events.id,
        title: events.title,
        startTime: events.startTime,
        endTime: events.endTime,
        categoryId: events.categoryId,
        lastPushAt: events.lastPushAt,
        lastPushError: events.lastPushError,
      })
      .from(events)
      .where(
        and(
          eq(events.householdId, householdId),
          eq(events.lastPushStatus, 'error'),
          isNotNull(events.categoryId) // Only events with categories (synced calendars)
        )
      )
      .orderBy(desc(events.lastPushAt))
      .limit(50) // Limit to 50 most recent failures
      : [];

    return {
      connections: connections || [],
      categories: userCategories || [],
      failedEvents: failedEvents.map(evt => ({
        id: evt.id,
        title: evt.title,
        start_time: evt.startTime?.toISOString() ?? null,
        end_time: evt.endTime?.toISOString() ?? null,
        category_id: evt.categoryId,
        last_push_at: evt.lastPushAt?.toISOString() ?? null,
        last_push_error: evt.lastPushError,
        category_name: rawCategories.find(cat => cat.id === evt.categoryId)?.name ?? 'Unknown',
      }))
    };
  } catch (err) {
    console.error('Failed to load caldav connections:', err);
    throw error(500, 'Failed to load calendar connections');
  }
};
