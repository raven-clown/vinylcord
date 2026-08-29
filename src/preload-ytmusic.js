const { ipcRenderer } = require('electron');

// YouTube Music has no public API for "now playing" — this reads the
// page's own DOM and video element. Selectors can break if Google
// changes the layout; this file is the only place that should need
// updating when that happens.

function readLyrics() {
  const shelf = document.querySelector('ytmusic-description-shelf-renderer');
  if (!shelf) return null;
  const text = shelf.textContent?.trim();
  return text ? text.slice(0, 128) : null;
}

function readNowPlaying() {
  const video = document.querySelector('video');
  const titleEl = document.querySelector('.title.ytmusic-player-bar');
  const bylineEl = document.querySelector('.byline.ytmusic-player-bar');
  const imgEl = document.querySelector('.image.ytmusic-player-bar img');

  const title = titleEl?.textContent?.trim();
  if (!video || !title) return null;

  const bylineParts = bylineEl
    ? bylineEl.textContent.split('•').map((s) => s.trim()).filter(Boolean)
    : [];

  const videoIdMatch = location.href.match(/[?&]v=([^&]+)/);

  return {
    title,
    artist: bylineParts[0] || '',
    album: bylineParts[1] || '',
    artwork: imgEl?.src && imgEl.src.startsWith('http') ? imgEl.src : null,
    isPaused: video.paused,
    positionSec: Number.isFinite(video.currentTime) ? video.currentTime : 0,
    durationSec: Number.isFinite(video.duration) ? video.duration : 0,
    url: videoIdMatch ? `https://music.youtube.com/watch?v=${videoIdMatch[1]}` : null,
    lyrics: readLyrics(),
  };
}

let lastSent = null;
setInterval(() => {
  const data = readNowPlaying();
  const key = JSON.stringify(data);
  if (key !== lastSent) {
    lastSent = key;
    ipcRenderer.send('now-playing', data);
  }
}, 2000);
