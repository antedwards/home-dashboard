/**
 * Device Activate API endpoint
 * Step 2 of OAuth device flow - user activates device code
 * Requires authentication via session token
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDbClient } from '@home-dashboard/database/db/client';
import { deviceCodes, deviceTokens, familyMembers } from '@home-dashboard/database/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth';
import { DATABASE_URL } from '$env/static/private';

async function sha256Hash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export const POST: RequestHandler = async (event) => {
  try {
    const { user_code } = await event.request.json();

    if (!user_code) {
      return json({ error: 'user_code is required' }, { status: 400 });
    }

    // Authenticate user (must be logged in via session)
    const { userId, familyId } = await requireAuth(event);

    const db = createDbClient(DATABASE_URL);

    // Find the device code
    const [deviceCodeData] = await db
      .select()
      .from(deviceCodes)
      .where(
        and(
          eq(deviceCodes.userCode, user_code),
          eq(deviceCodes.activated, false),
          gt(deviceCodes.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!deviceCodeData) {
      return json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    // Generate access and refresh tokens
    const accessTokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const accessToken = arrayBufferToBase64Url(accessTokenBytes);
    const accessTokenHash = await sha256Hash(accessToken);

    const refreshTokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const refreshToken = arrayBufferToBase64Url(refreshTokenBytes);
    const refreshTokenHash = await sha256Hash(refreshToken);

    // Delete any existing device token for this device
    await db
      .delete(deviceTokens)
      .where(
        and(
          eq(deviceTokens.userId, userId),
          eq(deviceTokens.deviceId, deviceCodeData.deviceId)
        )
      );

    // Create device token with family_id for the wall-mounted family screen
    await db.insert(deviceTokens).values({
      userId,
      deviceId: deviceCodeData.deviceId,
      deviceName: deviceCodeData.deviceName || 'Electron Device',
      deviceType: 'electron',
      familyId,
      tokenHash: accessTokenHash,
      refreshTokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      refreshExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    });

    // Update device code with activation info and tokens
    await db
      .update(deviceCodes)
      .set({
        activated: true,
        userId,
        activatedAt: new Date(),
        accessToken, // Store plain token temporarily for polling
        refreshToken,
      })
      .where(eq(deviceCodes.id, deviceCodeData.id));

    return json({ success: true });
  } catch (error: any) {
    console.error('Error activating device code:', error);
    return json({ error: error.message || 'Failed to activate device code' }, { status: error.status || 500 });
  }
};
