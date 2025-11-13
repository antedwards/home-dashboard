import type { SupabaseClient } from './client';

// Word list for generating memorable 2-word codes
const WORD_LIST = [
  'apple', 'banana', 'cherry', 'dragon', 'eagle', 'falcon', 'galaxy', 'honey',
  'island', 'jungle', 'knight', 'lemon', 'mountain', 'noble', 'ocean', 'panda',
  'queen', 'river', 'sunset', 'tiger', 'unicorn', 'victory', 'wizard', 'yellow',
  'zebra', 'anchor', 'breeze', 'castle', 'diamond', 'echo', 'forest', 'garden',
  'harbor', 'ivory', 'jazz', 'karma', 'lotus', 'mystic', 'nebula', 'oasis',
  'phoenix', 'quantum', 'rainbow', 'storm', 'thunder', 'unity', 'velvet', 'winter'
];

/**
 * Generate a random 2-word code for device pairing
 * Format: "word1-word2"
 */
function generateUserCode(): string {
  const word1 = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
  const word2 = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
  return `${word1}-${word2}`;
}

/**
 * Generate a secure device code (internal use)
 */
function generateDeviceCode(): string {
  const bytes = getRandomBytes(32);
  return arrayBufferToHex(bytes);
}

function arrayBufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Web Crypto API helpers (works in both browser and Node.js 16+)
function getRandomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  if (typeof globalThis.crypto !== 'undefined') {
    globalThis.crypto.getRandomValues(array);
  } else {
    throw new Error('Web Crypto API not available');
  }
  return array;
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

async function sha256Hash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface DeviceCodeResponse {
  device_code: string; // Internal code for polling
  user_code: string; // Human-friendly code to show user
  verification_uri: string; // URL to visit
  verification_uri_complete: string; // URL with code pre-filled
  expires_in: number; // Seconds until expiration
  interval: number; // Polling interval in seconds
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: string;
  family_id: string;
}

/**
 * Step 1: Request a device code (called by Electron app)
 */
export async function requestDeviceCode(
  client: SupabaseClient,
  deviceId: string,
  deviceName: string,
  baseUrl: string
): Promise<DeviceCodeResponse> {
  const deviceCode = generateDeviceCode();
  let userCode = generateUserCode();

  // Ensure user code is unique
  let attempts = 0;
  while (attempts < 10) {
    const { data: existing } = await client
      .from('device_codes')
      .select('id')
      .eq('user_code', userCode)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!existing) break;
    userCode = generateUserCode();
    attempts++;
  }

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  const { error } = await client
    .from('device_codes')
    .insert({
      device_code: deviceCode,
      user_code: userCode,
      device_id: deviceId,
      device_name: deviceName,
      expires_at: expiresAt.toISOString(),
    });

  if (error) throw error;

  return {
    device_code: deviceCode,
    user_code: userCode,
    verification_uri: `${baseUrl}/activate`,
    verification_uri_complete: `${baseUrl}/activate?code=${userCode}`,
    expires_in: 900, // 15 minutes
    interval: 5, // Poll every 5 seconds
  };
}

/**
 * Step 2: Activate a device code (called by web app when user activates)
 */
