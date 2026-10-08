import http from "http";
import { spawn, ChildProcess } from "child_process";

const REDIS_PORT = 3199;
const SERVER_PORT = 3098;
const SERVER_URL = `http://127.0.0.1:${SERVER_PORT}`;

// In-memory data store for Mock Upstash Redis
const redisStorage = new Map<string, any>();
const redisSets = new Map<string, Set<string>>();
let redisIsAlive = true;

const mockRedisServer = http.createServer((req, res) => {
  if (!redisIsAlive) {
    res.statusCode = 503;
    res.end(JSON.stringify({ error: "Redis connection refused" }));
    return;
  }

  let body = "";
  req.on("data", chunk => (body += chunk));
  req.on("end", () => {
    res.setHeader("Content-Type", "application/json");

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
            const hasNx = cmdArr.some((x: any) => String(x).toLowerCase() === "nx");
            if (hasNx && redisStorage.has(key)) {
              results.push({ result: null });
            } else {
              redisStorage.set(key, val);
              results.push({ result: "OK" });
            }
          } else if (cmd === "get") {
            const key = cmdArr[1];
            const val = redisStorage.get(key) ?? null;
            results.push({ result: val });
          } else if (cmd === "del") {
            const key = cmdArr[1];
            redisStorage.delete(key);
            redisSets.delete(key);
            results.push({ result: 1 });
          } else if (cmd === "incr") {
            const key = cmdArr[1];
            const current = parseInt(String(redisStorage.get(key) || 0), 10);
            const next = current + 1;
            redisStorage.set(key, next);
            results.push({ result: next });
          } else if (cmd === "decr") {
            const key = cmdArr[1];
            const current = parseInt(String(redisStorage.get(key) || 0), 10);
            const next = Math.max(0, current - 1);
            redisStorage.set(key, next);
            results.push({ result: next });
          } else if (cmd === "sadd") {
            const key = cmdArr[1];
            if (!redisSets.has(key)) {
              redisSets.set(key, new Set());
            }
            const s = redisSets.get(key)!;
            let addedCount = 0;
            for (let i = 2; i < cmdArr.length; i++) {
              const member = String(cmdArr[i]);
              if (!s.has(member)) {
                s.add(member);
                addedCount++;
              }
            }
            results.push({ result: addedCount });
          } else if (cmd === "sismember") {
            const key = cmdArr[1];
            const member = String(cmdArr[2]);
            const s = redisSets.get(key);
            const isMem = s && s.has(member) ? 1 : 0;
            results.push({ result: isMem });
          } else if (cmd === "smembers") {
            const key = cmdArr[1];
            const s = redisSets.get(key);
            const arr = s ? Array.from(s) : [];
            results.push({ result: arr });
          } else if (cmd === "srem") {
            const key = cmdArr[1];
            const s = redisSets.get(key);
            let removedCount = 0;
            if (s) {
              for (let i = 2; i < cmdArr.length; i++) {
                const member = String(cmdArr[i]);
                if (s.delete(member)) removedCount++;
              }
            }
            results.push({ result: removedCount });
          } else if (cmd === "scan") {
            const pattern = cmdArr[3] ? String(cmdArr[3]).replace(/\*/g, "") : "";
            const matchedKeys: string[] = [];
            for (const k of redisStorage.keys()) {
              if (!pattern || k.includes(pattern)) matchedKeys.push(k);
            }
            results.push({ result: ["0", matchedKeys] });
          } else {
            results.push({ result: "OK" });
          }
        }

        if (isPipeline) {
          res.end(JSON.stringify(results));
        } else {
          res.end(JSON.stringify(results[0]));
        }
      } catch (err: any) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: err.message }));
      }
    } else {
      res.end(JSON.stringify({ result: "OK" }));
    }
  });
});

