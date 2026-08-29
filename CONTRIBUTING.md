# Contributing to Vinylcord

Pull requests are welcome. This project is small on purpose, so please open an issue before starting on anything bigger than a small fix, just so two people don't end up building the same thing.

## Setup

```bash
git clone <this repo>
cd vinylcord
npm install
npm start
```

You'll need a Discord application ID to see Rich Presence updates, see the README's "Getting started" section for how to get one.

## Where things live

- `src/main.js` — the Electron main process: windows, tray, wiring everything together
- `src/preload-ytmusic.js` — reads now-playing state out of the YouTube Music page. This is the part most likely to need a fix if Google changes the player's markup
- `src/discordPresence.js` — talks to Discord over RPC
- `src/overlayServer.js` and `src/overlay/overlay.html` — the local server and page for the OBS/Streamlabs overlay
- `src/windows/` — the Settings window (HTML/CSS/JS, no framework)

## Before opening a PR

- Keep changes focused. A PR that fixes one thing is much easier to review than one that fixes three.
- If you touched playback detection, mention what you tested it with (a specific song, a playlist, radio, etc.) since YouTube Music's DOM isn't documented anywhere and behavior can vary.
- No build step or test suite yet, so at minimum run the app and confirm it still starts and updates presence.