export async function activateDeviceCode(
  client: SupabaseClient,
  userCode: string,
  userId: string
): Promise<void> {
  // Find the device code
  const { data: deviceCodeData, error: findError } = await client
    .from('device_codes')
    .select('*')
    .eq('user_code', userCode)
    .eq('activated', false)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (findError || !deviceCodeData) {
    throw new Error('Invalid or expired code');
  }

  // Get user's family_id (user is authenticated, so RLS allows this)
  const { data: familyMember } = await client
    .from('family_members')
    .select('family_id')
    .eq('user_id', userId)
    .single();

  if (!familyMember) {
    throw new Error('User is not part of a family');
  }

  // Generate access and refresh tokens NOW (while user is authenticated)
  const accessTokenBytes = getRandomBytes(32);
  const accessToken = arrayBufferToBase64Url(accessTokenBytes);
  const accessTokenHash = await sha256Hash(accessToken);

  const refreshTokenBytes = getRandomBytes(32);
  const refreshToken = arrayBufferToBase64Url(refreshTokenBytes);
  const refreshTokenHash = await sha256Hash(refreshToken);

  // Create device token in database (user is authenticated, so RLS allows this)
  const { error: tokenError } = await client
    .from('device_tokens')
    .insert({
      user_id: userId,
      device_id: deviceCodeData.device_id,
      device_name: deviceCodeData.device_name || 'Electron Device',
      device_type: 'electron',
      family_id: familyMember.family_id,
      token_hash: accessTokenHash,
      refresh_token_hash: refreshTokenHash,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      refresh_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
    });

  if (tokenError) {
    // If duplicate, delete the old one and try again
    if (tokenError.code === '23505') {
      await client
        .from('device_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('device_id', deviceCodeData.device_id);

      // Retry insert
      const { error: retryError } = await client
        .from('device_tokens')
        .insert({
          user_id: userId,
          device_id: deviceCodeData.device_id,
          device_name: deviceCodeData.device_name || 'Electron Device',
          device_type: 'electron',
          family_id: familyMember.family_id,
          token_hash: accessTokenHash,
          refresh_token_hash: refreshTokenHash,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          refresh_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (retryError) throw retryError;
    } else {
      throw tokenError;
    }
  }

  // Store the tokens in the device code so polling can retrieve them
  const { error: updateError } = await client
    .from('device_codes')
    .update({
      activated: true,
      user_id: userId,
      activated_at: new Date().toISOString(),
      access_token: accessToken, // Store plain token temporarily
      refresh_token: refreshToken,
    })
    .eq('id', deviceCodeData.id);

  if (updateError) throw updateError;
}

/**
 * Step 3: Poll for device token (called by Electron app)
 * Returns token once user has activated the code
 */
export async function pollDeviceToken(
  client: SupabaseClient,
  deviceCode: string
): Promise<TokenResponse | { error: string }> {
  // Find the device code
  const { data: deviceCodeData, error: findError } = await client
    .from('device_codes')
    .select('*')
    .eq('device_code', deviceCode)
    .single();

  if (findError || !deviceCodeData) {
    return { error: 'invalid_request' };
  }

  // Check if expired
  if (new Date(deviceCodeData.expires_at) < new Date()) {
    return { error: 'expired_token' };
  }

  // Check if activated
  if (!deviceCodeData.activated || !deviceCodeData.user_id) {
    return { error: 'authorization_pending' };
  }

  // Tokens were already created during activation, just return them
  if (!deviceCodeData.access_token || !deviceCodeData.refresh_token) {
    return { error: 'invalid_request' };
  }

  // Delete the device code (one-time use)
  await client
    .from('device_codes')
    .delete()
    .eq('id', deviceCodeData.id);

  return {
    access_token: deviceCodeData.access_token,
    refresh_token: deviceCodeData.refresh_token,
    expires_in: 30 * 24 * 60 * 60, // 30 days in seconds
    user_id: deviceCodeData.user_id,
  };
}

/**
 * Verify an access token
 */
export async function verifyAccessToken(
  client: SupabaseClient,
  accessToken: string,
  deviceId: string
): Promise<{ valid: boolean; userId?: string; familyId?: string }> {
  const tokenHash = await sha256Hash(accessToken);

  const { data: deviceToken, error } = await client
    .from('device_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .eq('device_id', deviceId)
    .single();

  if (error || !deviceToken) {
    return { valid: false };
  }

  // Check if expired
  if (new Date(deviceToken.expires_at) < new Date()) {
    return { valid: false };
  }

  // Update last used
  await client
    .from('device_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', deviceToken.id);

  return {
    valid: true,
    userId: deviceToken.user_id,
    familyId: deviceToken.family_id,
  };
}

/**
 * Refresh an access token
 */
export async function refreshAccessToken(
  client: SupabaseClient,
  refreshToken: string,
  deviceId: string
): Promise<TokenResponse | { error: string }> {
  const refreshTokenHash = await sha256Hash(refreshToken);

  const { data: deviceToken, error } = await client
    .from('device_tokens')
    .select('*')
    .eq('refresh_token_hash', refreshTokenHash)
    .eq('device_id', deviceId)
    .single();

  if (error || !deviceToken) {
    return { error: 'invalid_grant' };
  }

  // Check if refresh token expired
  if (new Date(deviceToken.refresh_expires_at) < new Date()) {
    return { error: 'expired_token' };
  }

  // Generate new access and refresh tokens
  const newAccessTokenBytes = getRandomBytes(32);
  const newAccessToken = arrayBufferToBase64Url(newAccessTokenBytes);
  const newAccessTokenHash = await sha256Hash(newAccessToken);

  const newRefreshTokenBytes = getRandomBytes(32);
  const newRefreshToken = arrayBufferToBase64Url(newRefreshTokenBytes);
  const newRefreshTokenHash = await sha256Hash(newRefreshToken);

  // Update device token
  const { error: updateError } = await client
    .from('device_tokens')
    .update({
      token_hash: newAccessTokenHash,
      refresh_token_hash: newRefreshTokenHash,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      refresh_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      last_refreshed_at: new Date().toISOString(),
    })
    .eq('id', deviceToken.id);

  if (updateError) throw updateError;

  return {
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    expires_in: 30 * 24 * 60 * 60,
    user_id: deviceToken.user_id,
  };
}
