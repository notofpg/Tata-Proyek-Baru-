import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "tata_admin_secret_pass_2026";

async function run() {
  console.log("=================================================================");
  console.log("PENGUJIAN RESMI: ADMIN BLOCK & UNBLOCK ACCOUNTS + PRIVACY FIRST");
  console.log("=================================================================\n");

  const emailX = "user_x_penipu@tata.local";

  // 1. Setup akun X dan sesi aktif
  console.log("1. Mendaftarkan Akun X dan membuat sesi aktif...");
  const accountX = {
    userId: "tata_user_x_target",
    email: emailX,
    name: "User X Target",
    avatarUrl: "",
    isPremium: true,
    premiumType: "pro",
    premiumExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    transactions: [],
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  await fetch(`${BASE_URL}/api/dev/set-account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailX, account: accountX }),
  });

  const sessRes = await fetch(`${BASE_URL}/api/dev/set-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailX }),
  });
  const tokenX = (await sessRes.json()).token;
  console.log(`   Token sesi aktif untuk ${emailX} berhasil dibuat.\n`);

  // Pastikan sebelum diblokir, akun X dapat memanggil /api/account/profile (HTTP 200)
  const initialCheckRes = await fetch(`${BASE_URL}/api/account/profile`, {
    headers: { Authorization: `Bearer ${tokenX}` },
  });
  console.log(`   Pemeriksaan awal status akun X: HTTP ${initialCheckRes.status} (Harus 200)`);
  if (initialCheckRes.status !== 200) {
    console.error("Gagal pemeriksaan awal akun X!");
    process.exit(1);
  }

  // 2. Login Admin untuk mendapatkan cookie admin session
  console.log("\n2. Melakukan otentikasi Admin...");
  const adminLoginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
  });
  console.log(`   Admin Login Status: HTTP ${adminLoginRes.status}`);
  const adminCookie = adminLoginRes.headers.get("set-cookie") || "";
  if (!adminCookie) {
    console.error("Gagal mendapatkan cookie sesi admin!");
    process.exit(1);
  }

  // =========================================================================
  // UJI (a): Admin blokir akun X: akun X langsung ditolak (403) saat memanggil
  // endpoint yang butuh sesi, walau tokennya masih berlaku.
  // =========================================================================
  console.log("\n--- UJI (a): Admin memblokir akun X dan verifikasi penolakan 403 ---");
  const blockRes = await fetch(`${BASE_URL}/api/admin/accounts/${encodeURIComponent(emailX)}/block`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      reason: "Indikasi penipuan transaksi pembayaran",
    }),
  });
  const blockData = await blockRes.json();
  console.log(`   Status Blokir: HTTP ${blockRes.status}, Body:`, blockData);

  // Verifikasi permintaan berikutnya dari Akun X dengan token yang masih berlaku:
  // a1) /api/account/profile
  const profileAfterBlock = await fetch(`${BASE_URL}/api/account/profile`, {
    headers: { Authorization: `Bearer ${tokenX}` },
  });
  const profileBlockedData = await profileAfterBlock.json();
  console.log(`   a1) GET /api/account/profile: HTTP ${profileAfterBlock.status}, error:`, profileBlockedData);

  // a2) /api/payment/create-order
  const paymentAfterBlock = await fetch(`${BASE_URL}/api/payment/create-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenX}`,
    },
    body: JSON.stringify({ plan: "pro_monthly" }),
  });
  const paymentBlockedData = await paymentAfterBlock.json();
  console.log(`   a2) POST /api/payment/create-order: HTTP ${paymentAfterBlock.status}, error:`, paymentBlockedData);

  // a3) /api/account/restore-premium
  const restoreAfterBlock = await fetch(`${BASE_URL}/api/account/restore-premium`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenX}`,
    },
    body: JSON.stringify({}),
  });
  const restoreBlockedData = await restoreAfterBlock.json();
  console.log(`   a3) POST /api/account/restore-premium: HTTP ${restoreAfterBlock.status}, error:`, restoreBlockedData);

  // a4) /api/ai/chat
  const aiChatAfterBlock = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenX}`,
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Halo Tata" }],
    }),
  });
  const aiChatBlockedData = await aiChatAfterBlock.json();
  console.log(`   a4) POST /api/ai/chat: HTTP ${aiChatAfterBlock.status}, error:`, aiChatBlockedData);

  // a5) /api/account/request-otp (mencegah login ulang saat diblokir)
  const otpAfterBlock = await fetch(`${BASE_URL}/api/account/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailX }),
  });
  const otpBlockedData = await otpAfterBlock.json();
  console.log(`   a5) POST /api/account/request-otp: HTTP ${otpAfterBlock.status}, error:`, otpBlockedData);

  const passA =
    blockRes.status === 200 &&
    profileAfterBlock.status === 403 &&
    profileBlockedData.error === "account_blocked" &&
    paymentAfterBlock.status === 403 &&
    restoreAfterBlock.status === 403 &&
    aiChatAfterBlock.status === 403 &&
    otpAfterBlock.status === 403;
  console.log(`==> HASIL UJI (a): ${passA ? "PASS (Semua endpoint yang butuh sesi langsung menolak 403 Akun diblokir)" : "FAIL"}\n`);

  // =========================================================================
  // UJI (b): Admin buka blokir: akun X normal kembali.
  // =========================================================================
  console.log("--- UJI (b): Admin membuka blokir akun X ---");
  const unblockRes = await fetch(`${BASE_URL}/api/admin/accounts/${encodeURIComponent(emailX)}/unblock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      reason: "Verifikasi identitas selesai, akun dipulihkan",
    }),
  });
  const unblockData = await unblockRes.json();
  console.log(`   Status Buka Blokir: HTTP ${unblockRes.status}, Body:`, unblockData);

  // Verifikasi akun X dapat memanggil /api/account/profile kembali normal (HTTP 200)
  const profileAfterUnblock = await fetch(`${BASE_URL}/api/account/profile`, {
    headers: { Authorization: `Bearer ${tokenX}` },
  });
  const profileUnblockedData = await profileAfterUnblock.json();
  console.log(`   GET /api/account/profile setelah unblock: HTTP ${profileAfterUnblock.status}, email: ${profileUnblockedData.account?.email}`);

  // Verifikasi audit log admin mencatat tindakan blokir & buka blokir
  const auditRes = await fetch(`${BASE_URL}/api/admin/audit-log`, {
    headers: { Cookie: adminCookie },
  });
  const auditData = await auditRes.json();
  const hasBlockLog = auditData.entries?.some((e: any) => e.email === emailX && e.action === "block_account");
  const hasUnblockLog = auditData.entries?.some((e: any) => e.email === emailX && e.action === "unblock_account");
  console.log(`   Audit log mencatat block_account: ${hasBlockLog}, unblock_account: ${hasUnblockLog}`);

  const passB =
    unblockRes.status === 200 &&
    profileAfterUnblock.status === 200 &&
    profileUnblockedData.account?.email === emailX &&
    hasBlockLog &&
    hasUnblockLog;
  console.log(`==> HASIL UJI (b): ${passB ? "PASS (Akun X normal kembali dan log audit tercatat lengkap)" : "FAIL"}\n`);

  // =========================================================================
  // UJI (c): Admin panel tidak menampilkan catatan/tugas/keuangan/mood akun mana pun.
  // =========================================================================
  console.log("--- UJI (c): Privasi Ketat (Admin Panel TIDAK menampilkan data pribadi) ---");
  const adminAccountsRes = await fetch(`${BASE_URL}/api/admin/accounts`, {
    headers: { Cookie: adminCookie },
  });
  const adminAccountsData = await adminAccountsRes.json();

  const adminAccountDetailRes = await fetch(`${BASE_URL}/api/admin/accounts/${encodeURIComponent(emailX)}`, {
    headers: { Cookie: adminCookie },
  });
  const adminAccountDetailData = await adminAccountDetailRes.json();

  const forbiddenKeys = ["notes", "tasks", "finance", "mutations", "calendar", "mood", "moods", "backup", "debts", "savings"];

  let leakFound = false;
  // Periksa list akun
  for (const acc of adminAccountsData.accounts || []) {
    for (const key of forbiddenKeys) {
      if ((acc as any)[key] !== undefined) {
        console.error(`BOCOR: Field pribadi '${key}' ditemukan di /api/admin/accounts!`);
        leakFound = true;
      }
    }
  }

  // Periksa detail akun
  if (adminAccountDetailData.account) {
    for (const key of forbiddenKeys) {
      if ((adminAccountDetailData.account as any)[key] !== undefined) {
        console.error(`BOCOR: Field pribadi '${key}' ditemukan di /api/admin/accounts/:email!`);
        leakFound = true;
      }
    }
  }

  // Periksa file admin-panel.html & admin-panel.js
  const htmlContent = fs.readFileSync(path.join(process.cwd(), "public", "admin-panel.html"), "utf-8").toLowerCase();
  const jsContent = fs.readFileSync(path.join(process.cwd(), "public", "admin-panel.js"), "utf-8").toLowerCase();

  const forbiddenUiTerms = ["catatan pengguna", "tugas pengguna", "keuangan pengguna", "mood pengguna", "user notes", "user tasks"];
  let uiLeakFound = false;
  for (const term of forbiddenUiTerms) {
    if (htmlContent.includes(term) || jsContent.includes(term)) {
      console.error(`BOCOR: Istilah data pribadi '${term}' ditemukan di UI admin panel!`);
      uiLeakFound = true;
    }
  }

  console.log(`   Pemeriksaan API payload admin: ${leakFound ? "DITEMUKAN KEBOCORAN!" : "BERSIH 100% (Hanya data akun & transaksi)"}`);
  console.log(`   Pemeriksaan file UI admin panel: ${uiLeakFound ? "DITEMUKAN KEBOCORAN!" : "BERSIH 100% (Tanpa UI data pribadi)"}`);

  const passC = !leakFound && !uiLeakFound;
  console.log(`==> HASIL UJI (c): ${passC ? "PASS (Privasi Terjaga: Nol data pribadi di Admin Panel)" : "FAIL"}\n`);

  const allPassed = passA && passB && passC;
  console.log("=================================================================");
  console.log(`RINGKASAN TOTAL: ${allPassed ? "SEMUA UJI (a, b, c) LULUS 100%!" : "ADA UJI YANG GAGAL"}`);
  console.log("=================================================================");

  if (!allPassed) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
