import type { SupabaseClient } from './client';
import type { DevicePairingCode, DeviceToken } from './types';
import { createHash, randomBytes } from 'crypto';

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
export function generatePairingCode(): string {
  const word1 = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
  const word2 = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
  return `${word1}-${word2}`;
}

/**
 * Create a device pairing code for the authenticated user
 * This code will be displayed in the web app and entered in Electron
 */
export async function createDevicePairingCode(
  client: SupabaseClient,
  expiresInMinutes: number = 10
): Promise<DevicePairingCode> {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Generate unique code
  let code = generatePairingCode();
  let attempts = 0;
  const maxAttempts = 10;

  // Ensure code is unique
  while (attempts < maxAttempts) {
    const { data: existing } = await client
      .from('device_pairing_codes')
      .select('id')
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!existing) break;
    code = generatePairingCode();
    attempts++;
  }

  const { data, error } = await client
    .from('device_pairing_codes')
    .insert({
      code,
      user_id: user.id,
      expires_at: new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as DevicePairingCode;
}

/**
 * Verify a pairing code and create a device token
 * This is called from Electron with the code entered by the user
 */
export async function verifyPairingCodeAndCreateToken(
  client: SupabaseClient,
  code: string,
  deviceId: string,
  deviceName?: string
): Promise<{ token: string; deviceToken: DeviceToken }> {
  // Find valid pairing code
  const { data: pairingCode, error: codeError } = await client
    .from('device_pairing_codes')
    .select('*')
    .eq('code', code)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (codeError || !pairingCode || !pairingCode.user_id) {
    throw new Error('Invalid or expired pairing code');
  }

  // Generate long-lived token (90 days default)
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');

  // Mark pairing code as used
  await client
    .from('device_pairing_codes')
    .update({
      used: true,
      device_id: deviceId,
    })
    .eq('id', pairingCode.id);

  // Create device token
  const { data: deviceToken, error: tokenError } = await client
    .from('device_tokens')
    .insert({
      user_id: pairingCode.user_id,
      device_id: deviceId,
      device_name: deviceName || `Electron Device`,
      device_type: 'electron',
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
    })
    .select()
    .single();

  if (tokenError) throw tokenError;

  return {
    token, // Return plain token to be stored by Electron
    deviceToken: deviceToken as DeviceToken,
  };
}

/**
 * Verify a device token
 * This is called on every Electron app startup
 */
export async function verifyDeviceToken(
  client: SupabaseClient,
  token: string,
  deviceId: string
): Promise<{ valid: boolean; userId?: string; needsRefresh?: boolean }> {
  const tokenHash = createHash('sha256').update(token).digest('hex');

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

  // Update last used timestamp
  await client
    .from('device_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', deviceToken.id);

  // Check if token needs refresh (less than 7 days remaining)
  const daysRemaining =
    (new Date(deviceToken.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24);

  return {
    valid: true,
    userId: deviceToken.user_id,
    needsRefresh: daysRemaining < 7,
  };
}

/**
 * Extend device token expiration
 */
export async function extendDeviceToken(
  client: SupabaseClient,
  tokenId: string,
  extendDays: number = 90
): Promise<Date> {
  const { data, error } = await client.rpc('extend_device_token', {
    token_id: tokenId,
    extend_days: extendDays,
  });

  if (error) throw error;
  return new Date(data);
}

/**
 * Get all device tokens for the current user
 */
export async function getDeviceTokens(client: SupabaseClient): Promise<DeviceToken[]> {
  const { data, error } = await client
    .from('device_tokens')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as DeviceToken[];
}

/**
 * Revoke a device token
 */
export async function revokeDeviceToken(
  client: SupabaseClient,
  tokenId: string
): Promise<void> {
  const { error } = await client.from('device_tokens').delete().eq('id', tokenId);
  if (error) throw error;
}

/**
 * Create an invitation (admin only)
 */
export async function createInvitation(
  client: SupabaseClient,
  email: string,
  expiresInDays: number = 7
): Promise<void> {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await client.from('invitations').insert({
    email,
    invited_by: user.id,
    expires_at: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (error) throw error;
}

/**
 * Check if an email has a valid invitation
 */
export async function hasValidInvitation(
  client: SupabaseClient,
  email: string
): Promise<boolean> {
  const { data, error } = await client
    .from('invitations')
    .select('id')
    .eq('email', email)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .single();

  return !error && !!data;
}

/**
 * Mark invitation as used
 */
export async function useInvitation(client: SupabaseClient, email: string): Promise<void> {
  const { error } = await client
    .from('invitations')
    .update({
      used: true,
      used_at: new Date().toISOString(),
    })
    .eq('email', email)
    .eq('used', false);

  if (error) throw error;
}
