const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const iconSrc = 'C:\\Users\\Claudinei Lima\\.gemini\\antigravity-ide\\brain\\d465eea7-4a9d-4608-8328-bc6678bb4696\\.user_uploaded\\media_1791253509883.jpg';
const capaSrc = 'C:\\Users\\Claudinei Lima\\.gemini\\antigravity-ide\\brain\\d465eea7-4a9d-4608-8328-bc6678bb4696\\.user_uploaded\\media_1791253509906.png';

console.log('Icon source exists:', fs.existsSync(iconSrc));
console.log('Capa source exists:', fs.existsSync(capaSrc));

const iconB64 = fs.readFileSync(iconSrc).toString('base64');
const capaB64 = fs.readFileSync(capaSrc).toString('base64');

// HTML that uses canvas to export WebP, JPEG, and resized PNGs
const htmlContent = `<!DOCTYPE html>
<html>
<body>
<div id="output">PROCESSING</div>
<script>
async function run() {
  const results = {};

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function renderToCanvas(img, w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    return canvas;
  }

  const iconImg = await loadImage("data:image/jpeg;base64,${iconB64}");
  const capaImg = await loadImage("data:image/png;base64,${capaB64}");

  // Icon outputs
  const iconCanvas1024 = renderToCanvas(iconImg, 1024, 1024);
  results['icone_png'] = iconCanvas1024.toDataURL('image/png');

  const iconCanvas512 = renderToCanvas(iconImg, 512, 512);
  results['icon_512'] = iconCanvas512.toDataURL('image/png');

  const iconCanvas192 = renderToCanvas(iconImg, 192, 192);
  results['icon_192'] = iconCanvas192.toDataURL('image/png');

  const iconCanvas180 = renderToCanvas(iconImg, 180, 180);
  results['apple_touch'] = iconCanvas180.toDataURL('image/png');

  const iconCanvas48 = renderToCanvas(iconImg, 48, 48);
  results['favicon_48'] = iconCanvas48.toDataURL('image/png');

  const iconCanvas32 = renderToCanvas(iconImg, 32, 32);
  results['favicon_32'] = iconCanvas32.toDataURL('image/png');

  const iconCanvas16 = renderToCanvas(iconImg, 16, 16);
  results['favicon_16'] = iconCanvas16.toDataURL('image/png');

  // Capa outputs
  const capaCanvas = renderToCanvas(capaImg, capaImg.width, capaImg.height);
  results['capa_webp'] = capaCanvas.toDataURL('image/webp', 0.95);
  results['capa_jpg'] = capaCanvas.toDataURL('image/jpeg', 0.95);
  results['capa_png'] = capaCanvas.toDataURL('image/png');

  document.getElementById('output').innerText = JSON.stringify(results);
}
run().catch(e => {
  document.getElementById('output').innerText = 'ERROR: ' + e.message;
});
</script>
</body>
</html>`;

const tempHtmlPath = path.resolve('temp_img_gen.html');
fs.writeFileSync(tempHtmlPath, htmlContent);

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const cmd = `"${edgePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --dump-dom "file://${tempHtmlPath.replace(/\\\\/g, '/')}"`;

console.log('Running Edge to generate images...');
const out = execSync(cmd, { maxBuffer: 100 * 1024 * 1024, encoding: 'utf8' });
fs.unlinkSync(tempHtmlPath);

// Extract JSON from output div
const match = out.match(/<div id="output">([\s\S]*?)<\/div>/);
if (!match) {
  console.error('Could not find output div in DOM!');
  process.exit(1);
}

const rawJson = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
if (rawJson.startsWith('ERROR:')) {
  console.error('Browser script error:', rawJson);
  process.exit(1);
}

const data = JSON.parse(rawJson);

function saveBase64(dataUri, destPath) {
  const base64Data = dataUri.replace(/^data:image\/[a-z]+;base64,/, '');
  fs.writeFileSync(destPath, Buffer.from(base64Data, 'base64'));
  console.log(`Saved ${destPath} (${fs.statSync(destPath).size} bytes)`);
}

// 1. Capa files
saveBase64(data.capa_webp, 'src/assets/capa.webp');
saveBase64(data.capa_webp, 'public/capa.webp');
saveBase64(data.capa_jpg, 'src/assets/capa.jpg');
saveBase64(data.capa_jpg, 'public/capa.jpg');
saveBase64(data.capa_png, 'src/assets/capa.png');
saveBase64(data.capa_png, 'public/capa.png');

// 2. Icon files
saveBase64(data.icone_png, 'src/assets/icone.png');
saveBase64(data.icone_png, 'public/icone.png');
saveBase64(data.icon_512, 'public/icon-512.png');
saveBase64(data.icon_192, 'public/icon-192.png');
saveBase64(data.apple_touch, 'public/apple-touch-icon.png');
saveBase64(data.favicon_48, 'public/favicon.png');
saveBase64(data.favicon_32, 'public/favicon-32x32.png');
saveBase64(data.favicon_16, 'public/favicon-16x16.png');

// 3. Build favicon.ico (ICO file wrapping 32x32 and 16x16 PNG)
const b32 = fs.readFileSync('public/favicon-32x32.png');
const b16 = fs.readFileSync('public/favicon-16x16.png');

const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // Reserved
icoHeader.writeUInt16LE(1, 2); // ICO type
icoHeader.writeUInt16LE(2, 4); // 2 images

const dirEntry1 = Buffer.alloc(16);
dirEntry1.writeUInt8(32, 0); // Width
dirEntry1.writeUInt8(32, 1); // Height
dirEntry1.writeUInt8(0, 2);  // Colors
dirEntry1.writeUInt8(0, 3);  // Reserved
dirEntry1.writeUInt16LE(1, 4); // Planes
dirEntry1.writeUInt16LE(32, 6); // Bits per pixel
dirEntry1.writeUInt32LE(b32.length, 8); // Size
dirEntry1.writeUInt32LE(6 + 16 * 2, 12); // Offset: header (6) + 2 entries (32) = 38

const dirEntry2 = Buffer.alloc(16);
dirEntry2.writeUInt8(16, 0); // Width
dirEntry2.writeUInt8(16, 1); // Height
dirEntry2.writeUInt8(0, 2);  // Colors
dirEntry2.writeUInt8(0, 3);  // Reserved
dirEntry2.writeUInt16LE(1, 4); // Planes
dirEntry2.writeUInt16LE(32, 6); // Bits per pixel
dirEntry2.writeUInt32LE(b16.length, 8); // Size
dirEntry2.writeUInt32LE(6 + 16 * 2 + b32.length, 12); // Offset

const icoBuf = Buffer.concat([icoHeader, dirEntry1, dirEntry2, b32, b16]);
fs.writeFileSync('public/favicon.ico', icoBuf);
console.log(`Saved public/favicon.ico (${icoBuf.length} bytes)`);

console.log('Image generation completed successfully!');
