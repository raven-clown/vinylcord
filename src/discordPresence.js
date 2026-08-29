const RPC = require('@xhayper/discord-rpc');

// This is the public Discord Application ID for Vinylcord itself - not
// a secret (Rich Presence IDs are meant to be embedded in shipped
// apps, the same way every user's Spotify shares one App ID). Set
// DISCORD_CLIENT_ID to point at your own Discord application instead.
const DEFAULT_CLIENT_ID = '1324729144424271974';
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || DEFAULT_CLIENT_ID;

const PAUSE_CLEAR_MS = 10 * 60 * 1000; // clear the status after this long paused

class DiscordPresence {
  constructor(settings) {
    this.settings = settings;
    this.client = null;
    this.ready = false;
    this.pausedSince = null;
    this.clearedForIdle = false;
  }

  connect() {
    if (!CLIENT_ID) {
      console.warn('[discord] No DISCORD_CLIENT_ID set. Create a Discord application and set the ID before presence will show up.');
      return;
    }

    this.client = new RPC.Client({ clientId: CLIENT_ID });

    this.client.on('ready', () => {
      this.ready = true;
      console.log('[discord] Connected as', this.client.user?.username);
    });

    this.client.on('disconnected', () => {
      this.ready = false;
    });

    this.client.login().catch((err) => {
      console.error('[discord] Failed to connect:', err.message);
    });
  }

  isReady() {
    return this.ready;
  }

  async update(track) {
    if (!this.ready || !this.client?.user) return;

    if (!track || !track.title) {
      await this.client.user.clearActivity().catch(() => {});
      this.pausedSince = null;
      this.clearedForIdle = false;
      return;
    }

    if (track.isPaused) {
      if (this.pausedSince == null) this.pausedSince = Date.now();
      if (Date.now() - this.pausedSince >= PAUSE_CLEAR_MS) {
        if (!this.clearedForIdle) {
          await this.client.user.clearActivity().catch(() => {});
          this.clearedForIdle = true;
          console.log('[discord] cleared status after being paused a while');
        }
        return;
      }
    } else {
      this.pausedSince = null;
      this.clearedForIdle = false;
    }

    const cfg = this.settings.all();
    const activity = {
      type: 2, // Listening
      details: track.title.slice(0, 128),
      state: (track.artist || 'Unknown artist').slice(0, 128),
      largeImageKey: track.artwork || undefined,
      largeImageText: (track.album || track.title).slice(0, 128),
      smallImageKey: track.isPaused ? 'pause' : 'play',
      smallImageText: track.isPaused ? 'Paused' : 'Playing',
      instance: false,
    };

    if (cfg.showLyrics && track.lyrics) {
      activity.state = track.lyrics.slice(0, 128);
    }

    if (cfg.showTimestamps && track.durationSec > 0 && !track.isPaused) {
      const now = Date.now();
      activity.startTimestamp = Math.round(now - track.positionSec * 1000);
      activity.endTimestamp = Math.round(now + (track.durationSec - track.positionSec) * 1000);
    }

    if (cfg.showListenAlongButton && track.url) {
      activity.buttons = [{ label: 'Listen Along', url: track.url }];
    }

    console.log('[discord] setting activity:', JSON.stringify(activity));
    await this.client.user.setActivity(activity)
      .then(() => console.log('[discord] activity accepted'))
      .catch((err) => {
        console.error('[discord] setActivity failed:', err.message);
      });
  }

  async clear() {
    if (this.ready && this.client?.user) {
      await this.client.user.clearActivity().catch(() => {});
    }
  }
}

module.exports = DiscordPresence;
