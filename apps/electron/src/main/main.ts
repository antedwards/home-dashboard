import { app, BrowserWindow, ipcMain, safeStorage, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fsPromises } from 'fs';
import fs from 'fs';
import os from 'os';
import { randomBytes } from 'crypto';
import { VoiceService } from './voice';
import type { VoiceEvent } from './voice';
import { DeviceFlowClient } from './device-flow-client';
import { createSupabaseClient, verifyAccessToken } from '@home-dashboard/database';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let voiceService: VoiceService | null = null;
let deviceFlowClient: DeviceFlowClient | null = null;

// Create Supabase client for main process
const supabase = createSupabaseClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

// Configure auto-updater
const UPDATE_SERVER_URL = process.env.VITE_UPDATE_SERVER_URL || 'https://yourdomain.com/api/updates';
autoUpdater.setFeedURL({
  provider: 'generic',
  url: UPDATE_SERVER_URL,
});

// Auto-updater will need custom request headers for authentication
autoUpdater.autoDownload = false; // We'll download manually with auth headers
autoUpdater.autoInstallOnAppQuit = true;

// Log auto-updater events
autoUpdater.logger = console;

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('[AutoUpdater] Checking for updates...');
  sendUpdateEvent('checking-for-update');
});

autoUpdater.on('update-available', (info) => {
  console.log('[AutoUpdater] Update available:', info);
  sendUpdateEvent('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
  console.log('[AutoUpdater] No updates available:', info);
  sendUpdateEvent('update-not-available', info);
});

autoUpdater.on('error', (err) => {
  console.error('[AutoUpdater] Error:', err);
  sendUpdateEvent('error', { message: err.message });
});

autoUpdater.on('download-progress', (progressObj) => {
  console.log(`[AutoUpdater] Download progress: ${progressObj.percent}%`);
  sendUpdateEvent('download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('[AutoUpdater] Update downloaded:', info);
  sendUpdateEvent('update-downloaded', info);
});

function sendUpdateEvent(event: string, data?: any) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:event', { event, data });
  }
}

// Token storage path
const getTokenPath = () => {
  return path.join(app.getPath('userData'), 'device-tokens.json');
};

// Device ID path
const getDeviceIdPath = () => {
  return path.join(app.getPath('userData'), 'device-id');
};

/**
 * Get or create a unique device ID
 */
async function getDeviceId(): Promise<string> {
  const deviceIdPath = getDeviceIdPath();

  try {
    const deviceId = await fsPromises.readFile(deviceIdPath, 'utf-8');
    return deviceId;
  } catch {
    // Generate new device ID
    const deviceId = randomBytes(16).toString('hex');
    await fsPromises.writeFile(deviceIdPath, deviceId, 'utf-8');
    return deviceId;
  }
}

/**
 * Get device name (hostname)
 */
function getDeviceName(): string {
  return `${os.hostname()} (Electron)`;
}

interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  refresh_expires_at: number;
  user_id: string;
  family_id: string;
}

/**
 * Store device tokens securely
 */
async function storeDeviceTokens(tokens: StoredTokens): Promise<void> {
  const tokenPath = getTokenPath();

  console.log('[storeDeviceTokens] Storing tokens for user:', tokens.user_id);

  const json = JSON.stringify(tokens);

  // Use Electron's safeStorage for encryption if available
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(json);
    await fsPromises.writeFile(tokenPath, encrypted);
    console.log('[storeDeviceTokens] Tokens stored with encryption');
  } else {
    // Fallback to plain text (not recommended for production)
    console.warn('[storeDeviceTokens] Encryption not available, storing tokens in plain text');
    await fsPromises.writeFile(tokenPath, json, 'utf-8');
  }
}

/**
 * Retrieve device tokens
 */
