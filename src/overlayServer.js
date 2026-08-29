const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const OVERLAY_HTML = path.join(__dirname, 'overlay', 'overlay.html');

class OverlayServer {
  constructor(port = 39231) {
    this.port = port;
    this.clients = new Set();
    this.lastTrack = null;
    this.server = null;
    this.wss = null;
  }

  start() {
    this.server = http.createServer((req, res) => this._handleRequest(req, res));
    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      if (this.lastTrack) ws.send(JSON.stringify(this.lastTrack));
      ws.on('close', () => this.clients.delete(ws));
    });

    this.server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[overlay] port ${this.port} is already in use (another Vinylcord instance running?) - overlay disabled for this session`);
      } else {
        console.error('[overlay] server error:', err.message);
      }
      this.server = null;
    });

    this.server.listen(this.port);
  }

  stop() {
    this.wss?.close();
    this.server?.close();
  }

  _handleRequest(req, res) {
    if (req.url === '/' || req.url === '/overlay') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(OVERLAY_HTML));
      return;
    }
    res.writeHead(404);
    res.end('Not found');
  }

  broadcast(track) {
    this.lastTrack = track;
    const payload = JSON.stringify(track);
    for (const ws of this.clients) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
  }

  url() {
    return `http://localhost:${this.port}/overlay`;
  }
}

module.exports = OverlayServer;
