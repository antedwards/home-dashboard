/**
 * Event API endpoint - individual event operations
 * Uses Drizzle ORM with direct DB connection (no RLS)
 * Authentication via device token or session
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { events, eventAttendees, users } from '@home-dashboard/database/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth';
import { pushEventToCalDAVIfNeeded, deleteEventFromCalDAVIfNeeded } from '$lib/server/caldav-push';

export const GET: RequestHandler = async (event) => {
  try {
    // Authenticate user
    const { userId, householdId } = await requireAuth(event);
    const eventId = event.params.id;

    const db = event.locals.db;

  if (!db) {
    return json({ error: 'Database connection not available' }, { status: 500 });
  }

    // Query single event
    const [eventResult] = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.id, eventId),
          eq(events.householdId, householdId)
        )
      )
      .limit(1);

    if (!eventResult) {
      return json({ error: 'Event not found' }, { status: 404 });
    }

    // Get attendees for this event
    const attendeesData = await db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatarUrl,
        color: users.color,
      })
      .from(eventAttendees)
      .innerJoin(users, eq(eventAttendees.userId, users.id))
      .where(eq(eventAttendees.eventId, eventId));

    const result = {
      ...eventResult,
      attendees: attendeesData.map(a => ({
        id: a.userId,
        name: a.name,
        email: a.email,
        avatar: a.avatar,
        color: a.color,
      })),
    };

    return json(result);
  } catch (error: any) {
    console.error('Error fetching event:', error);
    return json({ error: error.message || 'Failed to fetch event' }, { status: error.status || 500 });
  }
};

export const PUT: RequestHandler = async (event) => {
  try {
    // Authenticate user
    const { userId, householdId } = await requireAuth(event);
    const eventId = event.params.id;
    const body = await event.request.json();

    const db = event.locals.db;

  if (!db) {
    return json({ error: 'Database connection not available' }, { status: 500 });
  }

    // Verify event belongs to user's household
    const [existing] = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.id, eventId),
          eq(events.householdId, householdId)
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

    // Get updated attendees
    const attendeesData = await db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatarUrl,
        color: users.color,
      })
      .from(eventAttendees)
      .innerJoin(users, eq(eventAttendees.userId, users.id))
      .where(eq(eventAttendees.eventId, eventId));

    const result = {
      ...updated,
      attendees: attendeesData.map(a => ({
        id: a.userId,
        name: a.name,
        email: a.email,
        avatar: a.avatar,
        color: a.color,
      })),
    };

    // Push to CalDAV if category is synced (don't await - do it in background)
    pushEventToCalDAVIfNeeded(db, updated).catch(err => {
      console.error('Background CalDAV push failed:', err);
    });

    return json(result);
  } catch (error: any) {
    console.error('Error updating event:', error);
    return json({ error: error.message || 'Failed to update event' }, { status: error.status || 500 });
  }
};

export const DELETE: RequestHandler = async (event) => {
  try {
    // Authenticate user
    const { userId, householdId } = await requireAuth(event);
    const eventId = event.params.id;

    const db = event.locals.db;

  if (!db) {
    return json({ error: 'Database connection not available' }, { status: 500 });
  }

    // Verify event belongs to user's household
    const [existing] = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.id, eventId),
          eq(events.householdId, householdId)
        )
      )
      .limit(1);

    if (!existing) {
      return json({ error: 'Event not found' }, { status: 404 });
    }

    // Delete from CalDAV first (if synced)
    await deleteEventFromCalDAVIfNeeded(db, existing);

    // Delete event from database
    await db
      .delete(events)
      .where(eq(events.id, eventId));

    return json({ success: true });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    return json({ error: error.message || 'Failed to delete event' }, { status: error.status || 500 });
  }
};
