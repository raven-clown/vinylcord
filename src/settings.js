const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULTS = {
  statusLine: 'Listening to',
  showProgressBar: true,
  showTimestamps: true,
  showListenAlongButton: true,
  showLyrics: true,
  togglePos: null,
};

class Settings {
  constructor() {
    this.file = path.join(app.getPath('userData'), 'settings.json');
    this.data = { ...DEFAULTS, ...this._read() };
  }

  _read() {
    try {
      return JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch {
      return {};
    }
  }

  all() {
    return this.data;
  }

  update(partial) {
    this.data = { ...this.data, ...partial };
    fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
    return this.data;
  }
}

module.exports = Settings;