async function run() {
  console.log("=================================================================");
  console.log("PENGUJIAN RESMI: MANAJEMEN KODE PROMO & VOUCHER ATOMIK REDIS");
  console.log("=================================================================\n");

  // 1. Mulai Mock Upstash Redis Server
  await new Promise<void>((resolve) => {
    mockRedisServer.listen(REDIS_PORT, () => {
      console.log(`* Mock Upstash Redis Server aktif di http://127.0.0.1:${REDIS_PORT}`);
      resolve();
    });
  });

  // 2. Jalankan Instance Server Produksi dengan koneksi Redis aktif
  const serverProcess: ChildProcess = spawn("node", ["api/_server.cjs"], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(SERVER_PORT),
      SESSION_SECRET: "a_very_secure_secret_that_is_at_least_32_characters_long_12345",
      ADMIN_PASSWORD: "test_admin_pass_123",
      ADMIN_SESSION_SECRET: "admin_secret_that_is_at_least_32_characters_long_99999",
      UPSTASH_REDIS_REST_URL: `http://127.0.0.1:${REDIS_PORT}`,
      UPSTASH_REDIS_REST_TOKEN: "mock_redis_token",
      PAYMENTS_ENABLED: "true"
    },
    stdio: "inherit"
  });

  // Tunggu 2 detik agar server siap
  await new Promise((r) => setTimeout(r, 2000));

  try {
    // Helper untuk membuat sesi pengguna
    async function createTestSession(email: string) {
      // Daftarkan akun di Redis secara langsung via REST mock
      const accountData = {
        userId: `user_${email.replace(/[^a-z0-9]/gi, '_')}`,
        email: email.toLowerCase(),
        name: email.split('@')[0],
        avatarUrl: "",
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        isPremium: false,
        transactions: []
      };
      redisStorage.set(`tata:account:${email.toLowerCase()}`, JSON.stringify(accountData));

      // Buat token sesi
      const crypto = await import("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      const sessionData = {
        token,
        email: email.toLowerCase(),
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000
      };
      redisStorage.set(`tata:session:${token}`, JSON.stringify(sessionData));
      return { token, email: email.toLowerCase() };
    }

    // Periksa apakah seed dari promo_codes.json sukses
    console.log("--- Pemeriksaan Seed Kode Promo Resmi dari data/promo_codes.json ---");
    const seededFlag = redisStorage.get("tata:promo:seeded");
    const diskon20Meta = redisStorage.get("tata:promo:meta:DISKON20");
    const diskonSekaliMeta = redisStorage.get("tata:promo:meta:DISKON_SEKALI");
    const diskonSekaliUsers = redisSets.get("tata:promo:used_users:DISKON_SEKALI");

    console.log(`  ✓ tata:promo:seeded = ${seededFlag}`);
    console.log(`  ✓ tata:promo:meta:DISKON20 = ${Boolean(diskon20Meta)}`);
    console.log(`  ✓ tata:promo:meta:DISKON_SEKALI = ${Boolean(diskonSekaliMeta)}`);
    console.log(`  ✓ tata:promo:used_users:DISKON_SEKALI berisi test_lite@example.com = ${diskonSekaliUsers?.has("test_lite@example.com")}`);

    if (!diskon20Meta || !diskonSekaliMeta) {
      throw new Error("Gagal: Seed promo codes ke Redis tidak berjalan dengan benar.");
    }
    console.log("👉 HASIL SEED: SUKSES 100%\n");

    // -------------------------------------------------------------------------
    // UJI a): Kode kuota 1: akun A berhasil, akun B ditolak
    // -------------------------------------------------------------------------
    console.log("--- UJI (a): Kode kuota 1: akun A berhasil, akun B ditolak ---");
    
    // Daftarkan kode promo kuota 1 di Redis
    const codeA = "KUOTA1_VOUCHER";
    redisStorage.set(`tata:promo:meta:${codeA}`, JSON.stringify({
      code: codeA,
      type: "free",
      tier: "pro",
      planName: "Tata Pro (Uji Kuota 1)",
      durationDays: 30,
      maxUses: 1,
      expiresAt: null
    }));
    redisStorage.set(`tata:promo:used_count:${codeA}`, 0);
    redisSets.set(`tata:promo:used_users:${codeA}`, new Set());

    const userA = await createTestSession("akun_a@example.com");
    const userB = await createTestSession("akun_b@example.com");

    // 1. Akun A klaim
    const resA = await fetch(`${SERVER_URL}/api/account/redeem-promo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userA.token}`
      },
      body: JSON.stringify({ code: codeA })
    });
    const jsonA: any = await resA.json();
    console.log(`  1. Akun A klaim KUOTA1_VOUCHER: HTTP ${resA.status}`, jsonA.message || jsonA.error);
    if (resA.status !== 200 || !jsonA.success || !jsonA.isPremium) {
      throw new Error(`Uji (a) Gagal: Akun A harusnya berhasil mengklaim voucher kuota 1.`);
    }

    // 2. Akun B klaim
    const resB = await fetch(`${SERVER_URL}/api/account/redeem-promo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userB.token}`
      },
      body: JSON.stringify({ code: codeA })
    });
    const jsonB: any = await resB.json();
    console.log(`  2. Akun B klaim KUOTA1_VOUCHER: HTTP ${resB.status}`, jsonB.message || jsonB.error);
    if (resB.status !== 400 || jsonB.error !== "code_depleted") {
      throw new Error(`Uji (a) Gagal: Akun B harusnya ditolak dengan error code_depleted.`);
    }

    console.log("👉 HASIL UJI (a): PASS (Akun A berhasil, Akun B ditolak karena kuota habis)\n");

    // -------------------------------------------------------------------------
    // UJI b): Akun A ulang: ditolak (already_claimed)
    // -------------------------------------------------------------------------
    console.log("--- UJI (b): Akun A mengulang klaim: ditolak ---");
    const resARepeat = await fetch(`${SERVER_URL}/api/account/redeem-promo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userA.token}`
      },
      body: JSON.stringify({ code: codeA })
    });
    const jsonARepeat: any = await resARepeat.json();
    console.log(`  1. Akun A klaim ulang KUOTA1_VOUCHER: HTTP ${resARepeat.status}`, jsonARepeat.message || jsonARepeat.error);
    if (resARepeat.status !== 400 || jsonARepeat.error !== "already_claimed") {
      throw new Error(`Uji (b) Gagal: Akun A harusnya ditolak dengan error already_claimed.`);
    }
    console.log("👉 HASIL UJI (b): PASS (Akun A mengulang klaim ditolak secara tegas)\n");

    // -------------------------------------------------------------------------
    // UJI c): Dua permintaan bersamaan: hanya satu berhasil
    // -------------------------------------------------------------------------
    console.log("--- UJI (c): Dua permintaan bersamaan: hanya satu berhasil ---");
    const codeC = "CONCURRENT_VOUCHER";
    redisStorage.set(`tata:promo:meta:${codeC}`, JSON.stringify({
      code: codeC,
      type: "free",
      tier: "pro",
      planName: "Tata Pro (Uji Concurrent)",
      durationDays: 30,
      maxUses: 1,
      expiresAt: null
    }));
    redisStorage.set(`tata:promo:used_count:${codeC}`, 0);
    redisSets.set(`tata:promo:used_users:${codeC}`, new Set());

    const userC1 = await createTestSession("concurrent_1@example.com");
    const userC2 = await createTestSession("concurrent_2@example.com");

    const [claimC1, claimC2] = await Promise.all([
      fetch(`${SERVER_URL}/api/account/redeem-promo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userC1.token}`
        },
        body: JSON.stringify({ code: codeC })
      }).then(async r => ({ status: r.status, data: await r.json() })),
      fetch(`${SERVER_URL}/api/account/redeem-promo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userC2.token}`
        },
        body: JSON.stringify({ code: codeC })
      }).then(async r => ({ status: r.status, data: await r.json() }))
    ]);

    console.log(`  Hasil Permintaan 1: HTTP ${claimC1.status}`, (claimC1.data as any).message || (claimC1.data as any).error);
    console.log(`  Hasil Permintaan 2: HTTP ${claimC2.status}`, (claimC2.data as any).message || (claimC2.data as any).error);

    const successCount = [claimC1, claimC2].filter(c => c.status === 200).length;
    const rejectedCount = [claimC1, claimC2].filter(c => c.status === 400 && (c.data as any).error === "code_depleted").length;

    console.log(`  ✓ Jumlah Berhasil: ${successCount}, Jumlah Ditolak (Depleted): ${rejectedCount}`);
    const finalUsedCount = redisStorage.get(`tata:promo:used_count:${codeC}`);
    console.log(`  ✓ Nilai Counter Akhir di Redis: ${finalUsedCount}`);

    if (successCount !== 1 || rejectedCount !== 1 || finalUsedCount !== 1) {
      throw new Error(`Uji (c) Gagal: Harus tepat 1 berhasil dan 1 ditolak, counter harus tepat 1.`);
    }
    console.log("👉 HASIL UJI (c): PASS (Operasi atomik mencegah over-quota pada request bersamaan)\n");

    // -------------------------------------------------------------------------
    // UJI d): Redis mati: tidak ada premium/diskon diberikan
    // -------------------------------------------------------------------------
    console.log("--- UJI (d): Redis mati: tidak ada premium/diskon diberikan ---");
    // Matikan mock redis
    redisIsAlive = false;

    const userD = await createTestSession("user_d_offline@example.com");

    const resD = await fetch(`${SERVER_URL}/api/account/redeem-promo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userD.token}`
      },
      body: JSON.stringify({ code: codeA })
    });
    const jsonD: any = await resD.json();
    console.log(`  1. Klaim voucher saat Redis mati: HTTP ${resD.status}`, jsonD);

    if (resD.status !== 503 && resD.status !== 500) {
      throw new Error(`Uji (d) Gagal: Server harusnya mengembalikan status 503/500 saat Redis mati.`);
    }

    // Hidupkan kembali mock redis untuk memeriksa akun D
    redisIsAlive = true;
    const rawAccD = redisStorage.get("tata:account:user_d_offline@example.com");
    const accD = rawAccD ? JSON.parse(rawAccD) : null;
    console.log(`  ✓ Status Premium Akun D di database: isPremium = ${accD?.isPremium}`);

    if (accD && accD.isPremium === true) {
      throw new Error(`Uji (d) Gagal: Akun D TIDAK BOLEH menjadi premium jika Redis mati.`);
    }

    console.log("👉 HASIL UJI (d): PASS (Tidak ada premium yang diberikan jika Redis mati)\n");

    console.log("=================================================================");
    console.log("🏆 SEMUA PENGUJIAN (a, b, c, d) LULUS 100%!");
    console.log("=================================================================");
  } finally {
    serverProcess.kill();
    mockRedisServer.close();
  }
}

run().catch(err => {
  console.error("FATAL ERROR DALAM PENGUJIAN:", err);
  process.exit(1);
});
