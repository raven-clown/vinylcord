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
  const imgEl = document.querySelector('img.image.ytmusic-player-bar');

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

function fmt(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ':' + String(s).padStart(2, '0');
}

const PANEL_HTML = `
<div id="vc-toggle" title="Vinylcord">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff"><path d="M8 5v14l11-7z"/></svg>
</div>
<div id="vc-panel">
  <div id="vc-titlebar">
    <div id="vc-mark">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="#ffffff"><path d="M8 5v14l11-7z"/></svg>
    </div>
    <span id="vc-name">Vinylcord</span>
    <div id="vc-close" title="Close">
      <svg width="12" height="12" viewBox="0 0 24 24" stroke="#949ba4" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>
    </div>
  </div>

  <div id="vc-body">

    <div>
      <div class="vc-label">Connections</div>
      <div class="vc-conn-row">
        <div class="vc-left">
          <div class="vc-badge" style="background:#5865F2;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <span style="font-weight:500;">Discord</span>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <div class="vc-dot" id="vc-discord-dot"></div>
          <span class="vc-status" id="vc-discord-status">Connecting</span>
        </div>
      </div>
      <div class="vc-conn-row">
        <div class="vc-left">
          <div class="vc-badge" style="background:#ED4245;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#ffffff"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <span style="font-weight:500;">YouTube Music</span>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <div class="vc-dot" id="vc-ytm-dot"></div>
          <span class="vc-status" id="vc-ytm-status">Waiting</span>
        </div>
      </div>
    </div>

    <div>
      <div class="vc-label">Display Options</div>
      <div class="vc-toggle-row">
        <span>Show timestamps</span>
        <label class="vc-switch"><input type="checkbox" id="vc-showTimestamps"><span class="vc-slider"></span></label>
      </div>
      <div class="vc-toggle-row">
        <span>Show "Listen Along" button</span>
        <label class="vc-switch"><input type="checkbox" id="vc-showListenAlongButton"><span class="vc-slider"></span></label>
      </div>
      <div class="vc-toggle-row">
        <span>Show lyrics when available</span>
        <label class="vc-switch"><input type="checkbox" id="vc-showLyrics"><span class="vc-slider"></span></label>
      </div>
    </div>

    <div>
      <div class="vc-label">Streaming Overlay</div>
      <div class="vc-hint" style="margin-top:0; margin-bottom:6px;">Add this as a Browser Source in OBS or Streamlabs to show a live spinning-vinyl widget on stream.</div>
      <div style="display:flex; gap:6px;">
        <input type="text" id="vc-overlay-url" readonly value="">
        <button id="vc-copy-overlay-url">Copy</button>
      </div>
    </div>

    <div>
      <div class="vc-label">Preview</div>
      <div class="vc-preview-card">
        <div class="vc-preview-top">
          <div class="vc-art" id="vc-preview-art"></div>
          <div style="min-width:0; flex:1; padding-top:1px;">
            <div id="vc-preview-eyebrow" style="font-size:10px; color:#949ba4; text-transform:uppercase; letter-spacing:0.02em;">Listening to YouTube Music</div>
            <div id="vc-preview-title" class="vc-ellipsis" style="font-size:13px; font-weight:600; color:#f2f3f5; margin-top:3px;">Nothing playing</div>
            <div id="vc-preview-artist" class="vc-ellipsis" style="font-size:12px; color:#949ba4; margin-top:1px;">Play something to see it here</div>
          </div>
        </div>
        <div class="vc-progress-track">
          <div class="vc-progress-fill" id="vc-preview-progress-fill"></div>
        </div>
        <div class="vc-time-row">
          <span class="vc-tnum" id="vc-preview-elapsed">0:00</span>
          <span class="vc-tnum" id="vc-preview-duration">0:00</span>
        </div>
        <div class="vc-lyric-row" id="vc-preview-lyric-row">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5865F2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          <span id="vc-preview-lyric" class="vc-ellipsis"></span>
        </div>
      </div>
    </div>

  </div>

  <div id="vc-footer">
    <span style="font-size:11px; color:#6d6f78;">v0.1.0</span>
    <span id="vc-quit" style="font-size:12px; font-weight:500; color:#f23f42; cursor:pointer;">Quit</span>
  </div>
</div>
`;

