# Vinylcord

Show what's playing on YouTube Music as a live status on Discord, with a spinning-vinyl overlay you can drop straight into OBS.

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)
![Built with Electron](https://img.shields.io/badge/built%20with-Electron-47848F)

![Vinylcord settings window](assets/screenshots/settings.png)

## What it does

Vinylcord is a small desktop app that wraps YouTube Music. Open it, sign in like you normally would, and it quietly reads what's playing and pushes it out in two places:

- **Discord Rich Presence** — song, artist, a real elapsed/duration bar, and a "Listen Along" button that opens the track.
- **A streaming overlay** — a spinning vinyl record, an animated waveform, and the current lyric line, served as a local page you can drop into OBS or Streamlabs as a Browser Source.

![Overlay widget on a stream background](assets/screenshots/overlay.png)

## Why a desktop app instead of a browser extension

Discord Rich Presence only talks to a local app over IPC, and a browser extension can't reach that on its own. Vinylcord just wraps the real music.youtube.com in an Electron window, so there's nothing extra to install and no separate server to run by hand.

## Getting started

You'll need [Node.js](https://nodejs.org) 18 or newer.

```bash
git clone <this repo>
cd vinylcord
npm install
```

### 1. Create a Discord application

Rich Presence needs a Discord application ID:

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create a new application.
2. Copy its **Application ID** from the General Information page.
3. Set it as an environment variable before starting the app:

   ```bash
   # Windows (PowerShell)
   $env:DISCORD_CLIENT_ID = "your application id"

   # macOS / Linux
   export DISCORD_CLIENT_ID="your application id"
   ```

### 2. Run it

```bash
npm start
```

Vinylcord opens YouTube Music in its own window and a tray icon appears. Sign in, play something, and your Discord status should update within a few seconds.

## Settings

Click the tray icon to open Settings. From there you can:

- Turn the elapsed/duration bar and the "Listen Along" button on or off
- Replace the default "Listening to" line with your own text
- Show the current lyric line instead of the artist, when the lyrics panel is open in YouTube Music
- Copy the overlay URL to paste into OBS

## Using the stream overlay

1. Open Settings and copy the overlay URL (`http://localhost:39231/overlay` by default).
2. In OBS: **Sources → Add → Browser Source**, paste the URL, and set the size to roughly 340×480.
3. Leave "Shutdown source when not visible" unchecked so it keeps updating between scenes.

The widget stays invisible whenever nothing is playing, so it's safe to leave sitting on a scene permanently.

## What Discord can and can't actually show

Discord renders Rich Presence itself, so a third-party app can only hand it text, a static image, timestamps, and up to two buttons. The vinyl spin and waveform only exist in Vinylcord's own overlay and settings preview, not inside Discord's profile card. The card does get a real, live elapsed-time bar (Discord draws that natively from timestamps) and can show the current lyric line as text, updating every couple of seconds.

## A note on YouTube Music's DOM

YouTube Music has no public "now playing" API, so Vinylcord reads the page's own elements directly. That's inherently a little fragile: if Google changes the player's markup, playback detection can break. If that happens, `src/preload-ytmusic.js` is the only file that should need fixing.

## License

MIT, see [LICENSE](LICENSE).
