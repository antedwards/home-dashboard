/**
 * Events API endpoint
 * Uses Drizzle ORM with direct DB connection (no RLS)
 * Authentication via device token or session
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { events, eventAttendees, users, categories, calendarShares } from '@home-dashboard/database/db/schema';
import { eq, and, gte, lte, inArray, or, isNull } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth';
import { pushEventToCalDAVIfNeeded } from '$lib/server/caldav-push';

export const GET: RequestHandler = async (event) => {
  try {
    // Authenticate user (works with device token or session)
    const { userId, householdId, authType } = await requireAuth(event);

    // Get query params
    const url = new URL(event.request.url);
    const startDate = url.searchParams.get('start');
    const endDate = url.searchParams.get('end');

    // Initialize database
    const db = event.locals.db;

  if (!db) {
    return json({ error: 'Database connection not available' }, { status: 500 });
  }

    // Build where conditions for events
    const conditions = [eq(events.householdId, householdId)];

    if (startDate) {
      conditions.push(gte(events.startTime, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(events.endTime, new Date(endDate)));
    }

    // Query events for user's household with category visibility filtering
    // Join with categories to check visibility
    // Devices (Electron, CLI) are household-scoped and only see household events
    // Sessions (web app) are user-scoped and can see private + household events
    const isDeviceAuth = authType === 'device';

    // Get calendar shares for this user
    const userShares = await db
      .select({ categoryId: calendarShares.categoryId })
      .from(calendarShares)
      .where(
        or(
          eq(calendarShares.sharedWithUserId, userId),
          eq(calendarShares.sharedWithHouseholdId, householdId)
        )
      );

    const sharedCategoryIds = userShares.map(s => s.categoryId);

    const visibilityConditions = isDeviceAuth
      ? [
          // Devices only see:
          // 1. Events without a category
          isNull(events.categoryId),
          // 2. Household-visible categories
          eq(categories.visibility, 'household'),
        ]
      : [
          // Sessions see:
          // 1. Events without a category
          isNull(events.categoryId),
          // 2. Household-visible categories
          eq(categories.visibility, 'household'),
          // 3. Private categories owned by current user
          and(
            eq(categories.visibility, 'private'),
            eq(categories.ownerId, userId)
          ),
          // 4. Shared categories where user/household has access
          ...(sharedCategoryIds.length > 0
            ? [and(
                eq(categories.visibility, 'shared'),
                inArray(categories.id, sharedCategoryIds)
              )]
            : []
          )
        ];

    const eventsResult = await db
      .select({
        event: events,
        categoryVisibility: categories.visibility,
        categoryOwnerId: categories.ownerId,
        categoryColor: categories.color,
      })
      .from(events)
      .leftJoin(categories, eq(events.categoryId, categories.id))
      .where(
        and(
          ...conditions,
          // Filter based on category visibility
          or(...visibilityConditions)
        )
      );

    // Extract event data with category color
    const filteredEvents = eventsResult.map(row => ({
      ...row.event,
      color: row.categoryColor, // Add category color to event
    }));

    // Get attendees for all events
    const eventIds = filteredEvents.map(e => e.id);
    const attendeesData = eventIds.length > 0 ? await db
      .select({
        eventId: eventAttendees.eventId,
        userId: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatarUrl,
        color: users.color,
      })
      .from(eventAttendees)
      .innerJoin(users, eq(eventAttendees.userId, users.id))
      .where(inArray(eventAttendees.eventId, eventIds))
      : [];

    // Group attendees by event
    const attendeesByEvent = new Map<string, any[]>();
    for (const attendee of attendeesData) {
      if (!attendeesByEvent.has(attendee.eventId)) {
        attendeesByEvent.set(attendee.eventId, []);
      }
      attendeesByEvent.get(attendee.eventId)!.push({
        id: attendee.userId,
        name: attendee.name,
        email: attendee.email,
        avatar: attendee.avatar,
        color: attendee.color,
      });
    }

    // Add attendees to events
    const result = filteredEvents.map(event => ({
      ...event,
      attendees: attendeesByEvent.get(event.id) || [],
      external_attendees: event.externalAttendees || [],
    }));

    return json(result);
  } catch (error: any) {
    console.error('Error fetching events:', error);
    return json({ error: error.message || 'Failed to fetch events' }, { status: error.status || 500 });
  }
};

export const POST: RequestHandler = async (event) => {
  try {
    // Authenticate user
    const { userId, householdId } = await requireAuth(event);

    const body = await event.request.json();

    // Initialize database
    const db = event.locals.db;

  if (!db) {
    return json({ error: 'Database connection not available' }, { status: 500 });
  }

    // Insert event
    const [newEvent] = await db
      .insert(events)
      .values({
        householdId,
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
      await db.insert(eventAttendees).values(
        body.attendee_ids.map((userId: string) => ({
          eventId: newEvent.id,
          userId,
        }))
      );
    }

    // Get attendees for the new event
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
      .where(eq(eventAttendees.eventId, newEvent.id));

    const result = {
      ...newEvent,
      attendees: attendeesData.map(a => ({
        id: a.userId,
        name: a.name,
        email: a.email,
        avatar: a.avatar,
        color: a.color,
      })),
    };

    // Push to CalDAV if category is synced (don't await - do it in background)
    pushEventToCalDAVIfNeeded(db, newEvent).catch(err => {
      console.error('Background CalDAV push failed:', err);
    });

    return json(result, { status: 201 });
  } catch (error: any) {
    console.error('Error creating event:', error);
    return json({ error: error.message || 'Failed to create event' }, { status: 500 });
  }
};
