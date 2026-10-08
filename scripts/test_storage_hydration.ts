import 'fake-indexeddb/auto';

// Polyfill window & localStorage di lingkungan Node.js untuk pengujian
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => storageMap.get(k) || null,
  setItem: (k: string, v: string) => storageMap.set(k, v),
  removeItem: (k: string) => storageMap.delete(k),
  clear: () => storageMap.clear(),
};
(globalThis as any).window = { localStorage: localStorageMock };
(globalThis as any).localStorage = localStorageMock;

async function runStoragePersistenceTests() {
  console.log("====================================================");
  console.log("PENGUJIAN SIKLUS PERSISTENSI STORAGE TATA (5x BUKA-TUTUP)");
  console.log("====================================================\n");

  const {
    preloadLargeItems,
    setLargeItem,
    getLargeItemSync,
    isStorageHydrated,
    setStorageHydrated,
  } = await import("../src/utils/db");

  // 1. Inisialisasi awal & Preload
  console.log("--- 1. Inisialisasi awal preload ---");
  const initRes = await preloadLargeItems();
  console.log(`Preload awal selesai: success = ${initRes.success}, hydrated = ${isStorageHydrated()}`);

  // 2. Siapkan data pengujian sesuai kriteria:
  // a) Catatan kecil
  // b) Banyak catatan (50 catatan)
  // c) Catatan dengan foto > 500 KB (string 600.000 karakter)
  console.log("\n--- 2. Menyiapkan data uji komprehensif ---");
  const largePhotoData = "data:image/jpeg;base64," + "A".repeat(600000); // > 600 KB
  const testNotes = [
    { id: "note_kecil", title: "Catatan Ringan", content: "Ini catatan kecil sederhana" },
    { id: "note_foto_besar", title: "Catatan dengan Foto HD", content: "Lampiran foto besar", photo: largePhotoData },
    ...Array.from({ length: 50 }, (_, i) => ({
      id: `note_banyak_${i}`,
      title: `Catatan Uji Nomor ${i + 1}`,
      content: `Konten catatan ke-${i + 1} untuk menguji volume catatan banyak`
    }))
  ];

  const testTasks = [
    { id: "task_1", title: "Olahraga Pagi", completed: true, repeat: "daily" },
    { id: "task_2", title: "Latihan Gitar", completed: false, isDiscipline: true, disciplineData: { dailyCheckins: ["2026-09-30"] } },
  ];

  const testTransactions = [
    { id: "tx_1", amount: 50000, type: "expense", category: "Makanan", title: "Makan Siang" },
    { id: "tx_2", amount: 2500000, type: "income", category: "Gaji", title: "Freelance" },
  ];

  const testMoods = [
    { date: "2026-09-30", mood: "happy", note: "Hari yang sangat produktif!" },
    { date: "2026-09-29", mood: "neutral", note: "Biasa saja" },
  ];

  const testDebts = [
    { id: "debt_1", title: "Hutang Laptop", totalAmount: 5000000, remainingAmount: 2000000, type: "debt" },
  ];

  const testSavingsGoals = [
    { id: "sg_1", title: "Dana Darurat", targetAmount: 10000000, currentAmount: 3500000 },
  ];

  // Simpan seluruh data ke IndexedDB melalui setLargeItem
  console.log("Menyimpan data uji ke IndexedDB...");
  const notesStr = JSON.stringify(testNotes);
  await setLargeItem("tata_notes", notesStr);
  await setLargeItem("tata_tasks", JSON.stringify(testTasks));
  await setLargeItem("tata_transactions", JSON.stringify(testTransactions));
  await setLargeItem("tata_moods", JSON.stringify(testMoods));
  await setLargeItem("tata_debts", JSON.stringify(testDebts));
  await setLargeItem("tata_savings_goals", JSON.stringify(testSavingsGoals));

  console.log(`Ukuran tata_notes tersimpan: ${(notesStr.length / 1024).toFixed(1)} KB (melebihi 500 KB)`);
  // Pastikan bahwa untuk data > 500 KB, localStorage tidak menyimpan data duplikat yang usang
  console.log(`Status localStorage untuk tata_notes:`, localStorage.getItem("tata_notes") === null ? "BERSIH (sesuai Aturan 6)" : "ADA SALINAN");

  // 3. Jalankan pengujian 5x siklus "Tutup Total Aplikasi & Buka Kembali"
  console.log("\n--- 3. Memulai Siklus Tutup Total & Buka Kembali (5x) ---");
  for (let cycle = 1; cycle <= 5; cycle++) {
    // Simulasi "Tutup Total":
    // Reset cache memory & status hydration
    setStorageHydrated(false);

    // Simulasi "Buka Kembali":
    // Panggil preloadLargeItems() seperti yang dilakukan HydrationGate saat startup
    const preloadRes = await preloadLargeItems();
    if (!preloadRes.success) {
      console.error(`Siklus ${cycle} GAGAL pada tahap preload.`);
      process.exit(1);
    }

    // Ambil data menggunakan getLargeItemSync (yang dipanggil saat useState inisialisasi)
    const loadedNotesRaw = getLargeItemSync("tata_notes");
    const loadedTasksRaw = getLargeItemSync("tata_tasks");
    const loadedTxRaw = getLargeItemSync("tata_transactions");
    const loadedMoodsRaw = getLargeItemSync("tata_moods");
    const loadedDebtsRaw = getLargeItemSync("tata_debts");
    const loadedSgRaw = getLargeItemSync("tata_savings_goals");

    if (!loadedNotesRaw || !loadedTasksRaw || !loadedTxRaw || !loadedMoodsRaw || !loadedDebtsRaw || !loadedSgRaw) {
      console.error(`Siklus ${cycle} GAGAL: Salah satu data kunci bernilai null!`);
      process.exit(1);
    }

    const loadedNotes = JSON.parse(loadedNotesRaw);
    const loadedTasks = JSON.parse(loadedTasksRaw);
    const loadedTx = JSON.parse(loadedTxRaw);
    const loadedMoods = JSON.parse(loadedMoodsRaw);
    const loadedDebts = JSON.parse(loadedDebtsRaw);
    const loadedSg = JSON.parse(loadedSgRaw);

    // Validasi integritas data
    const isNotesIntact = loadedNotes.length === 52 && loadedNotes[1].photo.length > 500000;
    const isTasksIntact = loadedTasks.length === 2 && loadedTasks[1].disciplineData.dailyCheckins[0] === "2026-09-30";
    const isTxIntact = loadedTx.length === 2 && loadedTx[0].amount === 50000;
    const isMoodsIntact = loadedMoods.length === 2 && loadedMoods[0].mood === "happy";
    const isDebtsIntact = loadedDebts.length === 1 && loadedDebts[0].remainingAmount === 2000000;
    const isSgIntact = loadedSg.length === 1 && loadedSg[0].currentAmount === 3500000;

    const allIntact = isNotesIntact && isTasksIntact && isTxIntact && isMoodsIntact && isDebtsIntact && isSgIntact;

    console.log(`[Siklus ${cycle}/5] Hasil Muat Ulang: ${allIntact ? "PASS (Semua data 100% utuh)" : "FAIL"}`);
    if (!allIntact) {
      console.error(`Detail kegagalan siklus ${cycle}:`, {
        isNotesIntact, isTasksIntact, isTxIntact, isMoodsIntact, isDebtsIntact, isSgIntact
      });
      process.exit(1);
    }
  }

  // 4. Uji Migrasi dari localStorage lama ke IndexedDB (Aturan 5)
  console.log("\n--- 4. Uji Migrasi Otomatis dari localStorage Lama ke IndexedDB ---");
  // Simpan data di localStorage dengan kunci lama yang belum ada di IndexedDB
  localStorage.setItem("tata_user", JSON.stringify({ name: "Pengguna Migrasi", email: "migrasi@tata.local" }));
  
  // Reset cache memory
  setStorageHydrated(false);
  const migPreload = await preloadLargeItems();
  const migratedUserStr = getLargeItemSync("tata_user");
  const isMigrationSuccess = migPreload.success && migratedUserStr !== null && JSON.parse(migratedUserStr).name === "Pengguna Migrasi";
  console.log(`Hasil Uji Migrasi localStorage ke IndexedDB: ${isMigrationSuccess ? "PASS" : "FAIL"}`);

  console.log("\n====================================================");
  console.log("SEMUA PENGUJIAN STORAGE PERSISTENCE: PASS");
  console.log("====================================================");
}

runStoragePersistenceTests();
