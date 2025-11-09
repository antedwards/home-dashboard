import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),

  // Device authentication
  getDeviceId: () => ipcRenderer.invoke('device:getDeviceId'),
  getDeviceName: () => ipcRenderer.invoke('device:getDeviceName'),
  storeDeviceToken: (token: string) => ipcRenderer.invoke('device:storeToken', token),
  getDeviceToken: () => ipcRenderer.invoke('device:getToken'),
  clearDeviceToken: () => ipcRenderer.invoke('device:clearToken'),

  // Auth operations (run in main process)
  auth: {
    verifyDeviceToken: (token: string, deviceId: string) =>
      ipcRenderer.invoke('auth:verifyDeviceToken', token, deviceId),
    verifyPairingCode: (code: string, deviceId: string, deviceName: string) =>
      ipcRenderer.invoke('auth:verifyPairingCode', code, deviceId, deviceName),
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
    onEvent: (callback: (event: any) => void) => {
      ipcRenderer.on('voice:event', (_, event) => callback(event));
    },
    offEvent: (callback: (event: any) => void) => {
      ipcRenderer.removeListener('voice:event', callback as any);
    },
  },
});

// Type definitions for the exposed API
export interface ElectronAPI {
  getVersion: () => Promise<string>;
  getPath: (name: string) => Promise<string>;
  getDeviceId: () => Promise<string>;
  getDeviceName: () => Promise<string>;
  storeDeviceToken: (token: string) => Promise<void>;
  getDeviceToken: () => Promise<string | null>;
  clearDeviceToken: () => Promise<void>;
  auth: {
    verifyDeviceToken: (token: string, deviceId: string) => Promise<{ success: boolean; result?: any; error?: string }>;
    verifyPairingCode: (code: string, deviceId: string, deviceName: string) => Promise<{ success: boolean; result?: any; error?: string }>;
  };
  voice: {
    initialize: (userId: string, familyId: string) => Promise<{ success: boolean; error?: string }>;
    start: () => Promise<{ success: boolean; error?: string }>;
    stop: () => Promise<{ success: boolean; error?: string }>;
    isActive: () => Promise<boolean>;
    getConfig: () => Promise<any>;
    updateConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
    onEvent: (callback: (event: any) => void) => void;
    offEvent: (callback: (event: any) => void) => void;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
