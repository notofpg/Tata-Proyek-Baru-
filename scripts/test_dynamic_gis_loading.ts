/**
 * Test suite for Dynamic Google Identity Services (GIS) loader
 * 
 * Verifies:
 * 1. index.html does NOT contain the hardcoded <script src="https://accounts.google.com/gsi/client">
 * 2. loadGoogleGisScript loads dynamically only on demand
 * 3. Handles offline / network failures cleanly
 * 4. Singleton pattern prevents duplicate script tags
 */

import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('--- Testing Dynamic Google Identity Services (GIS) Loading ---');

  // Test 1: Verify index.html does not have the script tag
  console.log('\n[Uji 1] Memeriksa index.html:');
  const indexHtml = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
  if (indexHtml.includes('accounts.google.com/gsi/client')) {
    throw new Error('FAIL: index.html masih memuat accounts.google.com/gsi/client secara statis!');
  }
  console.log('✓ PASS: index.html bebas dari tag script Google GIS statis.');

  // Test 2: Verify loadGoogleGis.ts logic in simulated DOM
  console.log('\n[Uji 2] Memeriksa logika loadGoogleGis.ts:');
  const mockHeadElements: any[] = [];
  
  // Mock DOM environment
  (global as any).window = {
    google: undefined
  };

  (global as any).document = {
    head: {
      appendChild: (el: any) => {
        mockHeadElements.push(el);
      }
    },
    querySelector: (selector: string) => {
      return mockHeadElements.find(el => selector.includes('accounts.google.com/gsi/client') && el.src?.includes('accounts.google.com/gsi/client')) || null;
    },
    createElement: (tag: string) => {
      const el: any = {
        tagName: tag.toUpperCase(),
        src: '',
        async: false,
        defer: false,
        onload: null,
        onerror: null,
        remove: () => {
          const idx = mockHeadElements.indexOf(el);
          if (idx !== -1) mockHeadElements.splice(idx, 1);
        }
      };
      return el;
    }
  };

  const { loadGoogleGisScript, resetGisLoadPromise } = await import('../src/utils/loadGoogleGis.ts');

  // Initial state: No script in head
  if (mockHeadElements.length !== 0) {
    throw new Error('FAIL: Head seharusnya kosong di awal.');
  }

  // Trigger load
  let caughtError: any = null;
  const promise1 = loadGoogleGisScript();
  const promise2 = loadGoogleGisScript();

  if ((mockHeadElements as any).length !== 1) {
    throw new Error(`FAIL: Diharapkan tepat 1 tag script dimuat, didapat: ${mockHeadElements.length}`);
  }
  console.log('✓ PASS: Hanya 1 tag script yang dibuat saat dipanggil (singleton).');

  // Test failure / offline handling
  const scriptEl = mockHeadElements[0];
  setTimeout(() => {
    scriptEl.onerror(new Error('Network offline'));
  }, 10);

  try {
    await promise1;
  } catch (err: any) {
    caughtError = err;
    console.log('✓ PASS: Penanganan offline berhasil me-reject promise dengan pesan:', err.message);
  }

  if (!caughtError) {
    throw new Error('FAIL: Promise seharusnya reject saat offline/error.');
  }

  // Verify retry after reset
  resetGisLoadPromise();
  if (mockHeadElements.length !== 0) {
    throw new Error('FAIL: Script gagal dibersihkan setelah error/reset.');
  }

  // Retry load and simulate success
  const retryPromise = loadGoogleGisScript();
  const retryScript = mockHeadElements[0];
  (global as any).window.google = { accounts: { id: { initialize: () => {}, renderButton: () => {} } } };
  retryScript.onload();

  const res = await retryPromise;
  if (res !== true) throw new Error('FAIL: Load seharusnya berhasil.');
  console.log('✓ PASS: Retry load berhasil diselesaikan (res = true).');

  console.log('\n=== Semua pengujian Dynamic Google GIS SUKSES (100% lolos) ===\n');
}

runTests();
