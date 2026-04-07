import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  fs: {
    openDirectory: () => ipcRenderer.invoke('fs:open-directory'),
    readFile: (filePath: string) => ipcRenderer.invoke('fs:read-file', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:write-file', filePath, content),
    readdir: (dirPath: string) => ipcRenderer.invoke('fs:readdir', dirPath),
    exists: (filePath: string) => ipcRenderer.invoke('fs:exists', filePath),
  },
  aiChat: {
    request: (request: Record<string, unknown>) => ipcRenderer.invoke('ai:chat-request', request),
    onChunk: (requestId: string, callback: (chunk: string) => void) => {
      const channel = `ai:chat-chunk:${requestId}`;
      const subscription = (_event: Electron.IpcRendererEvent, chunk: string) => callback(chunk);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
    onError: (requestId: string, callback: (error: unknown) => void) => {
      const channel = `ai:chat-error:${requestId}`;
      const subscription = (_event: Electron.IpcRendererEvent, error: unknown) => callback(error);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
    onEnd: (requestId: string, callback: () => void) => {
      const channel = `ai:chat-end:${requestId}`;
      const subscription = () => callback();
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    }
  }
});
