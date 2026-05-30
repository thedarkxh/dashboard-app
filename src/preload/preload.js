// src/preload/preload.js
const { ipcRenderer } = require('electron');

// When contextIsolation is false, contextBridge.exposeInMainWorld() silently fails.
// We must assign directly to window instead.
// This provides all the IPC methods the renderer needs.

window.electronAPI = {
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  
  readTasks: () => ipcRenderer.invoke('read-tasks'),
  writeTasks: (tasks) => ipcRenderer.invoke('write-tasks', tasks),

  // PTY APIs supporting multi-tab tabId parameters
  startPty: (options) => ipcRenderer.invoke('pty-start', options),
  writePty: (tabId, data) => ipcRenderer.send('pty-input', { tabId, data }),
  resizePty: (tabId, cols, rows) => ipcRenderer.send('pty-resize', { tabId, cols, rows }),
  killPty: (tabId) => ipcRenderer.send('pty-kill', { tabId }),
  onPtyData: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on('pty-data', listener);
    return () => ipcRenderer.removeListener('pty-data', listener);
  },
};
