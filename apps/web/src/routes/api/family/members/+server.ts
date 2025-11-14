/**
 * Family Members API endpoint
 * Uses Drizzle ORM with direct DB connection (no RLS)
 * Authentication via device token or session
 * Returns members for the authenticated user's family
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { familyMembers, users } from '@home-dashboard/database/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth';

export const GET: RequestHandler = async (event) => {
  try {
    // Authenticate user
    const { userId, familyId } = await requireAuth(event);

    // Initialize database
    const db = event.locals.db;

  if (!db) {
    return json({ error: 'Database connection not available' }, { status: 500 });
  }

    // Query family members with user details (use authenticated user's familyId)
    const members = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatar_url: users.avatarUrl,
        color: users.color,
      })
      .from(familyMembers)
      .innerJoin(users, eq(familyMembers.userId, users.id))
      .where(eq(familyMembers.familyId, familyId));

    return json(members);
  } catch (error: any) {
    console.error('Error fetching family members:', error);
    return json({ error: error.message || 'Failed to fetch family members' }, { status: error.status || 500 });
  }
};
