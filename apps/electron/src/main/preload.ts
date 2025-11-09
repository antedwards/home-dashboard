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
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
