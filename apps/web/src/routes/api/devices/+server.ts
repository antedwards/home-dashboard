/**
 * Device management API
 * List, revoke, and extend device tokens
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deviceTokens, familyMembers } from '@home-dashboard/database/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth';

export const GET: RequestHandler = async (event) => {
  try {
    const { userId, familyId } = await requireAuth(event);
    const db = event.locals.db;

  if (!db) {
    return json({ error: 'Database connection not available' }, { status: 500 });
  }

    // Get all device tokens for the user's family
    const tokens = await db
      .select()
      .from(deviceTokens)
      .innerJoin(familyMembers, eq(deviceTokens.userId, familyMembers.userId))
      .where(eq(familyMembers.familyId, familyId));

    return json(tokens.map(t => t.device_tokens));
  } catch (error: any) {
    console.error('Error fetching devices:', error);
    return json({ error: error.message || 'Failed to fetch devices' }, { status: error.status || 500 });
  }
};
