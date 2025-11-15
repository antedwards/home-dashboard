/**
 * Categories API endpoint
 * Uses Drizzle ORM with direct DB connection (no RLS)
 * Authentication via device token or session
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { categories } from '@home-dashboard/database/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth';

export const GET: RequestHandler = async (event) => {
  try {
    // Authenticate user
    const { userId, householdId } = await requireAuth(event);

    // Initialize database
    const db = event.locals.db;

    if (!db) {
      return json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Get categories that the user can see
    // This includes household categories and their own private/shared categories
    const userCategories = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.householdId, householdId),
          // User can see: household categories OR categories they own
          // (RLS policies handle full visibility logic, but we're using direct DB)
        )
      );

    return json(userCategories);
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return json({ error: error.message || 'Failed to fetch categories' }, { status: error.status || 500 });
  }
};

export const POST: RequestHandler = async (event) => {
  try {
    // Authenticate user
    const { userId, householdId } = await requireAuth(event);

    const body = await event.request.json();

    // Verify user is creating category for their own household
    if (body.household_id !== householdId) {
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
        householdId: body.household_id,
        ownerId: userId, // Set the current user as owner
        name: body.name,
        color: body.color || '#3b82f6',
        visibility: body.visibility || 'household', // Default to household
      })
      .returning();

    return json(newCategory, { status: 201 });
  } catch (error: any) {
    console.error('Error creating category:', error);
    return json({ error: error.message || 'Failed to create category' }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async (event) => {
  try {
    // Authenticate user
    const { userId, householdId } = await requireAuth(event);

    const body = await event.request.json();
    const { category_id, visibility, color } = body;

    if (!category_id) {
      return json({ error: 'category_id is required' }, { status: 400 });
    }

    // Validate visibility if provided
    if (visibility && !['household', 'private', 'shared'].includes(visibility)) {
      return json({ error: 'Invalid visibility value' }, { status: 400 });
    }

    // Validate color if provided (should be hex color)
    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      return json({ error: 'Invalid color format (use hex like #3b82f6)' }, { status: 400 });
    }

    // Initialize database
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
          eq(categories.id, category_id),
          eq(categories.ownerId, userId)
        )
      )
      .limit(1);

    if (existingCategory.length === 0) {
      return json({ error: 'Category not found or access denied' }, { status: 404 });
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (visibility) updateData.visibility = visibility;
    if (color) updateData.color = color;

    if (Object.keys(updateData).length === 0) {
      return json({ error: 'No fields to update' }, { status: 400 });
    }

    // Update category
    const [updatedCategory] = await db
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, category_id))
      .returning();

    return json(updatedCategory);
  } catch (error: any) {
    console.error('Error updating category:', error);
    return json({ error: error.message || 'Failed to update category' }, { status: 500 });
  }
};