const PANEL_CSS = `
#vc-host, #vc-host * {
  box-sizing: border-box !important;
}
#vc-toggle {
  position: fixed; z-index: 2147483000;
  width: 48px; height: 48px; border-radius: 50%; background: #ED4245;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4); cursor: grab;
  font-family: -apple-system, "Segoe UI", system-ui, "Helvetica Neue", sans-serif;
  user-select: none; touch-action: none;
}
#vc-toggle svg { pointer-events: none; -webkit-user-drag: none; }
#vc-toggle.vc-dragging { cursor: grabbing; box-shadow: 0 6px 20px rgba(0,0,0,0.55); }
#vc-panel {
  position: fixed; width: 300px; max-height: min(70vh, 560px); z-index: 2147483001;
  background: #1e1f22; box-shadow: 0 16px 40px rgba(0,0,0,0.55);
  border-radius: 12px; overflow: hidden;
  display: flex; flex-direction: column;
  opacity: 0; transform: scale(0.94); pointer-events: none;
  transform-origin: bottom right;
  transition: opacity 0.15s ease, transform 0.15s ease;
  font-family: -apple-system, "Segoe UI", system-ui, "Helvetica Neue", sans-serif;
  font-size: 13px; color: #dbdee1;
}
#vc-panel.vc-open { opacity: 1; transform: scale(1); pointer-events: auto; }
#vc-titlebar {
  height: 40px; background: #2b2d31; display: flex; align-items: center; gap: 8px;
  padding: 0 10px 0 14px; flex-shrink: 0; cursor: grab; user-select: none; touch-action: none;
}
#vc-titlebar.vc-dragging { cursor: grabbing; }
#vc-mark { width: 20px; height: 20px; border-radius: 6px; background: #ED4245; display: flex; align-items: center; justify-content: center; }
#vc-name { font-size: 14px; font-weight: 600; color: #f2f3f5; flex: 1; }
#vc-close { width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
#vc-body { padding: 14px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; overflow-x: hidden; flex: 1; min-height: 0; }
#vc-body::-webkit-scrollbar { width: 0; height: 0; background: transparent; }
.vc-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: #949ba4; margin-bottom: 8px; }
.vc-conn-row { background: #2b2d31; border-radius: 8px; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.vc-left { display: flex; align-items: center; gap: 10px; }
.vc-badge { width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.vc-dot { width: 7px; height: 7px; border-radius: 50%; background: #f0b232; }
.vc-status { font-size: 12px; font-weight: 500; color: #f0b232; }
.vc-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 0; }
.vc-switch { position: relative; width: 34px; height: 20px; flex-shrink: 0; display: inline-block; }
.vc-switch input { opacity: 0; width: 0; height: 0; }
.vc-slider { position: absolute; inset: 0; background: #4e5058; border-radius: 10px; cursor: pointer; transition: background 0.15s; }
.vc-slider::before { content: ""; position: absolute; width: 16px; height: 16px; left: 2px; top: 2px; border-radius: 50%; background: #dbdee1; transition: transform 0.15s, background 0.15s; }
.vc-switch input:checked + .vc-slider { background: #5865F2; }
.vc-switch input:checked + .vc-slider::before { transform: translateX(14px); background: #ffffff; }
#vc-panel input[type="text"] { width: 100%; background: #1e1f22; border: 1px solid #3f4147; border-radius: 4px; padding: 9px 10px; color: #dbdee1; font-size: 13px; font-family: inherit; outline: none; }
#vc-panel input[type="text"]:focus { border-color: #5865F2; }
.vc-hint { font-size: 11px; color: #6d6f78; margin-top: 4px; }
#vc-copy-overlay-url { flex-shrink: 0; background: #4e5058; color: #f2f3f5; border: none; border-radius: 4px; padding: 0 12px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; }
.vc-preview-card { background: #2b2d31; border-radius: 8px; padding: 12px; }
.vc-preview-top { display: flex; gap: 10px; align-items: flex-start; }
.vc-art { width: 48px; height: 48px; border-radius: 4px; flex-shrink: 0; background: linear-gradient(135deg, #ff5f5f 0%, #b21ecb 100%); background-size: cover; background-position: center; }
.vc-ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vc-progress-track { height: 3px; border-radius: 1.5px; background: #4e5058; position: relative; margin-top: 8px; }
.vc-progress-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 1.5px; background: #f2f3f5; width: 0%; }
.vc-time-row { display: flex; justify-content: space-between; margin-top: 3px; }
.vc-tnum { font-variant-numeric: tabular-nums; font-size: 10px; color: #949ba4; }
.vc-lyric-row { margin-top: 10px; padding-top: 10px; border-top: 1px solid #1e1f22; display: none; align-items: center; gap: 6px; }
.vc-lyric-row span { font-size: 11px; color: #b5bac1; font-style: italic; }
#vc-footer { padding: 10px 16px; border-top: 1px solid #2b2d31; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
`;

