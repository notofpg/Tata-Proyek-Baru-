import crypto from "crypto";
import fs from "fs";
import path from "path";

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

const testEmail = "test_user_hardening@tata.local";
const sessionsPath = path.join(process.cwd(), "data", "sessions.json");
const accountsPath = path.join(process.cwd(), "data", "accounts.json");

// Pastikan direktori data ada
if (!fs.existsSync(path.join(process.cwd(), "data"))) {
  fs.mkdirSync(path.join(process.cwd(), "data"), { recursive: true });
}

const accountsObj: Record<string, any> = {};
accountsObj[testEmail] = {
  userId: "tata_test_user_hardening",
  email: testEmail,
  name: "User Hardening Test",
  avatarUrl: "",
  isPremium: false,
  premiumType: "free",
  createdAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString(),
};
fs.writeFileSync(accountsPath, JSON.stringify(accountsObj, null, 2));

const now = Date.now();
const tokenA = signTestToken(testEmail, now, now + 30 * 24 * 3600 * 1000);
const sessionsObj: Record<string, any> = {};
sessionsObj[tokenA] = {
  token: tokenA,
  email: testEmail,
  createdAt: now,
  expiresAt: now + 30 * 24 * 3600 * 1000,
};
fs.writeFileSync(sessionsPath, JSON.stringify(sessionsObj, null, 2));

// Simpan tokenA ke file sementara agar test runner bisa membacanya
fs.writeFileSync(path.join(process.cwd(), "data", "test_active_token.txt"), tokenA);

console.log("Setup sesi berhasil disimpan ke data/sessions.json");
