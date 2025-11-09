import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import os from 'os';
import { randomBytes } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

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
      preload: path.join(__dirname, 'preload.js'),
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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for main process communication
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getPath', (_, name: string) => {
  return app.getPath(name as any);
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