// YouTube Music enforces a Trusted Types CSP, which blocks assigning
// raw strings to innerHTML (and to DOMParser). Register our own policy
// so the panel's markup is allowed through.
let trustedHTML = (s) => s;
if (window.trustedTypes && window.trustedTypes.createPolicy) {
  try {
    const policy = window.trustedTypes.createPolicy('vinylcord', { createHTML: (s) => s });
    trustedHTML = (s) => policy.createHTML(s);
  } catch (err) {
    console.error('[vinylcord] could not register a Trusted Types policy', err);
  }
}

const DRAG_MARGIN = 12;

function clampPosition(x, y, el) {
  const maxX = window.innerWidth - el.offsetWidth - DRAG_MARGIN;
  const maxY = window.innerHeight - el.offsetHeight - DRAG_MARGIN;
  return {
    x: Math.min(Math.max(DRAG_MARGIN, x), Math.max(DRAG_MARGIN, maxX)),
    y: Math.min(Math.max(DRAG_MARGIN, y), Math.max(DRAG_MARGIN, maxY)),
  };
}

// `handle` receives the pointer events; `target` is the element that
// actually gets repositioned (the same element for the toggle button,
// the panel for its title bar). `settingsKey` persists the position.
function makeDraggable(handle, target, settingsKey, onClick) {
  let dragging = false;
  let moved = false;
  let offsetX = 0;
  let offsetY = 0;
  let startX = 0;
  let startY = 0;

  function place(x, y) {
    const clamped = clampPosition(x, y, target);
    target.style.left = clamped.x + 'px';
    target.style.top = clamped.y + 'px';
  }

  ipcRenderer.invoke('get-settings').then((settings) => {
    const saved = settings[settingsKey];
    if (saved) {
      place(saved.x, saved.y);
    }
  });

  handle.addEventListener('pointerdown', (e) => {
    dragging = true;
    moved = false;
    const rect = target.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    startX = e.clientX;
    startY = e.clientY;
    handle.setPointerCapture(e.pointerId);
    handle.classList.add('vc-dragging');
  });

  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    if (Math.abs(e.clientX - startX) > 3 || Math.abs(e.clientY - startY) > 3) {
      moved = true;
    }
    place(e.clientX - offsetX, e.clientY - offsetY);
  });

  handle.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    handle.releasePointerCapture(e.pointerId);
    handle.classList.remove('vc-dragging');
    if (moved) {
      ipcRenderer.send('set-settings', { [settingsKey]: { x: target.offsetLeft, y: target.offsetTop } });
    } else if (onClick) {
      onClick();
    }
  });

  window.addEventListener('resize', () => place(target.offsetLeft, target.offsetTop));

  return { place };
}

