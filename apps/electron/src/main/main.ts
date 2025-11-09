import { app, BrowserWindow, ipcMain, safeStorage, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import os from 'os';
import { randomBytes } from 'crypto';
import { VoiceService } from './voice';
import type { VoiceEvent } from './voice';
import { createSupabaseClient, verifyDeviceToken, verifyPairingCodeAndCreateToken } from '@home-dashboard/database';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let voiceService: VoiceService | null = null;

// Protocol handler for deep linking
const PROTOCOL = 'homedashboard';

// Make this app the default handler for homedashboard:// links
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// Create Supabase client for main process
const supabase = createSupabaseClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

//Token storage path
const getTokenPath = () => {
  return path.join(app.getPath('userData'), 'device-token');
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
    const deviceId = await fs.readFile(deviceIdPath, 'utf-8');
    return deviceId;
  } catch {
    // Generate new device ID
    const deviceId = randomBytes(16).toString('hex');
    await fs.writeFile(deviceIdPath, deviceId, 'utf-8');
    return deviceId;
  }
}

/**
 * Get device name (hostname)
 */
function getDeviceName(): string {
  return `${os.hostname()} (Electron)`;
}

/**
 * Store device token securely
 */
async function storeDeviceToken(token: string): Promise<void> {
  const tokenPath = getTokenPath();

  // Use Electron's safeStorage for encryption if available
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(token);
    await fs.writeFile(tokenPath, encrypted);
  } else {
    // Fallback to plain text (not recommended for production)
    console.warn('Encryption not available, storing token in plain text');
    await fs.writeFile(tokenPath, token, 'utf-8');
  }
}

/**
 * Retrieve device token
 */
async function getDeviceToken(): Promise<string | null> {
  const tokenPath = getTokenPath();

  try {
    const data = await fs.readFile(tokenPath);

    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(data);
    } else {
      return data.toString('utf-8');
    }
  } catch {
    return null;
  }
}

/**
 * Clear device token (for logout/unpair)
 */
async function clearDeviceToken(): Promise<void> {
  const tokenPath = getTokenPath();

  try {
    await fs.unlink(tokenPath);
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

  // In development, load from Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle deep link URLs
async function handleDeepLink(url: string) {
  console.log('Deep link received:', url);

  // Parse the URL: homedashboard://paired?token=xxx
  const urlObj = new URL(url);

  if (urlObj.protocol === `${PROTOCOL}:` && urlObj.hostname === 'paired') {
    const token = urlObj.searchParams.get('token');

    if (token) {
      try {
        // Store the token
        await storeDeviceToken(token);

        // Focus or create window
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
          mainWindow.reload();
        } else {
          createWindow();
        }
      } catch (error) {
        console.error('Failed to handle deep link:', error);
      }
    }
  }
}

// Handle deep link on macOS
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// Prevent multiple instances and handle deep links on Windows/Linux
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window and handle the URL
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }

    // Check if there's a deep link in the command line
    const url = commandLine.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (url) {
      handleDeepLink(url);
    }
  });

  app.whenReady().then(() => {
    createWindow();

    // Check if opened with a deep link (Windows/Linux)
    const url = process.argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (url) {
      handleDeepLink(url);
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
  // Cleanup voice service
  if (voiceService) {
    await voiceService.cleanup();
    voiceService = null;
  }
});

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

// Device authentication handlers
ipcMain.handle('device:getDeviceId', async () => {
  return await getDeviceId();
});

ipcMain.handle('device:getDeviceName', () => {
  return getDeviceName();
});

ipcMain.handle('device:storeToken', async (_, token: string) => {
  await storeDeviceToken(token);
});

ipcMain.handle('device:getToken', async () => {
  return await getDeviceToken();
});

ipcMain.handle('device:clearToken', async () => {
  await clearDeviceToken();
});

// Auth handlers (run in main process to use crypto)
ipcMain.handle('auth:verifyDeviceToken', async (_, token: string, deviceId: string) => {
  try {
    const result = await verifyDeviceToken(supabase, token, deviceId);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auth:verifyPairingCode', async (_, code: string, deviceId: string, deviceName: string) => {
  try {
    const result = await verifyPairingCodeAndCreateToken(supabase, code, deviceId, deviceName);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Voice command handlers
ipcMain.handle('voice:initialize', async (_, userId: string, familyId: string) => {
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

    await voiceService.initialize(userId, familyId);
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
