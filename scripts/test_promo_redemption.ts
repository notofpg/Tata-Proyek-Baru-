/**
 * Test script for promo code verification and redemption
 */

async function testPromo() {
  console.log('--- Testing Promo Code Verification & Redemption ---');

  const PROMO_CODES = ['TATAPROMAX', 'TATAGRATIS', 'TATABEBAS'];

  for (const code of PROMO_CODES) {
    console.log(`\nTesting Promo Code: "${code}"`);
    const checkRes = await fetch('http://localhost:3000/api/payment/check-promo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const checkData = await checkRes.json();
    console.log('Check Promo response:', checkData);

    if (!checkData.valid || checkData.tier !== 'pro_max') {
      throw new Error(`FAIL: Kode ${code} tidak valid sebagai pro_max!`);
    }

    const redeemRes = await fetch('http://localhost:3000/api/account/redeem-promo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, email: 'tester@tata.local' })
    });
    const redeemData = await redeemRes.json();
    console.log('Redeem Promo response:', redeemData);

    if (!redeemData.success || !redeemData.isPremium || redeemData.tier !== 'pro_max') {
      throw new Error(`FAIL: Gagal mengklaim kode ${code}!`);
    }

    console.log(`✓ PASS: Kode promo ${code} berhasil diverifikasi dan diklaim dengan tier: ${redeemData.tier}`);
  }

  console.log('\n=== SEMUA PENGUJIAN PROMO CODE BERHASIL 100% ===');
}

testPromo().catch(e => {
  console.error(e);
  process.exit(1);
});
