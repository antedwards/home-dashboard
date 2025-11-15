/**
 * Individual device management API
 * Revoke or extend a specific device token
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deviceTokens, householdMembers } from '@home-dashboard/database/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth';

export const DELETE: RequestHandler = async (event) => {
  try {
    const { userId, householdId } = await requireAuth(event);
    const tokenId = event.params.id;
    const db = event.locals.db;

  if (!db) {
    return json({ error: 'Database connection not available' }, { status: 500 });
  }

    // Verify token belongs to user's household
    const [token] = await db
      .select()
      .from(deviceTokens)
      .innerJoin(householdMembers, eq(deviceTokens.userId, householdMembers.userId))
      .where(
        and(
          eq(deviceTokens.id, tokenId),
          eq(householdMembers.householdId, householdId)
        )
      )
      .limit(1);

    if (!token) {
      return json({ error: 'Device not found' }, { status: 404 });
    }

    // Delete the token
    await db.delete(deviceTokens).where(eq(deviceTokens.id, tokenId));

    return json({ success: true });
  } catch (error: any) {
    console.error('Error revoking device:', error);
    return json({ error: error.message || 'Failed to revoke device' }, { status: error.status || 500 });
  }
};

export const PATCH: RequestHandler = async (event) => {
  try {
    const { userId, householdId } = await requireAuth(event);
    const tokenId = event.params.id;
    const body = await event.request.json();
    const db = event.locals.db;

  if (!db) {
    return json({ error: 'Database connection not available' }, { status: 500 });
  }

    // Verify token belongs to user's household
    const [token] = await db
      .select()
      .from(deviceTokens)
      .innerJoin(householdMembers, eq(deviceTokens.userId, householdMembers.userId))
      .where(
        and(
          eq(deviceTokens.id, tokenId),
          eq(householdMembers.householdId, householdId)
        )
      )
      .limit(1);

    if (!token) {
      return json({ error: 'Device not found' }, { status: 404 });
    }

    // Extend the token expiration
    const extendDays = body.extend_days || 90;
    const newExpiresAt = new Date(Date.now() + extendDays * 24 * 60 * 60 * 1000);
    const newRefreshExpiresAt = new Date(Date.now() + (extendDays + 30) * 24 * 60 * 60 * 1000);

    await db
      .update(deviceTokens)
      .set({
        expiresAt: newExpiresAt,
        refreshExpiresAt: newRefreshExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(deviceTokens.id, tokenId));

    return json({ success: true, expiresAt: newExpiresAt.toISOString() });
  } catch (error: any) {
    console.error('Error extending device token:', error);
    return json({ error: error.message || 'Failed to extend device token' }, { status: error.status || 500 });
  }
};
