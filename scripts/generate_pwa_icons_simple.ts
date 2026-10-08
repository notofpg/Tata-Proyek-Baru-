import fs from 'fs';
import path from 'path';

/**
 * VERSI SIMPLIFIED: Hanya copy icon.png ke berbagai ukuran dengan penamaan yang sesuai PWA spec
 * Tidak memerlukan 'sharp' - hanya rename/copy file
 * 
 * CATATAN: Untuk hasil terbaik, pastikan public/icon.png sudah berukuran 512x512 PNG
 */

async function generateIconsSimple() {
  const pubDir = path.join(process.cwd(), 'public');
  const srcIcon = path.join(pubDir, 'icon.png');

  // ✅ Jika icon.png belum ada, skip (mungkin development environment)
  if (!fs.existsSync(srcIcon)) {
    console.warn('⚠️  public/icon.png tidak ditemukan - PWA icons akan di-skip');
    return;
  }

  console.log('📦 Preparing PWA icons from public/icon.png...');

  try {
    const iconBuffer = fs.readFileSync(srcIcon);

    // Verifikasi file adalah PNG yang valid (magic bytes: 89 50 4E 47)
    if (iconBuffer[0] !== 0x89 || iconBuffer[1] !== 0x50 || iconBuffer[2] !== 0x4e || iconBuffer[3] !== 0x47) {
      console.warn('⚠️  icon.png mungkin bukan PNG valid - skip');
      return;
    }

    // 1. Copy ke pwa-192x192.png (frontend akan display ini)
    fs.writeFileSync(path.join(pubDir, 'pwa-192x192.png'), iconBuffer);
    console.log('✓ Linked public/pwa-192x192.png');

    // 2. Copy ke pwa-512x512.png
    fs.writeFileSync(path.join(pubDir, 'pwa-512x512.png'), iconBuffer);
    console.log('✓ Linked public/pwa-512x512.png');

    // 3. Copy ke pwa-maskable-512x512.png (maskable icon)
    fs.writeFileSync(path.join(pubDir, 'pwa-maskable-512x512.png'), iconBuffer);
    console.log('✓ Linked public/pwa-maskable-512x512.png');

    // 4. Copy ke apple-touch-icon.png (iOS)
    fs.writeFileSync(path.join(pubDir, 'apple-touch-icon.png'), iconBuffer);
    console.log('✓ Linked public/apple-touch-icon.png');

    // 5. Copy ke favicon.png
    fs.writeFileSync(path.join(pubDir, 'favicon.png'), iconBuffer);
    console.log('✓ Linked public/favicon.png');

    console.log('✅ PWA icons preparation complete!');
  } catch (error) {
    console.error('❌ Error preparing PWA icons:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

generateIconsSimple();
