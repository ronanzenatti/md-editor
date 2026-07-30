import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.whenReady().then(async () => {
  try {
    const svgPath = path.join(__dirname, '..', 'frontend', 'public', 'md-document-pencil.svg');
    const svgUrl = 'file:///' + svgPath.replace(/\\/g, '/');

    const win = new BrowserWindow({
      width: 512,
      height: 512,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    await win.loadURL(svgUrl);
    await new Promise(r => setTimeout(r, 500));

    const assetsDir = path.join(__dirname, '..', 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    const fullImage = await win.webContents.capturePage();
    fs.writeFileSync(path.join(assetsDir, 'icon.png'), fullImage.toPNG());

    const sizes = [16, 32, 48, 64, 128, 256];
    const pngItems = [];

    for (const size of sizes) {
      const resized = fullImage.resize({ width: size, height: size });
      pngItems.push({ size, buffer: resized.toPNG() });
    }

    const icoBuffer = createIcoFromPngs(pngItems);
    fs.writeFileSync(path.join(assetsDir, 'icon.ico'), icoBuffer);

    console.log('SUCCESS: Generated assets/icon.ico and assets/icon.png');
  } catch (err) {
    console.error('ERROR generating icons:', err);
  } finally {
    app.quit();
  }
});

function createIcoFromPngs(pngItems) {
  const count = pngItems.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + count * dirEntrySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const entries = [];
  const imageBuffers = [];

  for (const item of pngItems) {
    const buf = item.buffer;
    const entry = Buffer.alloc(dirEntrySize);

    const w = item.size >= 256 ? 0 : item.size;
    const h = item.size >= 256 ? 0 : item.size;

    entry.writeUInt8(w, 0);
    entry.writeUInt8(h, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buf.length, 8);
    entry.writeUInt32LE(offset, 12);

    entries.push(entry);
    imageBuffers.push(buf);

    offset += buf.length;
  }

  return Buffer.concat([header, ...entries, ...imageBuffers]);
}
