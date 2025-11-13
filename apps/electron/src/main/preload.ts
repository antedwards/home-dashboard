import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
  openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),

  // Device authentication
  getDeviceId: () => ipcRenderer.invoke('device:getDeviceId'),
  getDeviceName: () => ipcRenderer.invoke('device:getDeviceName'),
  getDeviceTokens: () => ipcRenderer.invoke('device:getTokens'),
  clearDeviceTokens: () => ipcRenderer.invoke('device:clearTokens'),

  // Device flow (OAuth-style pairing)
  deviceFlow: {
    start: () => ipcRenderer.invoke('deviceFlow:start'),
    poll: (deviceCode: string, interval: number) =>
      ipcRenderer.invoke('deviceFlow:poll', deviceCode, interval),
    stop: () => ipcRenderer.invoke('deviceFlow:stop'),
  },

  // Auth operations (run in main process)
  auth: {
    verifyAccessToken: (accessToken: string) =>
      ipcRenderer.invoke('auth:verifyAccessToken', accessToken),
    refreshToken: (refreshToken: string) =>
      ipcRenderer.invoke('auth:refreshToken', refreshToken),
  },

  // Voice commands
  voice: {
    initialize: (userId: string, familyId: string) =>
      ipcRenderer.invoke('voice:initialize', userId, familyId),
    start: () => ipcRenderer.invoke('voice:start'),
    stop: () => ipcRenderer.invoke('voice:stop'),
    isActive: () => ipcRenderer.invoke('voice:isActive'),
    getConfig: () => ipcRenderer.invoke('voice:getConfig'),
    updateConfig: (config: any) => ipcRenderer.invoke('voice:updateConfig', config),
    processAudio: (audioBuffer: ArrayBuffer) =>
      ipcRenderer.invoke('voice:processAudio', Buffer.from(audioBuffer)),
    checkWakeWord: (audioBuffer: ArrayBuffer) =>
      ipcRenderer.invoke('voice:checkWakeWord', Buffer.from(audioBuffer)),
    onEvent: (callback: (event: any) => void) => {
      ipcRenderer.on('voice:event', (_, event) => callback(event));
    },
    offEvent: (callback: (event: any) => void) => {
      ipcRenderer.removeListener('voice:event', callback as any);
    },
  },

  // Auto-update
  update: {
    check: () => ipcRenderer.invoke('update:check'),
    download: (updateInfo: any) => ipcRenderer.invoke('update:download', updateInfo),
    installAndRestart: () => ipcRenderer.invoke('update:installAndRestart'),
    onEvent: (callback: (event: any) => void) => {
      ipcRenderer.on('update:event', (_, event) => callback(event));
    },
    offEvent: (callback: (event: any) => void) => {
      ipcRenderer.removeListener('update:event', callback as any);
    },
  },
});

// Type definitions for the exposed API
interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  refresh_expires_at: number;
  user_id: string;
  family_id: string;
}

export interface ElectronAPI {
  getVersion: () => Promise<string>;
  getPath: (name: string) => Promise<string>;
  openExternal: (url: string) => Promise<void>;
  getDeviceId: () => Promise<string>;
  getDeviceName: () => Promise<string>;
  getDeviceTokens: () => Promise<StoredTokens | null>;
  clearDeviceTokens: () => Promise<void>;
  deviceFlow: {
    start: () => Promise<{ success: boolean; data?: any; error?: string }>;
    poll: (deviceCode: string, interval: number) => Promise<{ success: boolean; data?: any; error?: string }>;
    stop: () => Promise<{ success: boolean; error?: string }>;
  };
  auth: {
    verifyAccessToken: (accessToken: string) => Promise<{ success: boolean; result?: any; error?: string }>;
    refreshToken: (refreshToken: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  };
  voice: {
    initialize: (userId: string, familyId: string) => Promise<{ success: boolean; error?: string }>;
    start: () => Promise<{ success: boolean; error?: string }>;
    stop: () => Promise<{ success: boolean; error?: string }>;
    isActive: () => Promise<boolean>;
    getConfig: () => Promise<any>;
    updateConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
    processAudio: (audioBuffer: ArrayBuffer) => Promise<{ success: boolean; error?: string }>;
    checkWakeWord: (audioBuffer: ArrayBuffer) => Promise<{ success: boolean; detected: boolean; error?: string }>;
    onEvent: (callback: (event: any) => void) => void;
    offEvent: (callback: (event: any) => void) => void;
  };
  update: {
    check: () => Promise<{ success: boolean; data?: any; error?: string }>;
    download: (updateInfo: any) => Promise<{ success: boolean; error?: string }>;
    installAndRestart: () => Promise<{ success: boolean; error?: string }>;
    onEvent: (callback: (event: any) => void) => void;
    offEvent: (callback: (event: any) => void) => void;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
