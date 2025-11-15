/**
 * Simple encryption/decryption for CalDAV passwords
 * Uses AES-256-GCM via Web Crypto API (works in both Node.js and Cloudflare Workers)
 */

import { CALDAV_ENCRYPTION_KEY } from '$env/static/private';

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

/**
 * Get the encryption key from environment variable
 */
async function getKey(): Promise<CryptoKey> {
  const keyMaterial = new TextEncoder().encode(CALDAV_ENCRYPTION_KEY);

  // Hash the key to ensure it's the right length
  const keyHash = await crypto.subtle.digest('SHA-256', keyMaterial);

  return crypto.subtle.importKey(
    'raw',
    keyHash,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a password
 */
export async function encryptPassword(password: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  const encoded = new TextEncoder().encode(password);

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );

  // Combine IV and encrypted data, then base64 encode
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return Buffer.from(combined).toString('base64');
}

/**
 * Decrypt a password
 */
export async function decryptPassword(encryptedPassword: string): Promise<string> {
  const key = await getKey();
  const combined = Buffer.from(encryptedPassword, 'base64');

  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}
