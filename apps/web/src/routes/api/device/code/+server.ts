/**
 * Device Code API endpoint
 * Step 1 of OAuth device flow - creates device code for pairing
 * Public endpoint (no auth required)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDbClient } from '@home-dashboard/database/db/client';
import { deviceCodes } from '@home-dashboard/database/db/schema';
import { eq, gt } from 'drizzle-orm';
import { DATABASE_URL } from '$env/static/private';

// Word list for generating memorable 2-word codes
const WORD_LIST = [
  'apple', 'banana', 'cherry', 'dragon', 'eagle', 'falcon', 'galaxy', 'honey',
  'island', 'jungle', 'knight', 'lemon', 'mountain', 'noble', 'ocean', 'panda',
  'queen', 'river', 'sunset', 'tiger', 'unicorn', 'victory', 'wizard', 'yellow',
  'zebra', 'anchor', 'breeze', 'castle', 'diamond', 'echo', 'forest', 'garden',
  'harbor', 'ivory', 'jazz', 'karma', 'lotus', 'mystic', 'nebula', 'oasis',
  'phoenix', 'quantum', 'rainbow', 'storm', 'thunder', 'unity', 'velvet', 'winter'
];

function generateUserCode(): string {
  const word1 = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
  const word2 = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
  return `${word1}-${word2}`;
}

function generateDeviceCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const { device_id, device_name } = await request.json();

    if (!device_id) {
      return json({ error: 'device_id is required' }, { status: 400 });
    }

    const db = createDbClient(DATABASE_URL);
    const deviceCode = generateDeviceCode();
    let userCode = generateUserCode();

    // Ensure user code is unique
    let attempts = 0;
    while (attempts < 10) {
      const [existing] = await db
        .select()
        .from(deviceCodes)
        .where(
          eq(deviceCodes.userCode, userCode)
        )
        .limit(1);

      if (!existing || new Date(existing.expiresAt) < new Date()) {
        break;
      }
      userCode = generateUserCode();
      attempts++;
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const baseUrl = url.origin;

    await db.insert(deviceCodes).values({
      deviceCode,
      userCode,
      deviceId: device_id,
      deviceName: device_name || 'Electron Device',
      expiresAt,
    });

    return json({
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: `${baseUrl}/activate`,
      verification_uri_complete: `${baseUrl}/activate?code=${userCode}`,
      expires_in: 900, // 15 minutes
      interval: 5, // Poll every 5 seconds
    });
  } catch (error: any) {
    console.error('Error creating device code:', error);
    return json({ error: error.message || 'Failed to create device code' }, { status: 500 });
  }
};
