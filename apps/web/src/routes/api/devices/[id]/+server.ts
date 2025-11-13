/**
 * Individual device management API
 * Revoke or extend a specific device token
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDbClient } from '@home-dashboard/database/db/client';
import { deviceTokens, familyMembers } from '@home-dashboard/database/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth';
import { DATABASE_URL } from '$env/static/private';

export const DELETE: RequestHandler = async (event) => {
  try {
    const { userId, familyId } = await requireAuth(event);
    const tokenId = event.params.id;
    const db = createDbClient(DATABASE_URL);

    // Verify token belongs to user's family
    const [token] = await db
      .select()
      .from(deviceTokens)
      .innerJoin(familyMembers, eq(deviceTokens.userId, familyMembers.userId))
      .where(
        and(
          eq(deviceTokens.id, tokenId),
          eq(familyMembers.familyId, familyId)
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
    const { userId, familyId } = await requireAuth(event);
    const tokenId = event.params.id;
    const body = await event.request.json();
    const db = createDbClient(DATABASE_URL);

    // Verify token belongs to user's family
    const [token] = await db
      .select()
      .from(deviceTokens)
      .innerJoin(familyMembers, eq(deviceTokens.userId, familyMembers.userId))
      .where(
        and(
          eq(deviceTokens.id, tokenId),
          eq(familyMembers.familyId, familyId)
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
