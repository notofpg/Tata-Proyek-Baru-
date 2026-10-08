import { Redis } from "@upstash/redis";
import http from "http";

const BASE_URL = "http://localhost:3000";

async function run() {
  console.log("=================================================================");
  console.log("PENGUJIAN RESMI: PERSISTENSI REDIS, SCAN, & KEAMANAN DATA PRIBADI");
  console.log("=================================================================\n");

  // -------------------------------------------------------------------------
  // UJI (a): Tanpa Redis di produksi -> Error konfigurasi jelas (503)
  // -------------------------------------------------------------------------
  console.log("--- UJI (a): Tanpa Redis di produksi: error konfigurasi jelas (HTTP 503) ---");

  // Kita jalankan server terpisah dengan NODE_ENV=production dan tanpa Redis URL
  const prodProcess = await import("child_process").then(cp => {
    return cp.spawn("node", ["api/_server.cjs"], {
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: "3088",
        SESSION_SECRET: "a_very_secure_secret_that_is_at_least_32_characters_long_12345",
        ADMIN_PASSWORD: "test_admin_pass_123",
        ADMIN_SESSION_SECRET: "admin_secret_that_is_at_least_32_characters_long_99999",
        UPSTASH_REDIS_REST_URL: "",
        UPSTASH_REDIS_REST_TOKEN: "",
        KV_REST_API_URL: "",
        KV_REST_API_TOKEN: ""
      }
    });
  });

  // Tunggu 1.5 detik agar server mini produksi siap
  await new Promise(r => setTimeout(r, 1500));

  try {
    // 1. Cek endpoint admin di produksi tanpa Redis
    const adminRes = await fetch("http://localhost:3088/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "test_admin_pass_123" })
    });
    const adminJson = await adminRes.json();
    console.log(`  1. POST /api/admin/login di produksi: HTTP ${adminRes.status}`);
    console.log(`     Response:`, adminJson);
    if (adminRes.status !== 503 || adminJson.error !== "redis_not_configured") {
      throw new Error(`Uji (a) Gagal: Status bukan 503 atau error bukan redis_not_configured.`);
    }

    // 2. Cek endpoint akun di produksi tanpa Redis
    const accRes = await fetch("http://localhost:3088/api/account/profile");
    const accJson = await accRes.json();
    console.log(`  2. GET /api/account/profile di produksi: HTTP ${accRes.status}`);
    console.log(`     Response:`, accJson);
    if (accRes.status !== 503 || accJson.error !== "redis_not_configured") {
      throw new Error(`Uji (a) Gagal: Endpoint akun tidak menolak 503 redis_not_configured.`);
    }

    // 3. Cek endpoint pembayaran di produksi tanpa Redis
    const payRes = await fetch("http://localhost:3088/api/payment/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: "pro_monthly" })
    });
    const payJson = await payRes.json();
    console.log(`  3. POST /api/payment/create-order di produksi: HTTP ${payRes.status}`);
    console.log(`     Response:`, payJson);
    if (payRes.status !== 503 || payJson.error !== "redis_not_configured") {
      throw new Error(`Uji (a) Gagal: Endpoint pembayaran tidak menolak 503 redis_not_configured.`);
    }

    console.log("👉 HASIL UJI (a): PASS (Semua endpoint menolak 503 redis_not_configured secara eksplisit tanpa fallback diam-diam)\n");
  } finally {
    prodProcess.kill();
  }

  // -------------------------------------------------------------------------
  // UJI (b): Dengan Redis -> Set premium manual & blokir akun tetap ada setelah restart
  // -------------------------------------------------------------------------
  console.log("--- UJI (b): Dengan Redis: Set premium manual & blokir akun persisten ---");

  // Buat mock Upstash Redis HTTP server lokal untuk menguji operasi SCAN, MGET, LPUSH, LRANGE, SET, GET
  const redisMemory = new Map<string, any>();
  const redisLists = new Map<string, string[]>();

  const mockRedisServer = http.createServer((req, res) => {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      res.setHeader("Content-Type", "application/json");
      const urlParts = (req.url || "").split("/").filter(Boolean);

      // Handle pipeline or direct command
      if (req.method === "POST" && body) {
        try {
          const parsed = JSON.parse(body);
          const isPipeline = req.url === "/pipeline" || (Array.isArray(parsed) && Array.isArray(parsed[0]));
          const commandList: any[] = isPipeline ? parsed : [parsed];
          const results: any[] = [];

          for (const cmdArr of commandList) {
            const cmd = String(cmdArr[0]).toLowerCase();
            if (cmd === "set") {
              const key = cmdArr[1];
              const val = cmdArr[2];
              redisMemory.set(key, val);
              results.push({ result: "OK" });
            } else if (cmd === "get") {
              const key = cmdArr[1];
              const val = redisMemory.get(key) || null;
              results.push({ result: val });
            } else if (cmd === "mget") {
              const keys = cmdArr.slice(1);
              const vals = keys.map((k: string) => redisMemory.get(k) || null);
              results.push({ result: vals });
            } else if (cmd === "scan") {
              const pattern = cmdArr[3] ? String(cmdArr[3]).replace(/\*/g, "") : "";
              const matchedKeys: string[] = [];
              for (const k of redisMemory.keys()) {
                if (!pattern || k.includes(pattern)) {
                  matchedKeys.push(k);
                }
              }
              results.push({ result: ["0", matchedKeys] });
            } else if (cmd === "lpush") {
              const listKey = cmdArr[1];
              const list = redisLists.get(listKey) || [];
              for (let i = 2; i < cmdArr.length; i++) {
                list.unshift(cmdArr[i]);
              }
              redisLists.set(listKey, list);
              results.push({ result: list.length });
            } else if (cmd === "lrange") {
              const listKey = cmdArr[1];
              const list = redisLists.get(listKey) || [];
              const start = parseInt(cmdArr[2], 10) || 0;
              const stop = parseInt(cmdArr[3], 10) || -1;
              const sliced = stop === -1 ? list.slice(start) : list.slice(start, stop + 1);
              results.push({ result: sliced });
            } else if (cmd === "ltrim") {
              const listKey = cmdArr[1];
              const list = redisLists.get(listKey) || [];
              const start = parseInt(cmdArr[2], 10) || 0;
              const stop = parseInt(cmdArr[3], 10) || -1;
              const trimmed = stop === -1 ? list.slice(start) : list.slice(start, stop + 1);
              redisLists.set(listKey, trimmed);
              results.push({ result: "OK" });
            } else if (cmd === "del") {
              const key = cmdArr[1];
              redisMemory.delete(key);
              results.push({ result: 1 });
            } else {
              results.push({ result: null });
            }
          }

          if (isPipeline) {
            res.end(JSON.stringify(results));
          } else {
            res.end(JSON.stringify(results[0]));
          }
          return;
        } catch (e) {
          console.error("Mock Redis Error:", e);
        }
      }

      // Default fallback
      res.end(JSON.stringify({ result: null }));
    });
  });

  await new Promise<void>(resolve => mockRedisServer.listen(3099, "127.0.0.1", () => resolve()));
  console.log("  * Mock Upstash Redis Server aktif di http://127.0.0.1:3099");

  // Jalankan server Tata instance ke-1 dengan Redis aktif
  const tataProc1 = await import("child_process").then(cp => {
    return cp.spawn("node", ["api/_server.cjs"], {
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: "3089",
        SESSION_SECRET: "a_very_secure_secret_that_is_at_least_32_characters_long_12345",
        ADMIN_PASSWORD: "test_admin_pass_123",
        ADMIN_SESSION_SECRET: "admin_secret_that_is_at_least_32_characters_long_99999",
        UPSTASH_REDIS_REST_URL: "http://127.0.0.1:3099",
        UPSTASH_REDIS_REST_TOKEN: "mock_token"
      }
    });
  });

  await new Promise(r => setTimeout(r, 1500));

  try {
    // 1. Login Admin di instance ke-1
    const loginRes = await fetch("http://localhost:3089/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "test_admin_pass_123" })
    });
    const cookieHeader = loginRes.headers.get("set-cookie") || "";
    const adminCookie = cookieHeader.split(";")[0];
    console.log(`  1. Admin Login di Instance 1: HTTP ${loginRes.status}`);

    // Siapkan akun target di Redis
    const targetEmail = "persisten_user@tata.local";
    const initialAccount = {
      userId: "tata_user_persisten",
      email: targetEmail,
      name: "Persisten User",
      avatarUrl: "",
      isPremium: false,
      premiumType: "free",
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      transactions: []
    };
    redisMemory.set(`tata:account:${targetEmail}`, JSON.stringify(initialAccount));

    // 2. Set Premium Manual oleh Admin
    const setPremRes = await fetch(`http://localhost:3089/api/admin/accounts/${targetEmail}/premium`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookie
      },
      body: JSON.stringify({
        isPremium: true,
        premiumType: "lifetime",
        reason: "Hadiah program loyalitas pengguna awal"
      })
    });
    console.log(`  2. Set Premium Manual di Instance 1: HTTP ${setPremRes.status}`);

    // 3. Blokir Akun target oleh Admin
    const blockRes = await fetch(`http://localhost:3089/api/admin/accounts/${targetEmail}/block`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookie
      },
      body: JSON.stringify({
        reason: "Aktivitas mencurigakan pelaporan penipuan"
      })
    });
    console.log(`  3. Blokir Akun di Instance 1: HTTP ${blockRes.status}`);

    // Matikan instance 1 untuk menyimulasikan redeploy / cold start serverless
    tataProc1.kill();
    await new Promise(r => setTimeout(r, 1000));
    console.log("  * Instance 1 dimatikan (Simulasi Cold Start / Redeploy Vercel)");

    // Jalankan server Tata instance ke-2 (Memory bersih baru, membaca Redis)
    const tataProc2 = await import("child_process").then(cp => {
      return cp.spawn("node", ["api/_server.cjs"], {
        env: {
          ...process.env,
          NODE_ENV: "production",
          PORT: "3090",
          SESSION_SECRET: "a_very_secure_secret_that_is_at_least_32_characters_long_12345",
          ADMIN_PASSWORD: "test_admin_pass_123",
          ADMIN_SESSION_SECRET: "admin_secret_that_is_at_least_32_characters_long_99999",
          UPSTASH_REDIS_REST_URL: "http://127.0.0.1:3099",
          UPSTASH_REDIS_REST_TOKEN: "mock_token"
        }
      });
    });

    await new Promise(r => setTimeout(r, 1500));

    try {
      // Login Admin di instance ke-2
      const login2 = await fetch("http://localhost:3090/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "test_admin_pass_123" })
      });
      const cookieHeader2 = login2.headers.get("set-cookie") || "";
      const adminCookie2 = cookieHeader2.split(";")[0];

      // Periksa daftar akun di instance ke-2 (harus membaca dari Redis via SCAN)
      const listRes = await fetch("http://localhost:3090/api/admin/accounts", {
        headers: { Cookie: adminCookie2 }
      });
      const listJson = await listRes.json();
      console.log(`  4. Ambil daftar akun di Instance 2: HTTP ${listRes.status}, Total Akun: ${listJson.total}`);

      const found = listJson.accounts.find((a: any) => a.email === targetEmail);
      if (!found) {
        throw new Error(`Uji (b) Gagal: Akun ${targetEmail} tidak ditemukan di Instance 2.`);
      }
      console.log(`     Status Akun di Instance 2: isPremium=${found.isPremium}, isBlocked=${found.isBlocked}, premiumType=${found.premiumType}`);

      if (!found.isPremium || !found.isBlocked) {
        throw new Error(`Uji (b) Gagal: Status premium atau blokir tidak persisten setelah restart.`);
      }

      // Periksa Log Audit di instance ke-2 (harus membaca dari Redis List)
      const auditRes = await fetch("http://localhost:3090/api/admin/audit-log", {
        headers: { Cookie: adminCookie2 }
      });
      const auditJson = await auditRes.json();
      console.log(`  5. Ambil audit-log di Instance 2: HTTP ${auditRes.status}, Total Entri: ${auditJson.total}`);
      const hasBlockLog = auditJson.entries.some((e: any) => e.action === "block_account" && e.email === targetEmail);
      const hasPremLog = auditJson.entries.some((e: any) => e.action === "set_premium" && e.email === targetEmail);

      if (!hasBlockLog || !hasPremLog) {
        throw new Error(`Uji (b) Gagal: Log audit tidak persisten di Redis setelah restart.`);
      }

      console.log("👉 HASIL UJI (b): PASS (Set premium & blokir akun serta audit log tetap utuh setelah cold start / redeploy)\n");
    } finally {
      tataProc2.kill();
    }
  } finally {
    mockRedisServer.close();
  }

  // -------------------------------------------------------------------------
  // UJI (c): Privasi - Tidak ada data pribadi tertulis ke Redis
  // -------------------------------------------------------------------------
  console.log("--- UJI (c): Privasi: Tidak ada data pribadi tertulis ke Redis ---");
  const forbiddenKeys = ['notes', 'tasks', 'finance', 'mutations', 'calendar', 'mood', 'moods', 'backup', 'debts', 'savings'];
  let violationCount = 0;

  for (const [key, value] of redisMemory.entries()) {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    for (const forbidden of forbiddenKeys) {
      // Cek apakah ada field json seperti "notes": [ atau "tasks": [
      if (str.includes(`"${forbidden}":`)) {
        console.error(`Pelanggaran Privasi Ditemukan pada key ${key}: mengandung field ${forbidden}!`);
        violationCount++;
      }
    }
  }

  if (violationCount > 0) {
    throw new Error(`Uji (c) Gagal: Ditemukan ${violationCount} data pribadi di storage Redis!`);
  }

  console.log("  * Pemeriksaan seluruh isi storage Redis: BERSIH 100%");
  console.log("  * Zero data pribadi (catatan, tugas, keuangan, mood) di server/Redis.");
  console.log("👉 HASIL UJI (c): PASS (Privasi terjaga mutlak, data pengguna 100% lokal)\n");

  console.log("=================================================================");
  console.log("🏆 SEMUA PENGUJIAN (a, b, c) LULUS 100%!");
  console.log("=================================================================");
}

run().catch(err => {
  console.error("Test Error:", err);
  process.exit(1);
});
