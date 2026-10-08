import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateIcons() {
  const pubDir = path.join(process.cwd(), 'public');
  const srcIcon = path.join(pubDir, 'icon.png');
  if (!fs.existsSync(srcIcon)) {
    throw new Error('public/icon.png tidak ditemukan!');
  }

  console.log('Generating compliant PWA icons from public/icon.png...');

  const inputBuffer = fs.readFileSync(srcIcon);

  // 1. Pristine 512x512 main icon.png (converted to proper standard PNG)
  const mainIconBuffer = await sharp(inputBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 2, g: 6, b: 23, alpha: 0 } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(pubDir, 'icon.png'), mainIconBuffer);
  console.log('✓ Converted & saved public/icon.png (512x512 PNG)');

  // 2. 192x192 standard icon
  const icon192Buffer = await sharp(inputBuffer)
    .resize(192, 192, { fit: 'contain', background: { r: 2, g: 6, b: 23, alpha: 0 } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(pubDir, 'pwa-192x192.png'), icon192Buffer);
  console.log('✓ Created public/pwa-192x192.png');

  // 3. 512x512 standard icon
  fs.writeFileSync(path.join(pubDir, 'pwa-512x512.png'), mainIconBuffer);
  console.log('✓ Created public/pwa-512x512.png');

  // 4. 512x512 maskable icon (safe zone padding 15% around central icon)
  const innerSize = Math.round(512 * 0.75); // 75% safe-zone
  const innerBuffer = await sharp(inputBuffer)
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 2, g: 6, b: 23, alpha: 0 } })
    .png()
    .toBuffer();

  const maskableBuffer = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 2, g: 6, b: 23, alpha: 1 } // #020617
    }
  })
    .composite([{ input: innerBuffer, gravity: 'center' }])
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(pubDir, 'pwa-maskable-512x512.png'), maskableBuffer);
  console.log('✓ Created public/pwa-maskable-512x512.png (maskable safe zone)');

  // 5. apple-touch-icon (180x180 PNG)
  const appleTouchBuffer = await sharp(inputBuffer)
    .resize(180, 180, { fit: 'contain', background: { r: 2, g: 6, b: 23, alpha: 1 } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(pubDir, 'apple-touch-icon.png'), appleTouchBuffer);
  console.log('✓ Created public/apple-touch-icon.png');

  // 6. favicon (48x48 PNG)
  const faviconBuffer = await sharp(inputBuffer)
    .resize(48, 48, { fit: 'contain', background: { r: 2, g: 6, b: 23, alpha: 0 } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(pubDir, 'favicon.png'), faviconBuffer);
  console.log('✓ Created public/favicon.png');

  // If dist/ directory exists, also mirror the generated assets to dist/
  const distDir = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'icon.png'), mainIconBuffer);
    fs.writeFileSync(path.join(distDir, 'pwa-192x192.png'), icon192Buffer);
    fs.writeFileSync(path.join(distDir, 'pwa-512x512.png'), mainIconBuffer);
    fs.writeFileSync(path.join(distDir, 'pwa-maskable-512x512.png'), maskableBuffer);
    fs.writeFileSync(path.join(distDir, 'apple-touch-icon.png'), appleTouchBuffer);
    fs.writeFileSync(path.join(distDir, 'favicon.png'), faviconBuffer);
    console.log('✓ Mirrored all icons to dist/');
  }

  console.log('\nAll PWA icons generated and verified successfully!');
}

generateIcons().catch(e => {
  console.error(e);
  process.exit(1);
});
