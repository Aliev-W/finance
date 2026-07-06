// Generates PNG icons for PWA — no external dependencies needed
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(size, pixelFn) {
  const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c;
    }
    return t;
  })();

  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.allocUnsafe(4);
    len.writeUInt32BE(data.length, 0);
    const typeB = Buffer.from(type, 'ascii');
    const crcVal = Buffer.allocUnsafe(4);
    crcVal.writeUInt32BE(crc32(Buffer.concat([typeB, data])), 0);
    return Buffer.concat([len, typeB, data, crcVal]);
  }

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const raw = Buffer.allocUnsafe(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y, size);
      const i = y * (1 + size * 4) + 1 + x * 4;
      raw[i] = r; raw[i+1] = g; raw[i+2] = b; raw[i+3] = a;
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function iconPixel(x, y, s) {
  const cx = s / 2, cy = s / 2;
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  const rad = s * 0.185;

  // Rounded corners (transparent)
  function corner(cx2, cy2) {
    return x > cx2 - rad && x < cx2 + rad && y > cy2 - rad && y < cy2 + rad
      && Math.sqrt((x - cx2) ** 2 + (y - cy2) ** 2) > rad;
  }
  if (corner(rad, rad) || corner(s - rad, rad) || corner(rad, s - rad) || corner(s - rad, s - rad))
    return [0, 0, 0, 0];

  const coinR = s * 0.38;
  if (dist > coinR) return [30, 64, 175, 255];       // dark blue bg #1e40af
  if (dist > coinR * 0.88) return [217, 119, 6, 255]; // dark gold ring
  return [251, 191, 36, 255];                         // gold coin #fbbf24
}

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

[
  ['pwa-192x192.png', 192],
  ['pwa-512x512.png', 512],
  ['apple-touch-icon.png', 180],
].forEach(([name, size]) => {
  fs.writeFileSync(path.join(publicDir, name), createPNG(size, iconPixel));
  console.log(`  icon: ${name}`);
});
