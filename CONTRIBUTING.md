# Contributing to Vinylcord

Pull requests are welcome. This project is small on purpose, so please open an issue before starting on anything bigger than a small fix, just so two people don't end up building the same thing.

## Setup

```bash
git clone https://github.com/raven-clown/vinylcord.git
cd vinylcord
npm install
npm start
```

That runs against the shared default Discord application, so Rich Presence works immediately. See the README's "Building from source" section if you want to point it at your own Discord application instead.

## Where things live

- `src/main.js` — the Electron main process: windows, tray, wiring everything together
- `src/preload-ytmusic.js` — reads now-playing state out of the YouTube Music page and injects the settings panel into it. This is the part most likely to need a fix if Google changes the player's markup
- `src/discordPresence.js` — talks to Discord over RPC
- `src/overlayServer.js` and `src/overlay/overlay.html` — the local server and page for the OBS/Streamlabs overlay
- `scripts/afterPack.js` — sets the app icon during packaging (see the comment in there for why this isn't left to electron-builder's default)

## Before opening a PR

- Keep changes focused. A PR that fixes one thing is much easier to review than one that fixes three.
- If you touched playback detection, mention what you tested it with (a specific song, a playlist, radio, etc.) since YouTube Music's DOM isn't documented anywhere and behavior can vary.
- No build step or test suite yet, so at minimum run the app and confirm it still starts and updates presence.
