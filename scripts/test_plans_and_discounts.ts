import crypto from "crypto";
import fs from "fs";
import path from "path";
import { TATA_CANONICAL_PLANS, TATA_PLAN_ALIASES, getCanonicalPlan } from "../src/plans";

const BASE_URL = "http://localhost:3000";
const MIDTRANS_SERVER_KEY = "mock_midtrans_server_key";

async function runTests() {
  console.log("=================================================================");
  console.log("PENGUJIAN RESMI: TUGAS A & TUGAS B (PAKET & KODE PROMO DISKON)");
  console.log("=================================================================\n");

  const dataDir = path.join(process.cwd(), "data");
  const accountsFile = path.join(dataDir, "accounts.json");
  const aiTokensFile = path.join(dataDir, "ai_test_tokens.json");
  if (!fs.existsSync(aiTokensFile)) {
    console.error("ai_test_tokens.json tidak ditemukan!");
    process.exit(1);
  }

  const tokenData = JSON.parse(fs.readFileSync(aiTokensFile, "utf-8"));
  const testEmail = tokenData.liteEmail; // test_lite@example.com
  const token = tokenData.liteToken;

  // Daftarkan promo diskon di server
  const promo20 = {
    code: "DISKON20",
    type: "discount",
    discountType: "percent",
    discountValue: 20,
    maxUses: 100,
    usedCount: 0,
    usedBy: []
  };

  const promoSekali = {
    code: "DISKON_SEKALI",
    type: "discount",
    discountType: "fixed",
    discountValue: 10000,
    maxUses: 100,
    usedCount: 0,
    usedBy: []
  };

  await fetch(`${BASE_URL}/api/dev/set-promo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "DISKON20", promo: promo20 })
  });

  await fetch(`${BASE_URL}/api/dev/set-promo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "DISKON_SEKALI", promo: promoSekali })
  });

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  let passedAll = true;

  // -------------------------------------------------------------------------
  // UJI a): Tiap paket: nominal Midtrans = harga paket
  // -------------------------------------------------------------------------
  console.log("--- Uji (a): Tiap paket: nominal Midtrans = harga paket ---");
  const planIds = Object.keys(TATA_CANONICAL_PLANS);
  let ujiAPassed = true;

  for (const pid of planIds) {
    const expectedPlan = TATA_CANONICAL_PLANS[pid];
    const res = await fetch(`${BASE_URL}/api/payment/create-order`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ plan: pid })
    });

    const data: any = await res.json();
    if (res.status !== 200 || data.amount !== expectedPlan.price || data.grossAmount !== expectedPlan.price) {
      console.error(`❌ UJI a GAGAL untuk paket ${pid}: Diharapkan Rp ${expectedPlan.price}, didapat status ${res.status}, amount: ${data?.amount}`);
      ujiAPassed = false;
      passedAll = false;
    } else {
      console.log(`  ✓ Paket [${pid}] (${expectedPlan.name}): Nominal Midtrans = Rp ${data.amount.toLocaleString('id-ID')} (Sesuai)`);
    }
  }

  // Uji alias lama (monthly -> pro_monthly, yearly -> pro_yearly, dll)
  for (const [alias, canonicalId] of Object.entries(TATA_PLAN_ALIASES)) {
    const expectedPlan = TATA_CANONICAL_PLANS[canonicalId];
    const res = await fetch(`${BASE_URL}/api/payment/create-order`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ plan: alias })
    });
    const data: any = await res.json();
    if (res.status !== 200 || data.amount !== expectedPlan.price) {
      console.error(`❌ UJI a GAGAL untuk alias ${alias}: Diharapkan Rp ${expectedPlan.price}, didapat ${data?.amount}`);
      ujiAPassed = false;
      passedAll = false;
    } else {
      console.log(`  ✓ Alias [${alias}] -> [${canonicalId}]: Nominal Midtrans = Rp ${data.amount.toLocaleString('id-ID')} (Sesuai)`);
    }
  }

  if (ujiAPassed) {
    console.log("👉 HASIL UJI (a): BERHASIL (Semua paket terdaftar dan nominal Midtrans tepat)\n");
  } else {
    console.error("👉 HASIL UJI (a): GAGAL\n");
  }

  // -------------------------------------------------------------------------
  // UJI b): Plan tidak dikenal: 400. Jangan pernah fallback ke monthly.
  // -------------------------------------------------------------------------
  console.log("--- Uji (b): Plan tidak dikenal: 400 (Tanpa fallback) ---");
  let ujiBPassed = true;

  const unknownPlans = ["paket_palsu_123", "gold_plan", "super_premium", ""];
  for (const badPlan of unknownPlans) {
    const res = await fetch(`${BASE_URL}/api/payment/create-order`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ plan: badPlan })
    });
    const data: any = await res.json();
    if (res.status === 400 && data.error === "invalid_plan") {
      console.log(`  ✓ Plan "${badPlan}": Ditolak dengan HTTP 400 (invalid_plan)`);
    } else {
      console.error(`❌ UJI b GAGAL untuk "${badPlan}": HTTP ${res.status}, response:`, data);
      ujiBPassed = false;
      passedAll = false;
    }
  }

  if (ujiBPassed) {
    console.log("👉 HASIL UJI (b): BERHASIL (Paket tidak dikenal konsisten ditolak 400)\n");
  } else {
    console.error("👉 HASIL UJI (b): GAGAL\n");
  }

  // -------------------------------------------------------------------------
  // UJI c): Kode promo diskon 20% membuat invoice Midtrans senilai 80% harga asli
  // -------------------------------------------------------------------------
  console.log("--- Uji (c): Kode promo diskon 20% membuat invoice Midtrans 80% ---");
  let ujiCPassed = true;

  const targetPlan = TATA_CANONICAL_PLANS.promax_yearly; // Rp 149.000
  const expectedDiscount = Math.round(targetPlan.price * 0.20); // Rp 29.800
  const expectedFinal = targetPlan.price - expectedDiscount; // Rp 119.200 (80%)

  const orderRes = await fetch(`${BASE_URL}/api/payment/create-order`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      plan: targetPlan.id,
      promoCode: "DISKON20"
    })
  });

  const orderData: any = await orderRes.json();
  if (
    orderRes.status === 200 &&
    orderData.amount === expectedFinal &&
    orderData.originalAmount === targetPlan.price &&
    orderData.promoCode === "DISKON20"
  ) {
    console.log(`  ✓ Harga Asli: Rp ${orderData.originalAmount.toLocaleString('id-ID')}`);
    console.log(`  ✓ Kode Promo Diskon 20%: Diskon Rp ${expectedDiscount.toLocaleString('id-ID')}`);
    console.log(`  ✓ Nominal Invoice Midtrans: Rp ${orderData.amount.toLocaleString('id-ID')} (Tepat 80% dari harga asli)`);
    console.log("👉 HASIL UJI (c): BERHASIL\n");
  } else {
    console.error("❌ UJI c GAGAL: Response tidak sesuai:", orderData);
    ujiCPassed = false;
    passedAll = false;
  }

  // -------------------------------------------------------------------------
  // UJI d): Kode promo diskon dipakai dua kali oleh akun yang sama: ditolak kedua kalinya
  // -------------------------------------------------------------------------
  console.log("--- Uji (d): Kode promo diskon dipakai 2x oleh akun yang sama: ditolak ---");
  let ujiDPassed = true;

  // 1. Pesanan pertama dengan kode DISKON_SEKALI
  const onceOrderRes = await fetch(`${BASE_URL}/api/payment/create-order`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      plan: "pro_monthly",
      promoCode: "DISKON_SEKALI"
    })
  });
  const onceOrderData: any = await onceOrderRes.json();
  if (onceOrderRes.status !== 200) {
    console.error("❌ Gagal membuat pesanan pertama DISKON_SEKALI:", onceOrderData);
    ujiDPassed = false;
    passedAll = false;
  } else {
    console.log(`  ✓ Pembuatan pesanan ke-1 dengan DISKON_SEKALI sukses (Order: ${onceOrderData.orderId})`);
    
    // Simulasikan pembayaran sukses dan klaim via upgrade-premium agar pemakaian promo tercatat untuk akun
    const upgradeRes = await fetch(`${BASE_URL}/api/account/upgrade-premium`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        email: testEmail,
        plan: "pro_monthly",
        paymentProof: {
          provider: "midtrans",
          orderId: onceOrderData.orderId
        }
      })
    });
    const upgradeData: any = await upgradeRes.json();
    if (upgradeRes.status !== 200 || !upgradeData.success) {
      console.error("❌ Gagal klaim pesanan ke-1:", upgradeData);
      ujiDPassed = false;
      passedAll = false;
    } else {
      console.log(`  ✓ Pembayaran ke-1 diverifikasi dan promo terpakai oleh ${testEmail}`);

      // 2. Percobaan kedua dengan kode yang sama oleh akun yang sama
      const secondOrderRes = await fetch(`${BASE_URL}/api/payment/create-order`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          plan: "pro_monthly",
          promoCode: "DISKON_SEKALI"
        })
      });
      const secondOrderData: any = await secondOrderRes.json();
      if (secondOrderRes.status === 400 && secondOrderData.error === "promo_already_used") {
        console.log(`  ✓ Percobaan pesanan ke-2 ditolak: HTTP 400 (${secondOrderData.error}) - "${secondOrderData.message}"`);
      } else {
        console.error("❌ UJI d GAGAL: Percobaan ke-2 tidak ditolak dengan semestinya:", secondOrderData);
        ujiDPassed = false;
        passedAll = false;
      }

      // Cek juga di endpoint /api/payment/check-promo
      const checkPromoRes = await fetch(`${BASE_URL}/api/payment/check-promo`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          code: "DISKON_SEKALI",
          plan: "pro_monthly"
        })
      });
      const checkPromoData: any = await checkPromoRes.json();
      if (checkPromoRes.status === 400 && checkPromoData.error === "already_used") {
        console.log(`  ✓ Pengecekan promo ke-2 di /api/payment/check-promo ditolak: HTTP 400 (${checkPromoData.error})`);
      } else {
        console.error("❌ Pengecekan check-promo tidak menolak:", checkPromoData);
        ujiDPassed = false;
        passedAll = false;
      }
    }
  }

  if (ujiDPassed) {
    console.log("👉 HASIL UJI (d): BERHASIL (Klaim promo ganda ditolak)\n");
  } else {
    console.error("👉 HASIL UJI (d): GAGAL\n");
  }

  // -------------------------------------------------------------------------
  // UJI e): Klaim setelah webhook tidak error (Idempoten)
  // -------------------------------------------------------------------------
  console.log("--- Uji (e): Klaim setelah webhook tidak error (Idempoten) ---");
  let ujiEPassed = true;

  // 1. Buat pesanan baru
  const webhookOrderRes = await fetch(`${BASE_URL}/api/payment/create-order`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ plan: "promax_monthly" })
  });
  const webhookOrderData: any = await webhookOrderRes.json();
  const webhookOrderId = webhookOrderData.orderId;
  const webhookAmount = webhookOrderData.amount;

  console.log(`  ✓ Order baru dibuat: ${webhookOrderId} (Rp ${webhookAmount})`);

  // 2. Simulasi webhook resmi dari Midtrans
  const statusCode = "200";
  const grossAmountStr = `${webhookAmount}.00`;
  const signaturePayload = `${webhookOrderId}${statusCode}${grossAmountStr}${MIDTRANS_SERVER_KEY}`;
  const validSignature = crypto.createHash("sha512").update(signaturePayload).digest("hex");

  const webhookCallRes = await fetch(`${BASE_URL}/api/payment/midtrans-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      order_id: webhookOrderId,
      status_code: statusCode,
      gross_amount: grossAmountStr,
      signature_key: validSignature,
      transaction_status: "settlement",
      payment_type: "qris",
      transaction_id: `midtrans_txn_${Date.now()}`
    })
  });

  const webhookCallData: any = await webhookCallRes.json();
  if (webhookCallRes.status !== 200 || webhookCallData.status !== "ok") {
    console.error("❌ Webhook simulasi gagal:", webhookCallData);
    ujiEPassed = false;
    passedAll = false;
  } else {
    console.log(`  ✓ Webhook Midtrans diterima dan memproses aktivasi premium: status ${webhookCallData.status}`);

    // 3. Klien memanggil /api/account/upgrade-premium setelah webhook memproses order
    const claimAfterWebhookRes = await fetch(`${BASE_URL}/api/account/upgrade-premium`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        email: testEmail,
        plan: "promax_monthly",
        paymentProof: {
          provider: "midtrans",
          orderId: webhookOrderId
        }
      })
    });

    const claimAfterWebhookData: any = await claimAfterWebhookRes.json();
    if (claimAfterWebhookRes.status === 200 && claimAfterWebhookData.success === true) {
      console.log(`  ✓ Klaim browser setelah webhook SUKSES (Idempoten tanpa error): "${claimAfterWebhookData.message}"`);
      console.log(`  ✓ Akun berstatus Premium: isPremium = ${claimAfterWebhookData.account?.isPremium}`);
    } else {
      console.error("❌ UJI e GAGAL: Klaim setelah webhook mengembalikan error:", claimAfterWebhookData);
      ujiEPassed = false;
      passedAll = false;
    }
  }

  if (ujiEPassed) {
    console.log("👉 HASIL UJI (e): BERHASIL (Klaim setelah webhook idempoten dan tidak error)\n");
  } else {
    console.error("👉 HASIL UJI (e): GAGAL\n");
  }

  // Bersihkan kembali status akun test_lite agar tetap non-premium
  try {
    const accs = JSON.parse(fs.readFileSync(accountsFile, "utf-8") || "{}");
    if (accs[testEmail]) {
      accs[testEmail].isPremium = false;
      accs[testEmail].premiumType = "free";
      delete accs[testEmail].premiumExpiresAt;
      fs.writeFileSync(accountsFile, JSON.stringify(accs, null, 2));
    }
  } catch(e) {}

  console.log("=================================================================");
  if (passedAll) {
    console.log("🏆 SEMUA PENGUJIAN a, b, c, d, e BERHASIL 100%!");
  } else {
    console.error("❌ TERDAPAT PENGUJIAN YANG GAGAL.");
    process.exit(1);
  }
  console.log("=================================================================");
}

runTests().catch((err) => {
  console.error("Terjadi error tak terduga saat pengujian:", err);
  process.exit(1);
});