async function getDeviceTokens(): Promise<StoredTokens | null> {
  const tokenPath = getTokenPath();

  try {
    const data = await fsPromises.readFile(tokenPath);

    let json: string;
    if (safeStorage.isEncryptionAvailable()) {
      json = safeStorage.decryptString(data);
    } else {
      json = data.toString('utf-8');
    }

    const tokens: StoredTokens = JSON.parse(json);
    console.log('[getDeviceTokens] Retrieved tokens for user:', tokens.user_id);
    return tokens;
  } catch (error) {
    console.log('[getDeviceTokens] No tokens found');
    return null;
  }
}

/**
 * Clear device tokens (for logout/unpair)
 */
async function clearDeviceTokens(): Promise<void> {
  const tokenPath = getTokenPath();

  try {
    await fsPromises.unlink(tokenPath);
    console.log('[clearDeviceTokens] Tokens cleared');
  } catch {
    // File doesn't exist, that's fine
  }
}


function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    frame: true,
    backgroundColor: '#ffffff',
  });

  // Load Electron renderer (like collector-server)
  // In development, load from Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Forward renderer console messages to main process terminal
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const prefix = `[Renderer ${levelNames[level]}]`;

    if (level === 3) { // Error
      console.error(`${prefix}`, message, `(${sourceId}:${line})`);
    } else if (level === 2) { // Warning
      console.warn(`${prefix}`, message);
    } else {
      console.log(`${prefix}`, message);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    // Check for updates on startup (after a delay to let app load)
    if (!process.env.VITE_DEV_SERVER_URL) {
      setTimeout(() => {
        checkForUpdatesWithAuth().catch(err => {
          console.error('[AutoUpdater] Failed to check for updates on startup:', err);
        });
      }, 5000);
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  // Cleanup device flow client
  if (deviceFlowClient) {
    deviceFlowClient.stopPolling();
    deviceFlowClient = null;
  }

  // Cleanup voice service
  if (voiceService) {
    await voiceService.cleanup();
    voiceService = null;
  }
});

/**
 * Check for updates with authentication
 */
