/**
 * Device Token API endpoint
 * Step 3 of OAuth device flow - poll for tokens or refresh
 * Public endpoint (validates device_code or refresh_token)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deviceCodes, deviceTokens, familyMembers } from '@home-dashboard/database/db/schema';
import { eq, and } from 'drizzle-orm';

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

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { grant_type, device_code, refresh_token, device_id } = await request.json();
    const db = event.locals.db;

  if (!db) {
    return json({ error: 'Database connection not available' }, { status: 500 });
  }

    if (grant_type === 'urn:ietf:params:oauth:grant-type:device_code') {
      // Device code flow - polling
      if (!device_code) {
        return json({ error: 'device_code is required' }, { status: 400 });
      }

      // Find the device code
      const [deviceCodeData] = await db
        .select()
        .from(deviceCodes)
        .where(eq(deviceCodes.deviceCode, device_code))
        .limit(1);

      if (!deviceCodeData) {
        return json({ error: 'invalid_request' }, { status: 400 });
      }

      // Check if expired
      if (new Date(deviceCodeData.expiresAt) < new Date()) {
        return json({ error: 'expired_token' }, { status: 400 });
      }

      // Check if activated
      if (!deviceCodeData.activated || !deviceCodeData.userId) {
        return json({ error: 'authorization_pending' }, { status: 400 });
      }

      // Return tokens
      if (!deviceCodeData.accessToken || !deviceCodeData.refreshToken) {
        return json({ error: 'invalid_request' }, { status: 400 });
      }

      // Delete the device code (one-time use)
      await db
        .delete(deviceCodes)
        .where(eq(deviceCodes.id, deviceCodeData.id));

      // Get family_id for the user
      const [member] = await db
        .select()
        .from(familyMembers)
        .where(eq(familyMembers.userId, deviceCodeData.userId))
        .limit(1);

      return json({
        access_token: deviceCodeData.accessToken,
        refresh_token: deviceCodeData.refreshToken,
        expires_in: 30 * 24 * 60 * 60, // 30 days in seconds
        user_id: deviceCodeData.userId,
        family_id: member?.familyId,
      });

    } else if (grant_type === 'refresh_token') {
      // Refresh token flow
      if (!refresh_token || !device_id) {
        return json({ error: 'refresh_token and device_id are required' }, { status: 400 });
      }

      const refreshTokenHash = await sha256Hash(refresh_token);

      const [deviceToken] = await db
        .select()
        .from(deviceTokens)
        .where(
          and(
            eq(deviceTokens.refreshTokenHash, refreshTokenHash),
            eq(deviceTokens.deviceId, device_id)
          )
        )
        .limit(1);

      if (!deviceToken) {
        return json({ error: 'invalid_grant' }, { status: 400 });
      }

      // Check if refresh token expired
      if (deviceToken.refreshExpiresAt && new Date(deviceToken.refreshExpiresAt) < new Date()) {
        return json({ error: 'expired_token' }, { status: 400 });
      }

      // Generate new access and refresh tokens
      const newAccessTokenBytes = crypto.getRandomValues(new Uint8Array(32));
      const newAccessToken = arrayBufferToBase64Url(newAccessTokenBytes);
      const newAccessTokenHash = await sha256Hash(newAccessToken);

      const newRefreshTokenBytes = crypto.getRandomValues(new Uint8Array(32));
      const newRefreshToken = arrayBufferToBase64Url(newRefreshTokenBytes);
      const newRefreshTokenHash = await sha256Hash(newRefreshToken);

      // Update device token
      await db
        .update(deviceTokens)
        .set({
          tokenHash: newAccessTokenHash,
          refreshTokenHash: newRefreshTokenHash,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          refreshExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          lastRefreshedAt: new Date(),
        })
        .where(eq(deviceTokens.id, deviceToken.id));

      // Get family_id for the user
      const [member] = await db
        .select()
        .from(familyMembers)
        .where(eq(familyMembers.userId, deviceToken.userId))
        .limit(1);

      return json({
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_in: 30 * 24 * 60 * 60,
        user_id: deviceToken.userId,
        family_id: member?.familyId,
      });

    } else {
      return json({ error: 'unsupported_grant_type' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error issuing token:', error);
    return json({ error: error.message || 'Failed to issue token' }, { status: 500 });
  }
};
