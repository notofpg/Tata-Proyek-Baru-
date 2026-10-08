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

async function runTests() {
  console.log("==================================================================");
  console.log("PENGUJIAN SISTEM KEAMANAN & KUOTA TATA AI (SERVER SOURCE OF TRUTH)");
  console.log("==================================================================\n");

  const dir = path.join(process.cwd(), "data");
  const tokenData = JSON.parse(fs.readFileSync(path.join(dir, "ai_test_tokens.json"), "utf-8"));
  const { liteToken, proToken, proMaxToken } = tokenData;

  // -------------------------------------------------------------
  // UJI (a): Endpoint AI tanpa login (dengan/tanpa API key sendiri): 401
  // -------------------------------------------------------------
  console.log("------------------------------------------------------------------");
  console.log("UJI (a): Endpoint AI tanpa login (dengan/tanpa API key sendiri) -> 401");
  console.log("------------------------------------------------------------------");
  
  // 1. /api/ai/test-key tanpa login
  const resA1 = await fetch(`${BASE_URL}/api/ai/test-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: "some_key" })
  });
  console.log(`- POST /api/ai/test-key tanpa login: HTTP ${resA1.status}`);

  // 2. /api/ai/chat tanpa login (tanpa API key sendiri)
  const resA2 = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Halo" }] })
  });
  console.log(`- POST /api/ai/chat tanpa login (tanpa key sendiri): HTTP ${resA2.status}`);

  // 3. /api/ai/chat tanpa login (DENGAN API key sendiri / BYOK)
  const resA3 = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Halo" }],
      customApiKey: "AIzaSyFakeKey12345"
    })
  });
  console.log(`- POST /api/ai/chat tanpa login (DENGAN key sendiri): HTTP ${resA3.status}`);

  // 4. /api/ai/ocr tanpa login
  const resA4 = await fetch(`${BASE_URL}/api/ai/ocr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY44YAAAAASUVORK5CYII=" })
  });
  console.log(`- POST /api/ai/ocr tanpa login (tanpa key sendiri): HTTP ${resA4.status}`);

  // 5. /api/ai/ocr tanpa login (DENGAN API key sendiri / BYOK)
  const resA5 = await fetch(`${BASE_URL}/api/ai/ocr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY44YAAAAASUVORK5CYII=",
      customApiKey: "AIzaSyFakeKey12345"
    })
  });
  console.log(`- POST /api/ai/ocr tanpa login (DENGAN key sendiri): HTTP ${resA5.status}`);

  const testAPass = resA1.status === 401 && resA2.status === 401 && resA3.status === 401 && resA4.status === 401 && resA5.status === 401;
  console.log(`==> HASIL UJI (a): ${testAPass ? "PASS" : "FAIL"}\n`);

  // -------------------------------------------------------------
  // Verifikasi Kuota Server per Akun (Tata Lite: 7, Pro: 20, Pro Max: 30)
  // -------------------------------------------------------------
  console.log("------------------------------------------------------------------");
  console.log("VERIFIKASI KUOTA SERVER: Tata Lite 7, Pro 20, Pro Max 30");
  console.log("------------------------------------------------------------------");
  const qLite = await (await fetch(`${BASE_URL}/api/ai/quota`, { headers: { Authorization: `Bearer ${liteToken}` } })).json();
  const qPro = await (await fetch(`${BASE_URL}/api/ai/quota`, { headers: { Authorization: `Bearer ${proToken}` } })).json();
  const qProMax = await (await fetch(`${BASE_URL}/api/ai/quota`, { headers: { Authorization: `Bearer ${proMaxToken}` } })).json();

  console.log(`- Akun Lite: maxCredits = ${qLite.maxCredits}, tier = ${qLite.tier}`);
  console.log(`- Akun Pro: maxCredits = ${qPro.maxCredits}, tier = ${qPro.tier}`);
  console.log(`- Akun Pro Max: maxCredits = ${qProMax.maxCredits}, tier = ${qProMax.tier}`);
  const tierPass = qLite.maxCredits === 7 && qPro.maxCredits === 20 && qProMax.maxCredits === 30;
  console.log(`==> HASIL VERIFIKASI TIER KUOTA: ${tierPass ? "PASS" : "FAIL"}\n`);

  // -------------------------------------------------------------
  // UJI (b): Pakai sampai kuota server habis: 429
  // -------------------------------------------------------------
  console.log("------------------------------------------------------------------");
  console.log("UJI (b): Pakai sampai kuota server habis -> 429");
  console.log("------------------------------------------------------------------");

  // Simulasikan kuota Lite (7) telah terpakai semua di server
  await fetch(`${BASE_URL}/api/ai/dev-simulate-quota`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${liteToken}` },
    body: JSON.stringify({ used: 7 })
  });

  // Periksa sisa kuota via /api/ai/quota
  const qExhausted = await (await fetch(`${BASE_URL}/api/ai/quota`, { headers: { Authorization: `Bearer ${liteToken}` } })).json();
  console.log(`- Status kuota server setelah habis: used = ${qExhausted.used}, creditsLeft = ${qExhausted.creditsLeft}, maxCredits = ${qExhausted.maxCredits}`);

  // Panggil /api/ai/chat tanpa BYOK saat kuota habis -> Wajib 429
  const resChatExhausted = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${liteToken}` },
    body: JSON.stringify({ messages: [{ role: "user", content: "Halo Tata" }] })
  });
  const dataChatExhausted = await resChatExhausted.json();
  console.log(`- POST /api/ai/chat saat kuota habis: HTTP ${resChatExhausted.status}`);
  console.log(`  Response message: "${dataChatExhausted.message}"`);

  // Panggil /api/ai/ocr tanpa BYOK saat kuota habis -> Wajib 429
  const resOcrExhausted = await fetch(`${BASE_URL}/api/ai/ocr`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${liteToken}` },
    body: JSON.stringify({ image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY44YAAAAASUVORK5CYII=" })
  });
  const dataOcrExhausted = await resOcrExhausted.json();
  console.log(`- POST /api/ai/ocr saat kuota habis: HTTP ${resOcrExhausted.status}`);
  console.log(`  Response message: "${dataOcrExhausted.message}"`);

  const testBPass = resChatExhausted.status === 429 && resOcrExhausted.status === 429;
  console.log(`==> HASIL UJI (b): ${testBPass ? "PASS" : "FAIL"}\n`);

  // -------------------------------------------------------------
  // UJI (c): Ubah localStorage tidak menambah kuota
  // -------------------------------------------------------------
  console.log("------------------------------------------------------------------");
  console.log("UJI (c): Ubah localStorage tidak menambah kuota");
  console.log("------------------------------------------------------------------");
  console.log("- Pengguna di sisi browser mencoba manipulasi localStorage: tata_ai_credits_left = 9999");
  console.log("- Permintaan AI tetap dikirim ke server...");
  
  // Request dari client yang mengabaikan batas lokal dan tetap menembak endpoint AI
  const resTampered = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${liteToken}` },
    body: JSON.stringify({ messages: [{ role: "user", content: "Halo Tata, saya sudah ubah localStorage jadi 9999" }] })
  });
  const dataTampered = await resTampered.json();
  console.log(`- Response server: HTTP ${resTampered.status}, error: ${dataTampered.error}`);
  const testCPass = resTampered.status === 429;
  console.log(`==> HASIL UJI (c): ${testCPass ? "PASS (Server tetap menolak 429)" : "FAIL"}\n`);

  // -------------------------------------------------------------
  // UJI (d): Consent data tetap berjalan seperti sebelumnya
  // -------------------------------------------------------------
  console.log("------------------------------------------------------------------");
  console.log("UJI (d): Verifikasi Mekanisme Consent AI");
  console.log("------------------------------------------------------------------");
  const srcCompanion = fs.readFileSync("src/screens/AICompanionScreen.tsx", "utf-8");
  const srcOcr = fs.readFileSync("src/components/OCRModal.tsx", "utf-8");
  
  const hasConsentModalInCompanion = srcCompanion.includes("showConsentModal") && srcCompanion.includes("Peringatan Privasi");
  const hasConsentModalInOCR = srcOcr.includes("hasConsented") && srcOcr.includes("Privasi & Consent Terjamin");
  console.log(`- Modal consent & peringatan privasi di AICompanionScreen: ${hasConsentModalInCompanion ? "TERPASANG" : "HILANG"}`);
  console.log(`- Modal consent & persetujuan ekstraksi di OCRModal: ${hasConsentModalInOCR ? "TERPASANG" : "HILANG"}`);
  const testDPass = hasConsentModalInCompanion && hasConsentModalInOCR;
  console.log(`==> HASIL UJI (d): ${testDPass ? "PASS" : "FAIL"}\n`);

  // -------------------------------------------------------------
  // UJI (e): Batas Ukuran Request (Max 20 pesan, 8000 karakter, 3MB OCR)
  // -------------------------------------------------------------
  console.log("------------------------------------------------------------------");
  console.log("UJI TAMBAHAN: Validasi Batas Ukuran Request -> 413");
  console.log("------------------------------------------------------------------");
  const resLong = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${proToken}` },
    body: JSON.stringify({ messages: [{ role: "user", content: "X".repeat(8005) }] })
  });
  console.log(`- Pesan percakapan > 8.000 karakter: HTTP ${resLong.status}`);

  const resMany = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${proToken}` },
    body: JSON.stringify({ messages: Array.from({ length: 22 }, (_, i) => ({ role: "user", content: `Pesan ${i}` })) })
  });
  console.log(`- Riwayat percakapan > 20 pesan: HTTP ${resMany.status}`);

  const resHeavyOcr = await fetch(`${BASE_URL}/api/ai/ocr`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${proToken}` },
    body: JSON.stringify({ image: "A".repeat(4300000) })
  });
  console.log(`- Gambar OCR > 3 MB: HTTP ${resHeavyOcr.status}`);

  const sizePass = resLong.status === 413 && resMany.status === 413 && resHeavyOcr.status === 413;
  console.log(`==> HASIL UJI BATAS UKURAN: ${sizePass ? "PASS" : "FAIL"}\n`);

  console.log("==================================================================");
  console.log(`RINGKASAN HASIL:`);
  console.log(`a) Endpoint AI tanpa login (dengan/tanpa BYOK) = 401: ${testAPass ? "PASS" : "FAIL"}`);
  console.log(`b) Pakai sampai kuota server habis = 429: ${testBPass ? "PASS" : "FAIL"}`);
  console.log(`c) Ubah localStorage tidak menambah kuota: ${testCPass ? "PASS" : "FAIL"}`);
  console.log(`d) Consent data tetap berjalan seperti sebelumnya: ${testDPass ? "PASS" : "FAIL"}`);
  console.log(`Tier Quota (Lite 7, Pro 20, Pro Max 30): ${tierPass ? "PASS" : "FAIL"}`);
  console.log(`Batas Ukuran Request (413): ${sizePass ? "PASS" : "FAIL"}`);
  console.log("==================================================================");

  if (!testAPass || !testBPass || !testCPass || !testDPass || !tierPass || !sizePass) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
