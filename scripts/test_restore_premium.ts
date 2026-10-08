import crypto from "crypto";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";

async function run() {
  console.log("=================================================================");
  console.log("PENGUJIAN RESMI: PERBAIKAN /api/account/restore-premium");
  console.log("PRINSIP: Premium melekat pada AKUN Tata, bukan Order ID bebas");
  console.log("=================================================================\n");

  const emailA = "akun_a@tata.local";
  const emailB = "akun_b@tata.local";
  const emailC = "akun_c_corrupt@tata.local";

  // Setup akun dan sesi via dev endpoints
  const accountA = {
    userId: "tata_user_a",
    email: emailA,
    name: "Akun A",
    avatarUrl: "",
    isPremium: false,
    premiumType: "free",
    premiumExpiresAt: null,
    transactions: [],
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  const accountB = {
    userId: "tata_user_b",
    email: emailB,
    name: "Akun B",
    avatarUrl: "",
    isPremium: false,
    premiumType: "free",
    premiumExpiresAt: null,
    transactions: [],
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  // Akun C: Status corrupt (isPremium true, premiumType pro, tapi premiumExpiresAt null / kosong)
  const accountC = {
    userId: "tata_user_c",
    email: emailC,
    name: "Akun C Corrupt",
    avatarUrl: "",
    isPremium: true,
    premiumType: "pro",
    premiumExpiresAt: null,
    transactions: [],
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  await fetch(`${BASE_URL}/api/dev/set-account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailA, account: accountA }),
  });
  await fetch(`${BASE_URL}/api/dev/set-account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailB, account: accountB }),
  });
  await fetch(`${BASE_URL}/api/dev/set-account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailC, account: accountC }),
  });

  const sessARes = await fetch(`${BASE_URL}/api/dev/set-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailA }),
  });
  const tokenA = (await sessARes.json()).token;

  const sessBRes = await fetch(`${BASE_URL}/api/dev/set-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailB }),
  });
  const tokenB = (await sessBRes.json()).token;

  const sessCRes = await fetch(`${BASE_URL}/api/dev/set-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailC }),
  });
  const tokenC = (await sessCRes.json()).token;

  // Buat Order resmi milik Akun A di server via create-order
  console.log("1. Membuat pesanan sah untuk Akun A (pro_monthly - Rp19.000)...");
  const createOrderRes = await fetch(`${BASE_URL}/api/payment/create-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      plan: "pro_monthly",
    }),
  });
  const orderAData = await createOrderRes.json();
  const orderIdA = orderAData.orderId;
  console.log(`   Order ID Akun A berhasil dibuat: ${orderIdA}, amount: ${orderAData.amount}\n`);

  // =========================================================================
  // UJI (a): Akun B pakai Order ID akun A: DITOLAK
  // =========================================================================
  console.log("--- UJI (a): Akun B pakai Order ID Akun A ---");
  const testARes = await fetch(`${BASE_URL}/api/account/restore-premium`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenB}`,
    },
    body: JSON.stringify({
      paymentProof: {
        provider: "midtrans",
        orderId: orderIdA,
      },
    }),
  });
  const testAData = await testARes.json();
  console.log(`   Status HTTP: ${testARes.status}`);
  console.log(`   Response Body:`, testAData);
  const passA = testARes.status === 403 && testAData.error === "order_ownership_mismatch";
  console.log(`==> HASIL UJI (a): ${passA ? "PASS (Ditolak dengan 403 order_ownership_mismatch)" : "FAIL"}\n`);

  // =========================================================================
  // UJI (b): Akun A memulihkan order sendiri lalu mengulang restore (IDEMPOTEN)
  // Termasuk verifikasi alur utama (membaca status tersimpan tanpa order ID)
  // =========================================================================
  console.log("--- UJI (b): Akun A memulihkan order miliknya sendiri ---");
  const testB1Res = await fetch(`${BASE_URL}/api/account/restore-premium`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      paymentProof: {
        provider: "midtrans",
        orderId: orderIdA,
      },
    }),
  });
  const testB1Data = await testB1Res.json();
  console.log(`   Restore Pertama - Status HTTP: ${testB1Res.status}`);
  console.log(`   isPremium: ${testB1Data.isPremium}, premiumType: ${testB1Data.account?.premiumType}, expiresAt: ${testB1Data.account?.premiumExpiresAt}`);

  console.log("\n   Mengulang restore untuk Akun A dengan Order ID yang sama (Idempoten)...");
  const testB2Res = await fetch(`${BASE_URL}/api/account/restore-premium`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      paymentProof: {
        provider: "midtrans",
        orderId: orderIdA,
      },
    }),
  });
  const testB2Data = await testB2Res.json();
  console.log(`   Restore Kedua - Status HTTP: ${testB2Res.status}`);
  console.log(`   isPremium: ${testB2Data.isPremium}, transactions count: ${testB2Data.account?.transactions?.length}`);

  console.log("\n   Alur utama: Restore Akun A TANPA memasukkan Order ID (membaca status aktif yang tersimpan)...");
  const testB3Res = await fetch(`${BASE_URL}/api/account/restore-premium`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({}),
  });
  const testB3Data = await testB3Res.json();
  console.log(`   Restore Alur Utama - Status HTTP: ${testB3Res.status}`);
  console.log(`   isPremium: ${testB3Data.isPremium}, message: ${testB3Data.message}`);

  const passB =
    testB1Res.status === 200 &&
    testB1Data.isPremium === true &&
    testB2Res.status === 200 &&
    testB2Data.isPremium === true &&
    testB2Data.account?.transactions?.length === 1 && // Tidak ada duplikasi transaksi
    testB3Res.status === 200 &&
    testB3Data.isPremium === true;
  console.log(`==> HASIL UJI (b): ${passB ? "PASS (Berhasil, Idempoten & Alur Utama Tanpa Order ID)" : "FAIL"}\n`);

  // =========================================================================
  // UJI (c): Dua permintaan bersamaan order sama dari 2 akun: HANYA SATU BERHASIL
  // =========================================================================
  console.log("--- UJI (c): Dua permintaan bersamaan untuk order yang sama dari 2 akun berbeda ---");
  // Buat order baru
  const createRaceOrderRes = await fetch(`${BASE_URL}/api/payment/create-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      plan: "promax_monthly",
    }),
  });
  const raceOrderData = await createRaceOrderRes.json();
  const raceOrderId = raceOrderData.orderId;
  console.log(`   Order baru dibuat: ${raceOrderId}`);

  // Kirim 2 permintaan bersamaan: Akun A (pemilik) dan Akun B (bukan pemilik)
  const [resConcurrentA, resConcurrentB] = await Promise.all([
    fetch(`${BASE_URL}/api/account/restore-premium`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        paymentProof: { provider: "midtrans", orderId: raceOrderId },
      }),
    }),
    fetch(`${BASE_URL}/api/account/restore-premium`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        paymentProof: { provider: "midtrans", orderId: raceOrderId },
      }),
    }),
  ]);

  const dataConcurrentA = await resConcurrentA.json();
  const dataConcurrentB = await resConcurrentB.json();

  console.log(`   Hasil Permintaan Akun A: HTTP ${resConcurrentA.status}, isPremium = ${dataConcurrentA.isPremium}`);
  console.log(`   Hasil Permintaan Akun B: HTTP ${resConcurrentB.status}, error = ${dataConcurrentB.error}`);

  const passC =
    resConcurrentA.status === 200 &&
    dataConcurrentA.isPremium === true &&
    resConcurrentB.status === 403;
  console.log(`==> HASIL UJI (c): ${passC ? "PASS (Hanya 1 akun yang berhasil, akun lain ditolak)" : "FAIL"}\n`);

  // =========================================================================
  // UJI (d): Tanpa tanggal kedaluwarsa & tanpa order valid: TIDAK JADI LIFETIME
  // =========================================================================
  console.log("--- UJI (d): Tanpa tanggal kedaluwarsa & tanpa order valid: TIDAK JADI LIFETIME ---");
  // Akun C memiliki isPremium: true, premiumType: 'pro', tapi premiumExpiresAt: null
  // Panggil restore tanpa order valid
  const testDRes = await fetch(`${BASE_URL}/api/account/restore-premium`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenC}`,
    },
    body: JSON.stringify({}),
  });
  const testDData = await testDRes.json();
  console.log(`   Restore Akun C - Status HTTP: ${testDRes.status}`);
  console.log(`   isPremium: ${testDData.isPremium}, error: ${testDData.error}`);

  // Cek profil Akun C di server
  const profileCRes = await fetch(`${BASE_URL}/api/account/profile`, {
    headers: { Authorization: `Bearer ${tokenC}` },
  });
  const profileCData = await profileCRes.json();
  console.log(`   Profil Akun C di server: isPremium = ${profileCData.account?.isPremium}`);

  const passD =
    testDData.isPremium === false &&
    profileCData.account?.isPremium === false;
  console.log(`==> HASIL UJI (d): ${passD ? "PASS (Tidak menjadi lifetime, isPremium disetel false)" : "FAIL"}\n`);

  const allPassed = passA && passB && passC && passD;
  console.log("=================================================================");
  console.log(`RINGKASAN TOTAL: ${allPassed ? "SEMUA UJI (a, b, c, d) LULUS 100%!" : "ADA UJI YANG GAGAL"}`);
  console.log("=================================================================");

  if (!allPassed) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
