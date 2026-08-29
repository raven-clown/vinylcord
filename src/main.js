const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, clipboard } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const DiscordPresence = require('./discordPresence');
const OverlayServer = require('./overlayServer');
const Settings = require('./settings');

let ytWindow;
let tray;
let settings;
let discord;
let overlay;
let lastTrackAt = 0;
let lastTrack = null;

const ICON_PATH = path.join(__dirname, '..', 'assets', 'icon.png');
const UPDATE_CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000; // re-check every 2 hours while running

function createYtWindow() {
  ytWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1000,
    minHeight: 600,
    icon: ICON_PATH,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload-ytmusic.js'),
      partition: 'persist:ytmusic',
      contextIsolation: true,
    },
  });

  ytWindow.loadURL('https://music.youtube.com');

  ytWindow.webContents.on('console-message', (_event, _level, message, line, sourceId) => {
    console.log('[renderer]', message, `(${sourceId}:${line})`);
  });

  ytWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.log('[preload-error]', preloadPath, error);
  });

  ytWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      ytWindow.hide();
    }
  });
}

function showAndOpenPanel() {
  ytWindow.show();
  ytWindow.focus();
  ytWindow.webContents.send('toggle-panel');
}

function createTray() {
  const icon = nativeImage.createFromPath(ICON_PATH);
  tray = new Tray(icon);
  tray.setToolTip('Vinylcord');

  const menu = Menu.buildFromTemplate([
    { label: 'Open Vinylcord', click: () => ytWindow.show() },
    { label: 'Settings', click: showAndOpenPanel },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
  tray.on('click', () => ytWindow.show());
}

ipcMain.on('now-playing', (_event, track) => {
  lastTrackAt = Date.now();
  lastTrack = track;
  discord.update(track);
  overlay.broadcast(track);
});

ipcMain.handle('get-overlay-url', () => overlay.url());

ipcMain.handle('get-settings', () => settings.all());

ipcMain.on('set-settings', (_event, partial) => {
  settings.update(partial);
});

ipcMain.handle('get-status', () => ({
  discordConnected: discord.isReady(),
  ytmusicConnected: Date.now() - lastTrackAt < 10_000,
  lastTrack,
}));

ipcMain.on('copy-to-clipboard', (_event, text) => {
  clipboard.writeText(text);
});

ipcMain.on('quit-app', () => {
  app.isQuitting = true;
  app.quit();
});

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.on('install-update', () => {
  app.isQuitting = true;
  autoUpdater.quitAndInstall();
});

app.whenReady().then(() => {
  settings = new Settings();
  discord = new DiscordPresence(settings);
  overlay = new OverlayServer();

  createYtWindow();
  createTray();
  discord.connect();
  overlay.start();

  if (app.isPackaged) {
    autoUpdater.on('update-downloaded', () => {
      ytWindow.webContents.send('update-ready');
    });

    const checkForUpdates = () => {
      autoUpdater.checkForUpdatesAndNotify().catch((err) => {
        console.error('[updater] check failed:', err.message);
      });
    };

    checkForUpdates();
    setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL_MS);
  }
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});

app.on('before-quit', () => {
  discord.clear();
  overlay.stop();
});
