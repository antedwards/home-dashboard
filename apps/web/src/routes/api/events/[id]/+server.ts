/**
 * Event API endpoint - individual event operations
 * Uses Drizzle ORM with direct DB connection (no RLS)
 * Authentication via device token or session
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDbClient } from '@home-dashboard/database/db/client';
import { events } from '@home-dashboard/database/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth';
import { DATABASE_URL } from '$env/static/private';

export const GET: RequestHandler = async (event) => {
  try {
    // Authenticate user
    const { userId, familyId } = await requireAuth(event);
    const eventId = event.params.id;

    const db = createDbClient(DATABASE_URL);

    // Query single event
    const [result] = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.id, eventId),
          eq(events.familyId, familyId)
        )
      )
      .limit(1);

    if (!result) {
      return json({ error: 'Event not found' }, { status: 404 });
    }

    return json(result);
  } catch (error: any) {
    console.error('Error fetching event:', error);
    return json({ error: error.message || 'Failed to fetch event' }, { status: error.status || 500 });
  }
};

export const PUT: RequestHandler = async (event) => {
  try {
    // Authenticate user
    const { userId, familyId } = await requireAuth(event);
    const eventId = event.params.id;
    const body = await event.request.json();

    const db = createDbClient(DATABASE_URL);

    // Verify event belongs to user's family
    const [existing] = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.id, eventId),
          eq(events.familyId, familyId)
        )
      )
      .limit(1);

    if (!existing) {
      return json({ error: 'Event not found' }, { status: 404 });
    }

    // Update event
    const [updated] = await db
      .update(events)
      .set({
        title: body.title,
        description: body.description,
        startTime: body.start_time ? new Date(body.start_time) : undefined,
        endTime: body.end_time ? new Date(body.end_time) : undefined,
        allDay: body.all_day,
        location: body.location,
        categoryId: body.category_id,
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId))
      .returning();

    // Update event attendees if provided
    if (body.attendee_ids !== undefined) {
      const { eventAttendees } = await import('@home-dashboard/database/db/schema');

      // Delete existing attendees
      await db.delete(eventAttendees).where(eq(eventAttendees.eventId, eventId));

      // Insert new attendees if any
      if (Array.isArray(body.attendee_ids) && body.attendee_ids.length > 0) {
        await db.insert(eventAttendees).values(
          body.attendee_ids.map((userId: string) => ({
            eventId,
            userId,
          }))
        );
      }
    }

    return json(updated);
  } catch (error: any) {
    console.error('Error updating event:', error);
    return json({ error: error.message || 'Failed to update event' }, { status: error.status || 500 });
  }
};

export const DELETE: RequestHandler = async (event) => {
  try {
    // Authenticate user
    const { userId, familyId } = await requireAuth(event);
    const eventId = event.params.id;

    const db = createDbClient(DATABASE_URL);

    // Verify event belongs to user's family
    const [existing] = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.id, eventId),
          eq(events.familyId, familyId)
        )
      )
      .limit(1);

    if (!existing) {
      return json({ error: 'Event not found' }, { status: 404 });
    }

    // Delete event
    await db
      .delete(events)
      .where(eq(events.id, eventId));

    return json({ success: true });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    return json({ error: error.message || 'Failed to delete event' }, { status: error.status || 500 });
  }
};
