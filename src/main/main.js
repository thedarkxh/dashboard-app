// src/main/main.js
const { app, BrowserWindow, ipcMain, shell, Menu, session } = require('electron');
const path = require('path');
const fs = require('fs');

// Define tasks file path
const TASKS_FILE = path.join(__dirname, '../../dashboard-tasks.json');

let pty = null;
try {
  pty = require('node-pty');
} catch (err) {
  console.warn('node-pty failed to load, falling back to standard child_process spawn:', err);
}
const os = require('os');

// Enable GPU-accelerated compositing for smooth rendering
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('disable-vulkan'); // Avoid Wayland+Vulkan incompatibility

// Disable default application menu to completely remove the native topbar
Menu.setApplicationMenu(null);

let win = null;
let ptyProcess = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
    },
    backgroundColor: '#0a0a0c',
  });

  win.setMenuBarVisibility(false);

  // Load local Vite dev server in development, built files in production
  if (!app.isPackaged && process.env.NODE_ENV !== 'production') {
    win.loadURL('http://127.0.0.1:5173');
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  // Log failures to load
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`URL failed to load: ${validatedURL} (${errorCode} - ${errorDescription})`);
  });

  // Handle window closing
  win.on('closed', () => {
    win = null;
    if (ptyProcess) {
      ptyProcess.kill();
      ptyProcess = null;
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  // Comprehensive ad/tracker domain blocklist
  const adBlockList = new Set([
    // Google ads
    'doubleclick.net', 'googleadservices.com', 'googlesyndication.com',
    'adservice.google.com', 'adservice.google.co.in', 'pagead2.googlesyndication.com',
    'tpc.googlesyndication.com', 'www.googletagservices.com',
    // Analytics/tracking
    'google-analytics.com', 'analytics.google.com',
    'hotjar.com', 'optimizely.com', 'quantserve.com', 'scorecardresearch.com',
    'segment.io', 'segment.com', 'mixpanel.com', 'amplitude.com',
    'mouseflow.com', 'luckyorange.com', 'crazyegg.com', 'fullstory.com',
    // Ad networks
    'moatads.com', 'adsystem.com', 'adservice.com', 'adsrvr.org',
    'amazon-adsystem.com', 'adnxs.com', 'adcolony.com', 'adtech.de',
    'zedo.com', 'yieldlab.net',
    // Content recommendation / native ads
    'taboola.com', 'outbrain.com', 'revcontent.com', 'mgid.com',
    'content-ad.net', 'nativo.com', 'sharethrough.com',
    // Programmatic / exchanges
    'rubiconproject.com', 'pubmatic.com', 'openx.net', 'criteo.com',
    'casalemedia.com', 'appnexus.com', 'indexexchange.com', 'smartadserver.com',
    'bidswitch.net', 'contextweb.com', 'liadm.com',
    // Pop-up / pop-under networks
    'popads.net', 'popcash.net', 'propellerads.com', 'adcash.com',
    'exoclick.com', 'juicyads.com', 'clickadu.com', 'hilltopads.net',
    'trafficjunky.com', 'trafficfactory.biz', 'tsyndicate.com',
    'pushwoosh.com', 'pushcrew.com', 'onesignal.com',
    // Mobile ads
    'flurry.com', 'applovin.com', 'unityads.unity3d.com', 'ironsrc.com',
    'inmobi.com', 'startapp.com', 'chartboost.com',
    // Social trackers
    'facebook.net', 'connect.facebook.net', 'pixel.facebook.com',
    'ads-twitter.com', 'static.ads-twitter.com',
    // Misc trackers
    'serving-sys.com', 'eyeota.net', 'bluekai.com', 'krxd.net',
    'exelator.com', 'agkn.com', 'rlcdn.com', 'demdex.net',
    'omtrdc.net', '2o7.net', 'tealiumiq.com',
  ]);

  const adPatterns = [
    /\/pagead\//i,
    /\/adsense\//i,
    /\/adserver\//i,
    /\/ad_banner/i,
    /\/popup_ad/i,
    /\/pop_ads/i,
    /doubleclick\.net/i,
    /popunder/i,
    /popupads/i,
    /\/ads\/|\/ad\//i,
    /\.ads\./i,
    /\/sponsor/i,
  ];

  // Intercept and synchronously filter all network requests
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    const url = details.url;
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;

      // O(1) exact match
      if (adBlockList.has(hostname)) {
        return callback({ cancel: true });
      }

      // Suffix match (subdomains)
      for (const domain of adBlockList) {
        if (hostname.endsWith('.' + domain)) {
          return callback({ cancel: true });
        }
      }

      // URL path pattern matching
      for (const pattern of adPatterns) {
        if (pattern.test(url)) {
          return callback({ cancel: true });
        }
      }
    } catch (e) {}
    callback({ cancel: false });
  });

  // Block popup windows from webviews (common ad vector)
  win.webContents.on('did-attach-webview', (event, webContents) => {
    webContents.setWindowOpenHandler(({ url }) => {
      // Allow same-origin navigations, block everything else (ad popups)
      return { action: 'deny' };
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Simple IPC to launch external URLs (e.g., OAuth redirects)
ipcMain.handle('open-external', async (_, url) => {
  await shell.openExternal(url);
});

// Task Manager IPC
ipcMain.handle('read-tasks', async () => {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      const data = fs.readFileSync(TASKS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (err) {
    console.error('Error reading tasks:', err);
    return [];
  }
});

ipcMain.handle('write-tasks', async (_, tasks) => {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing tasks:', err);
    return false;
  }
});

ipcMain.handle('toggle-fullscreen', () => {
  if (win) {
    try {
      const isFS = win.isFullScreen();
      win.setFullScreen(!isFS);
      // If native fullscreen state didn't change (Wayland blocker), use simple fullscreen
      if (win.isFullScreen() === isFS) {
        win.setSimpleFullScreen(!win.isSimpleFullScreen());
      }
    } catch (err) {
      console.warn('Native fullscreen failed, trying simple fullscreen:', err);
      try {
        win.setSimpleFullScreen(!win.isSimpleFullScreen());
      } catch (e) {
        console.error('All fullscreen toggles failed:', e);
      }
    }
  }
});

// Map-based multi-session PTY and Fallback registries
const activePtyProcesses = new Map();
const activeFallbackProcesses = new Map();

ipcMain.handle('pty-start', (event, options) => {
  const { tabId, command, args, cwd, cols, rows } = options || {};
  if (!tabId) return false;

  // Clean up if process with same tabId is already running
  if (activePtyProcesses.has(tabId)) {
    try { activePtyProcesses.get(tabId).kill(); } catch (e) {}
    activePtyProcesses.delete(tabId);
  }
  if (activeFallbackProcesses.has(tabId)) {
    try { activeFallbackProcesses.get(tabId).kill(); } catch (e) {}
    activeFallbackProcesses.delete(tabId);
  }

  const shellCmd = command || (process.platform === 'win32' ? 'powershell.exe' : 'bash');

  if (pty) {
    try {
      const proc = pty.spawn(shellCmd, args || [], {
        name: 'xterm-256color',
        cols: cols || 80,
        rows: rows || 24,
        cwd: cwd || os.homedir(),
        env: process.env
      });

      proc.onData((data) => {
        if (win) {
          win.webContents.send('pty-data', { tabId, data });
        }
      });

      activePtyProcesses.set(tabId, proc);
      return true;
    } catch (e) {
      console.error(`node-pty spawn failed for tab ${tabId}:`, e);
    }
  }

  // Fallback to standard child_process spawn (100% reliable system shell)
  try {
    const { spawn } = require('child_process');
    const proc = spawn(shellCmd, args || [], {
      cwd: cwd || os.homedir(),
      env: { ...process.env, TERM: 'xterm-256color' }
    });

    proc.stdout.on('data', (data) => {
      if (win) {
        win.webContents.send('pty-data', { tabId, data: data.toString() });
      }
    });

    proc.stderr.on('data', (data) => {
      if (win) {
        win.webContents.send('pty-data', { tabId, data: data.toString() });
      }
    });

    proc.on('close', () => {
      activeFallbackProcesses.delete(tabId);
    });

    activeFallbackProcesses.set(tabId, proc);
    return true;
  } catch (err) {
    console.error(`All terminal spawns failed for tab ${tabId}:`, err);
    return false;
  }
});

ipcMain.on('pty-input', (event, { tabId, data }) => {
  if (!tabId) return;
  if (activePtyProcesses.has(tabId)) {
    activePtyProcesses.get(tabId).write(data);
  } else if (activeFallbackProcesses.has(tabId)) {
    activeFallbackProcesses.get(tabId).stdin.write(data);
  }
});

ipcMain.on('pty-resize', (event, { tabId, cols, rows }) => {
  if (!tabId) return;
  const proc = activePtyProcesses.get(tabId);
  if (proc && typeof proc.resize === 'function') {
    try { proc.resize(cols, rows); } catch (e) {}
  }
});

ipcMain.on('pty-kill', (event, { tabId }) => {
  if (!tabId) return;
  if (activePtyProcesses.has(tabId)) {
    try { activePtyProcesses.get(tabId).kill(); } catch (e) {}
    activePtyProcesses.delete(tabId);
  }
  if (activeFallbackProcesses.has(tabId)) {
    try { activeFallbackProcesses.get(tabId).kill(); } catch (e) {}
    activeFallbackProcesses.delete(tabId);
  }
});