async function checkForUpdatesWithAuth(): Promise<any> {
  try {
    const tokens = await getDeviceTokens();
    if (!tokens) {
      console.log('[AutoUpdater] No device tokens, skipping update check');
      return null;
    }

    const platform = process.platform;
    const arch = process.arch;
    const currentVersion = app.getVersion();

    console.log(`[AutoUpdater] Checking for updates (platform: ${platform}, arch: ${arch}, version: ${currentVersion})`);

    // Call our custom API with authentication
    const response = await fetch(`${UPDATE_SERVER_URL}/latest?platform=${platform}&arch=${arch}&version=${currentVersion}`, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Update check failed: ${response.statusText}`);
    }

    const updateInfo = await response.json();

    if (updateInfo.updateAvailable) {
      console.log('[AutoUpdater] Update available:', updateInfo.version);
      sendUpdateEvent('update-available', updateInfo);
      return updateInfo;
    } else {
      console.log('[AutoUpdater] No updates available');
      sendUpdateEvent('update-not-available');
      return null;
    }
  } catch (error: any) {
    console.error('[AutoUpdater] Failed to check for updates:', error);
    sendUpdateEvent('error', { message: error.message });
    throw error;
  }
}

/**
 * Download and install update with authentication
 */
async function downloadAndInstallUpdate(updateInfo: any): Promise<void> {
  try {
    const tokens = await getDeviceTokens();
    if (!tokens) {
      throw new Error('No device tokens available');
    }

    console.log('[AutoUpdater] Downloading update from:', updateInfo.files[0].url);

    // Download the update file
    const response = await fetch(updateInfo.files[0].url, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    // Get the file buffer
    const buffer = await response.arrayBuffer();
    const fileBuffer = Buffer.from(buffer);

    // Save to temp directory
    const ext = updateInfo.files[0].url.includes('.dmg') ? '.dmg' :
                 updateInfo.files[0].url.includes('.exe') ? '.exe' :
                 updateInfo.files[0].url.includes('.AppImage') ? '.AppImage' : '';

    const tempFile = path.join(os.tmpdir(), `home-dashboard-update${ext}`);
    await fsPromises.writeFile(tempFile, fileBuffer);

    console.log('[AutoUpdater] Update downloaded to:', tempFile);

    // Verify checksum if available
    if (updateInfo.files[0].checksum) {
      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256');
      hash.update(fileBuffer);
      const calculatedChecksum = hash.digest('hex');

      if (calculatedChecksum !== updateInfo.files[0].checksum) {
        await fsPromises.unlink(tempFile);
        throw new Error('Checksum verification failed');
      }

      console.log('[AutoUpdater] Checksum verified');
    }

    sendUpdateEvent('update-downloaded', { path: tempFile });

    // On Linux, make AppImage executable and launch it
    if (process.platform === 'linux' && ext === '.AppImage') {
      await fsPromises.chmod(tempFile, '755');
      console.log('[AutoUpdater] Made AppImage executable. User must manually run:', tempFile);
      // TODO: Could open file manager or prompt user
    }

    // Note: For proper auto-update, we'd use electron-updater's built-in functionality
    // This is a basic implementation that downloads the file
  } catch (error: any) {
    console.error('[AutoUpdater] Failed to download update:', error);
    sendUpdateEvent('error', { message: error.message });
    throw error;
  }
}

// IPC handlers for main process communication
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getPath', (_, name: string) => {
  return app.getPath(name as any);
});

ipcMain.handle('app:openExternal', async (_, url: string) => {
  await shell.openExternal(url);
});

// Update handlers
ipcMain.handle('update:check', async () => {
  try {
    const updateInfo = await checkForUpdatesWithAuth();
    return { success: true, data: updateInfo };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update:download', async (_, updateInfo: any) => {
  try {
    await downloadAndInstallUpdate(updateInfo);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update:installAndRestart', async () => {
  try {
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Device authentication handlers
ipcMain.handle('device:getDeviceId', async () => {
  return await getDeviceId();
});

ipcMain.handle('device:getDeviceName', () => {
  return getDeviceName();
});

ipcMain.handle('device:getTokens', async () => {
  return await getDeviceTokens();
});

ipcMain.handle('device:clearTokens', async () => {
  await clearDeviceTokens();
});

// Device flow handlers
ipcMain.handle('deviceFlow:start', async () => {
  try {
    const deviceId = await getDeviceId();
    const deviceName = getDeviceName();
    // Use web app URL for API calls (not the Electron renderer URL)
    const baseUrl = process.env.VITE_WEB_APP_URL || 'http://localhost:5173';

    // Initialize device flow client
    deviceFlowClient = new DeviceFlowClient(baseUrl, deviceId, deviceName);

    // Request device code
    const deviceCodeResponse = await deviceFlowClient.startFlow();

    console.log('[Main] Device flow started:', deviceCodeResponse.user_code);

    return { success: true, data: deviceCodeResponse };
  } catch (error: any) {
    console.error('[Main] Failed to start device flow:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('deviceFlow:poll', async (_, deviceCode: string, interval: number) => {
  try {
    if (!deviceFlowClient) {
      throw new Error('Device flow not started');
    }

    console.log('[Main] Starting device flow polling...');

    // Poll for authorization
    const tokenResponse = await deviceFlowClient.pollForAuthorization(deviceCode, interval);

    // Convert to StoredTokens and save
    const storedTokens = deviceFlowClient.toStoredTokens(tokenResponse);
    await storeDeviceTokens(storedTokens);

    console.log('[Main] Device authorized and tokens stored');

    return { success: true, data: tokenResponse };
  } catch (error: any) {
    console.error('[Main] Device flow polling failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('deviceFlow:stop', async () => {
  try {
    if (deviceFlowClient) {
      deviceFlowClient.stopPolling();
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Auth handlers (run in main process to use crypto)
ipcMain.handle('auth:verifyAccessToken', async (_, accessToken: string) => {
  try {
    console.log('[Main] Verifying access token...');
    const deviceId = await getDeviceId();
    const result = await verifyAccessToken(supabase, accessToken, deviceId);
    console.log('[Main] Token verification result:', result ? 'valid' : 'invalid');
    return { success: true, result };
  } catch (error: any) {
    console.error('[Main] Failed to verify access token:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auth:refreshToken', async (_, refreshToken: string) => {
  try {
    if (!deviceFlowClient) {
      const deviceId = await getDeviceId();
      const deviceName = getDeviceName();
      // Use web app URL for API calls (not the Electron renderer URL)
      const baseUrl = process.env.VITE_WEB_APP_URL || 'http://localhost:5173';
      deviceFlowClient = new DeviceFlowClient(baseUrl, deviceId, deviceName);
    }

    console.log('[Main] Refreshing access token...');
    const tokenResponse = await deviceFlowClient.refreshToken(refreshToken);

    // Update stored tokens
    const storedTokens = deviceFlowClient.toStoredTokens(tokenResponse);
    await storeDeviceTokens(storedTokens);

    console.log('[Main] Token refreshed successfully');

    return { success: true, data: tokenResponse };
  } catch (error: any) {
    console.error('[Main] Failed to refresh token:', error);
    return { success: false, error: error.message };
  }
});

// Voice command handlers
ipcMain.handle('voice:initialize', async (_, userId: string, familyId: string, accessToken?: string) => {
  try {
    if (!voiceService) {
      voiceService = new VoiceService({
        wakeWord: 'hey sausage',
        whisperModel: 'base',
        language: 'en',
      });

      // Forward voice events to renderer
      voiceService.on((event: VoiceEvent) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('voice:event', event);
        }
      });
    }

    await voiceService.initialize(userId, familyId, accessToken);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to initialize voice service:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('voice:start', async () => {
  try {
    if (!voiceService) {
      throw new Error('Voice service not initialized');
    }
    await voiceService.start();
    return { success: true };
  } catch (error: any) {
    console.error('Failed to start voice service:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('voice:stop', async () => {
  try {
    if (voiceService) {
      voiceService.stop();
    }
    return { success: true };
  } catch (error: any) {
    console.error('Failed to stop voice service:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('voice:isActive', async () => {
  return voiceService?.isActive() || false;
});

ipcMain.handle('voice:getConfig', async () => {
  return voiceService?.getConfig() || null;
});

ipcMain.handle('voice:updateConfig', async (_, config: any) => {
  try {
    if (!voiceService) {
      throw new Error('Voice service not initialized');
    }
    voiceService.updateConfig(config);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('voice:processAudio', async (_, audioBuffer: Buffer) => {
  try {
    if (!voiceService) {
      throw new Error('Voice service not initialized');
    }

    console.log('[Main] Processing audio buffer, size:', audioBuffer.length);
    await voiceService.processAudio(audioBuffer);

    return { success: true };
  } catch (error: any) {
    console.error('[Main] Failed to process audio:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('voice:checkWakeWord', async (_, audioBuffer: Buffer) => {
  try {
    if (!voiceService) {
      return { success: true, detected: false };
    }

    // Use tiny Whisper model for fast wake word detection
    const { SpeechRecognizer } = await import('./voice/SpeechRecognizer');
    const recognizer = new SpeechRecognizer('tiny', 'en');
    await recognizer.initialize();

    // Save to temp file
    const tempFile = path.join(os.tmpdir(), `wake-word-${Date.now()}.wav`);
    fs.writeFileSync(tempFile, audioBuffer);

    // Transcribe
    const transcript = await recognizer.transcribe(tempFile);

    // Check for wake word
    const normalized = transcript.toLowerCase().trim();
    const detected = /\b(hey|hay|hi|a)\s+sausage\b/i.test(normalized) || /\bsausage\b/i.test(normalized);

    console.log(`[Main] Wake word check: "${transcript}" -> ${detected ? 'DETECTED' : 'not detected'}`);

    // Cleanup
    try {
      fs.unlinkSync(tempFile);
    } catch (err) {
      // Ignore cleanup errors
    }

    return { success: true, detected };
  } catch (error: any) {
    console.error('[Main] Failed to check wake word:', error);
    return { success: false, detected: false, error: error.message };
  }
});
