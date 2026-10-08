import crypto from "crypto";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const SECRET = "a_very_secure_secret_that_is_at_least_32_characters_long_12345";

function signTestToken(email: string, createdAt: number, expiresAt: number): string {
  const payload = Buffer.from(
    JSON.stringify({
      email: email.trim().toLowerCase(),
      iat: createdAt,
      exp: expiresAt,
      nonce: crypto.randomBytes(8).toString("hex"),
    })
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return `tata_sess_${payload}.${sig}`;
}

async function run() {
  console.log("====================================================");
  console.log("PENGUJIAN OTOMATIS: UJI (a) DAN UJI (b)");
  console.log("====================================================\n");

  const tokenFile = path.join(process.cwd(), "data", "test_active_token.txt");
  if (!fs.existsSync(tokenFile)) {
    console.error("Token aktif tidak ditemukan di data/test_active_token.txt!");
    process.exit(1);
  }
  const tokenA = fs.readFileSync(tokenFile, "utf-8").trim();

  // 1. Verifikasi token awal aktif di server (200)
  const preCheck = await fetch(`${BASE_URL}/api/account/profile`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  console.log(`[Pemeriksaan Awal] Akses profil sebelum logout: HTTP ${preCheck.status}`);
  if (preCheck.status !== 200) {
    console.error("Gagal verifikasi awal token A. Server mungkin belum memuat sesi.");
    process.exit(1);
  }

  // UJI (a): Login, salin token, logout, panggil /api/account/profile dengan token sama: 401
  console.log("\n--- Menjalankan Uji (a): Logout lalu pakai lagi token lama ---");
  const logoutRes = await fetch(`${BASE_URL}/api/account/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const logoutData = await logoutRes.json();
  console.log(`- Request POST /api/account/logout: HTTP ${logoutRes.status}, body =`, logoutData);

  const postLogoutRes = await fetch(`${BASE_URL}/api/account/profile`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const postLogoutData = await postLogoutRes.json();
  console.log(`- Request GET /api/account/profile setelah logout: HTTP ${postLogoutRes.status}`);
  console.log(`- Body response:`, postLogoutData);
  const testAPass = postLogoutRes.status === 401;
  console.log(`==> HASIL UJI (a): ${testAPass ? "PASS" : "FAIL"}\n`);

  // UJI (b): Token bertanda tangan benar tanpa record sesi: 401
  console.log("--- Menjalankan Uji (b): Token sah secara HMAC tapi tidak ada di database/memory ---");
  const now = Date.now();
  const tokenTanpaRecord = signTestToken("user_tanpa_record@tata.local", now, now + 30 * 24 * 3600 * 1000);
  const unrecordedRes = await fetch(`${BASE_URL}/api/account/profile`, {
    headers: { Authorization: `Bearer ${tokenTanpaRecord}` },
  });
  const unrecordedData = await unrecordedRes.json();
  console.log(`- Request GET /api/account/profile token tanpa record: HTTP ${unrecordedRes.status}`);
  console.log(`- Body response:`, unrecordedData);
  const testBPass = unrecordedRes.status === 401;
  console.log(`==> HASIL UJI (b): ${testBPass ? "PASS" : "FAIL"}\n`);

  console.log("====================================================");
  console.log(`Uji (a) Token setelah logout = 401: ${testAPass ? "PASS" : "FAIL"}`);
  console.log(`Uji (b) Token tanpa record sesi = 401: ${testBPass ? "PASS" : "FAIL"}`);
  console.log("====================================================");

  if (!testAPass || !testBPass) {
    process.exit(1);
  }
}

run();
