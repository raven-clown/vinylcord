const TOGGLE_IDS = ['showProgressBar', 'showTimestamps', 'showListenAlongButton', 'showLyrics'];

function fmt(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ':' + String(s).padStart(2, '0');
}

async function init() {
  const settings = await window.vinylcord.getSettings();

  document.getElementById('statusLine').value = settings.statusLine || '';
  for (const id of TOGGLE_IDS) {
    document.getElementById(id).checked = Boolean(settings[id]);
  }

  document.getElementById('statusLine').addEventListener('input', (e) => {
    window.vinylcord.setSettings({ statusLine: e.target.value });
  });

  for (const id of TOGGLE_IDS) {
    document.getElementById(id).addEventListener('change', (e) => {
      window.vinylcord.setSettings({ [id]: e.target.checked });
    });
  }

  const overlayUrl = await window.vinylcord.getOverlayUrl();
  document.getElementById('overlay-url').value = overlayUrl;
  document.getElementById('copy-overlay-url').addEventListener('click', () => {
    window.vinylcord.copyToClipboard(overlayUrl);
    const btn = document.getElementById('copy-overlay-url');
    btn.textContent = 'Copied';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1200);
  });

  document.getElementById('quit-link').addEventListener('click', () => {
    window.close();
  });

  window.vinylcord.onNowPlaying(renderPreview);
  pollStatus();
  setInterval(pollStatus, 3000);
}

function renderPreview(track) {
  const art = document.getElementById('preview-art');
  const title = document.getElementById('preview-title');
  const artist = document.getElementById('preview-artist');
  const fill = document.getElementById('preview-progress-fill');
  const elapsed = document.getElementById('preview-elapsed');
  const duration = document.getElementById('preview-duration');
  const lyricRow = document.getElementById('preview-lyric-row');
  const lyric = document.getElementById('preview-lyric');

  if (!track || !track.title) {
    title.textContent = 'Nothing playing';
    artist.textContent = 'Open YouTube Music to start';
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
  const status = await window.vinylcord.getStatus();

  const discordDot = document.getElementById('discord-dot');
  const discordStatus = document.getElementById('discord-status');
  if (status.discordConnected) {
    discordDot.style.background = '#23a55a';
    discordStatus.style.color = '#23a55a';
    discordStatus.textContent = 'Connected';
  } else {
    discordDot.style.background = '#f0b232';
    discordStatus.style.color = '#f0b232';
    discordStatus.textContent = 'Waiting';
  }

  const ytmDot = document.getElementById('ytm-dot');
  const ytmStatus = document.getElementById('ytm-status');
  if (status.ytmusicConnected) {
    ytmDot.style.background = '#23a55a';
    ytmStatus.style.color = '#23a55a';
    ytmStatus.textContent = 'Connected';
  } else {
    ytmDot.style.background = '#f0b232';
    ytmStatus.style.color = '#f0b232';
    ytmStatus.textContent = 'Waiting';
  }

  if (status.lastTrack) {
    renderPreview(status.lastTrack);
  }
}

init();
