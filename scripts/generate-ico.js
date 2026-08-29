// Wraps assets/icon.png into a Windows .ico container. Modern Windows
// (Vista+) accepts a PNG-encoded image inside an ICO directly, so no
// image re-encoding is needed - just the ICONDIR/ICONDIRENTRY header.
const fs = require('fs');
const path = require('path');

const PNG_PATH = path.join(__dirname, '..', 'assets', 'icon.png');
const ICO_PATH = path.join(__dirname, '..', 'assets', 'icon.ico');

const png = fs.readFileSync(PNG_PATH);

// Read width/height straight out of the PNG IHDR chunk (bytes 16-23).
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: 1 = icon
header.writeUInt16LE(1, 4); // image count

const entry = Buffer.alloc(16);
entry.writeUInt8(width >= 256 ? 0 : width, 0);
entry.writeUInt8(height >= 256 ? 0 : height, 1);
entry.writeUInt8(0, 2); // color palette
entry.writeUInt8(0, 3); // reserved
entry.writeUInt16LE(1, 4); // color planes
entry.writeUInt16LE(32, 6); // bits per pixel
entry.writeUInt32LE(png.length, 8); // image data size
entry.writeUInt32LE(header.length + entry.length, 12); // offset

fs.writeFileSync(ICO_PATH, Buffer.concat([header, entry, png]));
console.log('Wrote', ICO_PATH);
