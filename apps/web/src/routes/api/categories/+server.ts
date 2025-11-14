/**
 * Categories API endpoint
 * Uses Drizzle ORM with direct DB connection (no RLS)
 * Authentication via device token or session
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { categories } from '@home-dashboard/database/db/schema';
import { requireAuth } from '$lib/server/auth';

export const POST: RequestHandler = async (event) => {
  try {
    // Authenticate user
    const { userId, familyId } = await requireAuth(event);

    const body = await event.request.json();

    // Verify user is creating category for their own family
    if (body.family_id !== familyId) {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    // Initialize database
    const db = event.locals.db;

  if (!db) {
    return json({ error: 'Database connection not available' }, { status: 500 });
  }

    // Insert category
    const [newCategory] = await db
      .insert(categories)
      .values({
        familyId: body.family_id,
        name: body.name,
        color: body.color || '#3b82f6',
      })
      .returning();

    return json(newCategory, { status: 201 });
  } catch (error: any) {
    console.error('Error creating category:', error);
    return json({ error: error.message || 'Failed to create category' }, { status: 500 });
  }
};
