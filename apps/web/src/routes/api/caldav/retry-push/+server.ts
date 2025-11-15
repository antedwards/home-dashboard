/**
 * Retry pushing failed events to CalDAV
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { events, householdMembers } from '@home-dashboard/database/db/schema';
import { eq, and } from 'drizzle-orm';
import { pushEventToCalDAVIfNeeded } from '$lib/server/caldav-push';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.getSession();
    if (!session) {
      return json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!locals.db) {
      return json({ error: 'Database connection not available' }, { status: 500 });
    }

    const db = locals.db;
    const { eventId, retryAll } = await request.json();

    // Get user's household
    const userHousehold = await db
      .select({ householdId: householdMembers.householdId })
      .from(householdMembers)
      .where(eq(householdMembers.userId, session.user.id))
      .limit(1);

    const householdId = userHousehold[0]?.householdId;
    if (!householdId) {
      return json({ error: 'No household found' }, { status: 404 });
    }

    if (retryAll) {
      // Retry all failed events for this household
      const failedEvents = await db
        .select()
        .from(events)
        .where(
          and(
            eq(events.householdId, householdId),
            eq(events.lastPushStatus, 'error')
          )
        );

      console.log(`[CalDAV Retry] Retrying ${failedEvents.length} failed events`);

      let successCount = 0;
      let errorCount = 0;

      for (const event of failedEvents) {
        try {
          await pushEventToCalDAVIfNeeded(db, event);
          successCount++;
        } catch (err) {
          console.error(`[CalDAV Retry] Failed to push event ${event.id}:`, err);
          errorCount++;
        }
      }

      return json({
        success: true,
        message: `Retried ${failedEvents.length} events: ${successCount} succeeded, ${errorCount} failed`,
        successCount,
        errorCount,
      });
    } else if (eventId) {
      // Retry a specific event
      const eventToRetry = await db
        .select()
        .from(events)
        .where(
          and(
            eq(events.id, eventId),
            eq(events.householdId, householdId)
          )
        )
        .limit(1);

      if (!eventToRetry[0]) {
        return json({ error: 'Event not found' }, { status: 404 });
      }

      console.log(`[CalDAV Retry] Retrying event ${eventId}`);

      await pushEventToCalDAVIfNeeded(db, eventToRetry[0]);

      return json({
        success: true,
        message: 'Event push retried successfully',
      });
    } else {
      return json({ error: 'Either eventId or retryAll must be provided' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[CalDAV Retry] Error:', error);
    return json(
      {
        error: error.message || 'Failed to retry push',
      },
      { status: 500 }
    );
  }
};
