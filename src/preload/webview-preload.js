// src/preload/webview-preload.js
const { ipcRenderer } = require('electron');

// Listen for keyboard events inside the webview and forward them to the host parent page
window.addEventListener('keydown', (e) => {
  // We forward key events so the host can handle workspace-wide shortcuts like Space+Tab
  ipcRenderer.sendToHost('webview-keydown', {
    key: e.key,
    keyCode: e.keyCode,
    code: e.code,
    altKey: e.altKey,
    ctrlKey: e.ctrlKey,
    shiftKey: e.shiftKey,
    metaKey: e.metaKey
  });
});

window.addEventListener('keyup', (e) => {
  ipcRenderer.sendToHost('webview-keyup', {
    key: e.key,
    keyCode: e.keyCode,
    code: e.code
  });
});
