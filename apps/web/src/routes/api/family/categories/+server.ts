/**
 * Family Categories API endpoint
 * Uses Drizzle ORM with direct DB connection (no RLS)
 * Authentication via device token or session
 * Returns categories for the authenticated user's family
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { categories } from '@home-dashboard/database/db/schema';
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

    // Query categories for the user's family
    const familyCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.familyId, familyId));

    return json(familyCategories);
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return json({ error: error.message || 'Failed to fetch categories' }, { status: error.status || 500 });
  }
};
