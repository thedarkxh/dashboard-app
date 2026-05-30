// src/main/preload.js
// Deprecated: Use src/preload/preload.js instead
// This file is kept for backward compatibility but the main window 
// uses the preload at ../preload/preload.js as configured in main.js
const { ipcRenderer } = require('electron');

window.electronAPI = {
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
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
