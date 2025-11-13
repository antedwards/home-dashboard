/**
 * Server-side authentication helpers
 * Validates device tokens and Supabase sessions
 * Matches collector-server pattern exactly
 */

import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { deviceTokens, familyMembers } from '@home-dashboard/database/db/schema';
import { eq, and, gt } from 'drizzle-orm';

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Get authenticated user from request
 * Supports both:
 * - Device tokens (Bearer <device_token>)
 * - Supabase session tokens (from cookies)
 */
export async function getAuthUser(event: RequestEvent): Promise<{
  userId: string;
  familyId: string;
  authType: 'device' | 'session';
}> {
  if (!event.locals.db) {
    throw error(500, 'Database connection not available');
  }

  const db = event.locals.db;

  // Try device token from Authorization header
  const authHeader = event.request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const tokenHash = await hashToken(token);

    const [deviceToken] = await db
      .select()
      .from(deviceTokens)
      .where(
        and(
          eq(deviceTokens.tokenHash, tokenHash),
          gt(deviceTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (deviceToken) {
      // Update last used
      await db
        .update(deviceTokens)
        .set({ lastUsedAt: new Date() })
        .where(eq(deviceTokens.id, deviceToken.id));

      // Use family_id directly from token (no JOIN needed!)
      if (deviceToken.familyId) {
        return {
          userId: deviceToken.userId,
          familyId: deviceToken.familyId,
          authType: 'device',
        };
      }
    }
  }

  // Try Supabase session (for web app)
  // Uses event.locals.getSession() from hooks.server.ts
  try {
    if (!event.locals?.getSession) {
      throw error(401, 'Unauthorized');
    }

    const session = await event.locals.getSession();

    if (session?.user?.id) {
      // Get family from family_members
      const [member] = await db
        .select()
        .from(familyMembers)
        .where(eq(familyMembers.userId, session.user.id))
        .limit(1);

      if (member) {
        return {
          userId: session.user.id,
          familyId: member.familyId,
          authType: 'session',
        };
      }
    }
  } catch (err) {
    console.error('Session auth error:', err);
    throw err;
  }

  throw error(401, 'Unauthorized');
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(event: RequestEvent) {
  return await getAuthUser(event);
}
