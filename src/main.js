const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron');
const path = require('path');
const DiscordPresence = require('./discordPresence');
const OverlayServer = require('./overlayServer');
const Settings = require('./settings');

let ytWindow;
let settingsWindow;
let tray;
let settings;
let discord;
let overlay;
let lastTrackAt = 0;
let lastTrack = null;

const ICON_PATH = path.join(__dirname, '..', 'assets', 'icon.png');

function createYtWindow() {
  ytWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    icon: ICON_PATH,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload-ytmusic.js'),
      partition: 'persist:ytmusic',
      contextIsolation: true,
    },
  });

  ytWindow.loadURL('https://music.youtube.com');

  ytWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      ytWindow.hide();
    }
  });
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 380,
    height: 760,
    resizable: false,
    icon: ICON_PATH,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'windows', 'settings-preload.js'),
      contextIsolation: true,
    },
  });

  settingsWindow.setMenu(null);
  settingsWindow.loadFile(path.join(__dirname, 'windows', 'settings.html'));
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(ICON_PATH);
  tray = new Tray(icon);
  tray.setToolTip('Vinylcord');

  const menu = Menu.buildFromTemplate([
    { label: 'Open YouTube Music', click: () => ytWindow.show() },
    { label: 'Settings', click: createSettingsWindow },
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
  if (settingsWindow) {
    settingsWindow.webContents.send('now-playing-preview', track);
  }
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

app.whenReady().then(() => {
  settings = new Settings();
  discord = new DiscordPresence(settings);
  overlay = new OverlayServer();

  createYtWindow();
  createTray();
  discord.connect();
  overlay.start();
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});

app.on('before-quit', () => {
  discord.clear();
  overlay.stop();
});