function injectPanel() {
  const host = document.createElement('div');
  host.id = 'vc-host';
  host.innerHTML = trustedHTML(`<style>${PANEL_CSS}</style>${PANEL_HTML}`);
  document.documentElement.appendChild(host);

  // YouTube Music is a single-page app that rewrites large parts of the
  // document during startup and navigation — keep re-attaching if it
  // gets swept up in one of those rewrites.
  setInterval(() => {
    if (!document.documentElement.contains(host)) {
      document.documentElement.appendChild(host);
    }
  }, 2000);

  const panel = document.getElementById('vc-panel');
  const toggle = document.getElementById('vc-toggle');
  const titlebar = document.getElementById('vc-titlebar');
  const close = document.getElementById('vc-close');

  const toggleDrag = makeDraggable(toggle, toggle, 'togglePos', () => {
    if (!panel.style.left) {
      const t = toggle.getBoundingClientRect();
      panelDrag.place(t.right - panel.offsetWidth || t.left, t.top - panel.offsetHeight - 12);
    }
    panel.classList.toggle('vc-open');
  });
  toggleDrag.place(window.innerWidth - 68, window.innerHeight - 92);

  const panelDrag = makeDraggable(titlebar, panel, 'panelPos');

  close.addEventListener('click', () => panel.classList.remove('vc-open'));
  ipcRenderer.on('toggle-panel', () => panel.classList.add('vc-open'));

  document.getElementById('vc-quit').addEventListener('click', () => {
    ipcRenderer.send('quit-app');
  });

  const TOGGLE_IDS = ['showTimestamps', 'showListenAlongButton', 'showLyrics'];

  ipcRenderer.invoke('get-settings').then((settings) => {
    for (const id of TOGGLE_IDS) {
      document.getElementById('vc-' + id).checked = Boolean(settings[id]);
    }
  });

  for (const id of TOGGLE_IDS) {
    document.getElementById('vc-' + id).addEventListener('change', (e) => {
      ipcRenderer.send('set-settings', { [id]: e.target.checked });
    });
  }

  ipcRenderer.invoke('get-overlay-url').then((url) => {
    document.getElementById('vc-overlay-url').value = url;
    document.getElementById('vc-copy-overlay-url').addEventListener('click', () => {
      ipcRenderer.send('copy-to-clipboard', url);
      const btn = document.getElementById('vc-copy-overlay-url');
      btn.textContent = 'Copied';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1200);
    });
  });

  function setStatus(dotId, statusId, connected, connectedText, waitingText) {
    const dot = document.getElementById(dotId);
    const label = document.getElementById(statusId);
    dot.style.background = connected ? '#23a55a' : '#f0b232';
    label.style.color = connected ? '#23a55a' : '#f0b232';
    label.textContent = connected ? connectedText : waitingText;
  }

  function updatePreview(track) {
    const art = document.getElementById('vc-preview-art');
    const title = document.getElementById('vc-preview-title');
    const artist = document.getElementById('vc-preview-artist');
    const fill = document.getElementById('vc-preview-progress-fill');
    const elapsed = document.getElementById('vc-preview-elapsed');
    const duration = document.getElementById('vc-preview-duration');
    const lyricRow = document.getElementById('vc-preview-lyric-row');
    const lyric = document.getElementById('vc-preview-lyric');

    if (!track || !track.title) {
      title.textContent = 'Nothing playing';
      artist.textContent = 'Play something to see it here';
      art.style.backgroundImage = '';
      fill.style.width = '0%';
      elapsed.textContent = '0:00';
      duration.textContent = '0:00';
      lyricRow.style.display = 'none';
      return;
    }

    title.textContent = track.title;
    artist.textContent = track.artist || '';
    art.style.backgroundImage = track.artwork ? `url(${track.artwork})` : '';

    const pct = track.durationSec > 0 ? Math.min(100, (track.positionSec / track.durationSec) * 100) : 0;
    fill.style.width = pct + '%';
    elapsed.textContent = fmt(track.positionSec);
    duration.textContent = fmt(track.durationSec);

    if (track.lyrics) {
      lyric.textContent = track.lyrics;
      lyricRow.style.display = 'flex';
    } else {
      lyricRow.style.display = 'none';
    }
  }

  async function pollStatus() {
    const status = await ipcRenderer.invoke('get-status');
    setStatus('vc-discord-dot', 'vc-discord-status', status.discordConnected, 'Connected', 'Waiting');
    setStatus('vc-ytm-dot', 'vc-ytm-status', status.ytmusicConnected, 'Connected', 'Waiting');
  }

  pollStatus();
  setInterval(pollStatus, 3000);

  return updatePreview;
}

let updatePreview = null;

function boot() {
  if (!document.documentElement) {
    setTimeout(boot, 200);
    return;
  }
  updatePreview = injectPanel();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

let lastSent = null;
setInterval(() => {
  const data = readNowPlaying();
  const key = JSON.stringify(data);
  if (key !== lastSent) {
    lastSent = key;
    ipcRenderer.send('now-playing', data);
  }
  if (updatePreview) updatePreview(data);
}, 2000);
