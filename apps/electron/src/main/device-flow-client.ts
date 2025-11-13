import { app, shell } from 'electron';
import type { DeviceCodeResponse, TokenResponse } from '@home-dashboard/database';

interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  refresh_expires_at: number;
  user_id: string;
  family_id: string;
}

export class DeviceFlowClient {
  private baseUrl: string;
  private deviceId: string;
  private deviceName: string;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(baseUrl: string, deviceId: string, deviceName: string) {
    this.baseUrl = baseUrl;
    this.deviceId = deviceId;
    this.deviceName = deviceName;
  }

  /**
   * Start the device authorization flow
   * Returns device code information to display to the user
   */
  async startFlow(): Promise<DeviceCodeResponse> {
    console.log('[DeviceFlow] Starting device authorization flow...');

    const response = await fetch(`${this.baseUrl}/api/device/code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: this.deviceId,
        device_name: this.deviceName,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to request device code');
    }

    const data: DeviceCodeResponse = await response.json();
    console.log('[DeviceFlow] Device code received:', data.user_code);

    return data;
  }

  /**
   * Poll for device authorization
   * Resolves when user activates the device, rejects on error/timeout
   */
  async pollForAuthorization(
    deviceCode: string,
    interval: number = 5,
    onPending?: () => void
  ): Promise<TokenResponse> {
    console.log('[DeviceFlow] Starting polling every', interval, 'seconds...');

    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 180; // 15 minutes with 5 second interval

      const poll = async () => {
        attempts++;

        if (attempts > maxAttempts) {
          this.stopPolling();
          reject(new Error('Device authorization timed out'));
          return;
        }

        try {
          const response = await fetch(`${this.baseUrl}/api/device/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
              device_code: deviceCode,
            }),
          });

          const data = await response.json();

          if (response.ok) {
            // Success! Got the token
            console.log('[DeviceFlow] Device authorized successfully');
            this.stopPolling();
            resolve(data);
          } else if (data.error === 'authorization_pending') {
            // Still waiting for user to activate
            if (onPending) onPending();
          } else if (data.error === 'expired_token') {
            // Code expired
            this.stopPolling();
            reject(new Error('Device code expired. Please try again.'));
          } else {
            // Other error
            this.stopPolling();
            reject(new Error(data.error || 'Authorization failed'));
          }
        } catch (error: any) {
          console.error('[DeviceFlow] Polling error:', error);
          // Continue polling on network errors
        }
      };

      // Start polling immediately
      poll();

      // Then poll at interval
      this.pollingInterval = setInterval(poll, interval * 1000);
    });
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('[DeviceFlow] Stopped polling');
    }
  }

  /**
   * Open the verification URL in the browser
   */
  openVerificationUrl(verificationUri: string) {
    console.log('[DeviceFlow] Opening browser:', verificationUri);
    shell.openExternal(verificationUri);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    console.log('[DeviceFlow] Refreshing access token...');

    const response = await fetch(`${this.baseUrl}/api/device/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        device_id: this.deviceId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to refresh token');
    }

    const data: TokenResponse = await response.json();
    console.log('[DeviceFlow] Token refreshed successfully');

    return data;
  }

  /**
   * Check if tokens need refresh (within 5 days of expiry)
   */
  shouldRefreshToken(tokens: StoredTokens): boolean {
    const now = Date.now();
    const expiresAt = tokens.expires_at;
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;

    return expiresAt - now < fiveDaysMs;
  }

  /**
   * Convert TokenResponse to StoredTokens with expiry timestamps
   */
  toStoredTokens(response: TokenResponse): StoredTokens {
    const now = Date.now();
    return {
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      expires_at: now + response.expires_in * 1000,
      refresh_expires_at: now + 90 * 24 * 60 * 60 * 1000, // 90 days
      user_id: response.user_id,
      family_id: response.family_id,
    };
  }
}
