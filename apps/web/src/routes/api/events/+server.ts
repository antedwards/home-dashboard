/**
 * Events API endpoint
 * Uses Drizzle ORM with direct DB connection (no RLS)
 * Authentication via device token or session
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDbClient } from '@home-dashboard/database/db/client';
import { events } from '@home-dashboard/database/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth';
import { DATABASE_URL } from '$env/static/private';

export const GET: RequestHandler = async (event) => {
  try {
    // Authenticate user (works with device token or session)
    const { userId, familyId } = await requireAuth(event);

    // Get query params
    const url = new URL(event.request.url);
    const startDate = url.searchParams.get('start');
    const endDate = url.searchParams.get('end');

    // Initialize database
    const db = createDbClient(DATABASE_URL);

    // Query events for user's family (no RLS needed!)
    let query = db
      .select()
      .from(events)
      .where(eq(events.familyId, familyId));

    // Add date filters if provided
    if (startDate) {
      query = query.where(and(
        eq(events.familyId, familyId),
        gte(events.startTime, new Date(startDate))
      ));
    }
    if (endDate) {
      query = query.where(and(
        eq(events.familyId, familyId),
        lte(events.endTime, new Date(endDate))
      ));
    }

    const result = await query;

    return json(result);
  } catch (error: any) {
    console.error('Error fetching events:', error);
    return json({ error: error.message || 'Failed to fetch events' }, { status: error.status || 500 });
  }
};

export const POST: RequestHandler = async (event) => {
  try {
    // Authenticate user
    const { userId, familyId } = await requireAuth(event);

    const body = await event.request.json();

    // Initialize database
    const db = createDbClient(DATABASE_URL);

    // Insert event
    const [newEvent] = await db
      .insert(events)
      .values({
        familyId,
        userId,
        title: body.title,
        description: body.description,
        startTime: new Date(body.start_time),
        endTime: new Date(body.end_time),
        allDay: body.all_day || false,
        location: body.location,
        categoryId: body.category_id,
      })
      .returning();

    // Handle event attendees if provided
    if (body.attendee_ids && Array.isArray(body.attendee_ids) && body.attendee_ids.length > 0) {
      const { eventAttendees } = await import('@home-dashboard/database/db/schema');
      await db.insert(eventAttendees).values(
        body.attendee_ids.map((userId: string) => ({
          eventId: newEvent.id,
          userId,
        }))
      );
    }

    return json(newEvent, { status: 201 });
  } catch (error: any) {
    console.error('Error creating event:', error);
    return json({ error: error.message || 'Failed to create event' }, { status: 500 });
  }
};
