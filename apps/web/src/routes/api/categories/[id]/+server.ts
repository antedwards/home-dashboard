/**
 * Category DELETE endpoint
 * Allows users to delete categories they own
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { categories } from '@home-dashboard/database/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth';

export const DELETE: RequestHandler = async (event) => {
  try {
    const { userId } = await requireAuth(event);
    const categoryId = event.params.id;

    if (!categoryId) {
      return json({ error: 'Category ID is required' }, { status: 400 });
    }

    const db = event.locals.db;

    if (!db) {
      return json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Verify user owns the category
    const existingCategory = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, categoryId),
          eq(categories.ownerId, userId)
        )
      )
      .limit(1);

    if (existingCategory.length === 0) {
      return json({ error: 'Category not found or access denied' }, { status: 404 });
    }

    // Delete the category (events will have category_id set to null via ON DELETE SET NULL)
    await db
      .delete(categories)
      .where(eq(categories.id, categoryId));

    return json({ success: true });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return json({ error: error.message || 'Failed to delete category' }, { status: 500 });
  }
};
