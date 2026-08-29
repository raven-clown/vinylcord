const { contextBridge, ipcRenderer, clipboard } = require('electron');

contextBridge.exposeInMainWorld('vinylcord', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (partial) => ipcRenderer.send('set-settings', partial),
  getStatus: () => ipcRenderer.invoke('get-status'),
  getOverlayUrl: () => ipcRenderer.invoke('get-overlay-url'),
  copyToClipboard: (text) => clipboard.writeText(text),
  onNowPlaying: (callback) => {
    ipcRenderer.on('now-playing-preview', (_event, track) => callback(track));
  },
});
