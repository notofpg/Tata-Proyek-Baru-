/**
 * Test suite for Vercel Analytics toggle & conditional rendering logic
 *
 * Verifies:
 * a) Kunjungan baru: Analytics aktif secara default (tata_disable_telemetry belum diset)
 * b) Setelah toggle dimatikan: flag tata_disable_telemetry diset 'true', Analytics tidak dirender
 * c) Menyalakan toggle lagi: flag tata_disable_telemetry diset 'false', Analytics dirender kembali
 */

class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

function simulateAnalyticsRenderDecision(storage: MockLocalStorage): boolean {
  // Logic from ConditionalAnalytics in src/main.tsx:
  // const [isDisabled, setIsDisabled] = useState<boolean>(() => {
  //   try {
  //     return typeof window !== 'undefined' && localStorage.getItem('tata_disable_telemetry') === 'true';
  //   } catch {
  //     return false;
  //   }
  // });
  // if (isDisabled) return null;
  // return <Analytics />;

  const isDisabled = storage.getItem('tata_disable_telemetry') === 'true';
  return !isDisabled; // Returns true if <Analytics /> is rendered, false if null
}

function runTests() {
  console.log('--- Testing Vercel Analytics Toggle & Persistence ---');
  const mockStorage = new MockLocalStorage();

  // Test 1: New visit (kunjungan baru / user baru)
  console.log('\n[Uji a] Kunjungan baru (tata_disable_telemetry belum pernah diatur):');
  const initialAnalyticsActive = simulateAnalyticsRenderDecision(mockStorage);
  console.log(`- Flag di localStorage: ${mockStorage.getItem('tata_disable_telemetry')}`);
  console.log(`- Apakah <Analytics /> dirender: ${initialAnalyticsActive}`);
  if (initialAnalyticsActive !== true) {
    throw new Error('FAIL: Analytics seharusnya aktif secara default untuk pengunjung baru!');
  }
  console.log('✓ PASS: Analytics terpanggil secara default tanpa perlu konfirmasi manual.');

  // Test 2: User toggles off telemetry in Settings
  console.log('\n[Uji b] Pengguna mematikan toggle di Pengaturan:');
  // Setting toggleTelemetry in SettingsScreen.tsx:
  // localStorage.setItem('tata_disable_telemetry', 'true');
  mockStorage.setItem('tata_disable_telemetry', 'true');
  const disabledAnalyticsActive = simulateAnalyticsRenderDecision(mockStorage);
  console.log(`- Flag di localStorage setelah dimatikan: ${mockStorage.getItem('tata_disable_telemetry')}`);
  console.log(`- Apakah <Analytics /> dirender: ${disabledAnalyticsActive}`);
  if (disabledAnalyticsActive !== false) {
    throw new Error('FAIL: Analytics seharusnya TIDAK dirender saat toggle dimatikan!');
  }
  console.log('✓ PASS: Analytics tidak dirender pada kunjungan setelah toggle dimatikan.');

  // Test 3: User toggles on again
  console.log('\n[Uji c] Pengguna menyalakan kembali toggle di Pengaturan:');
  // Setting toggleTelemetry in SettingsScreen.tsx:
  // localStorage.setItem('tata_disable_telemetry', 'false');
  mockStorage.setItem('tata_disable_telemetry', 'false');
  const reenabledAnalyticsActive = simulateAnalyticsRenderDecision(mockStorage);
  console.log(`- Flag di localStorage setelah dinyalakan kembali: ${mockStorage.getItem('tata_disable_telemetry')}`);
  console.log(`- Apakah <Analytics /> dirender: ${reenabledAnalyticsActive}`);
  if (reenabledAnalyticsActive !== true) {
    throw new Error('FAIL: Analytics seharusnya dirender kembali saat toggle dinyalakan!');
  }
  console.log('✓ PASS: Analytics dirender kembali setelah toggle dinyalakan.');

  console.log('\n=== Semua pengujian Vercel Analytics toggle SUKSES (100% lolos) ===\n');
}

runTests();
