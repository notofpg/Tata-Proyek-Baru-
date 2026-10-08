/**
 * Comprehensive integration test script for Tata App server endpoints
 */

async function testAll() {
  console.log('--- STARTING COMPREHENSIVE TATA APP SERVER AUDIT ---');

  const BASE = 'http://localhost:3000';

  // 1. Payment config
  const res1 = await fetch(`${BASE}/api/payment/config`);
  const d1 = await res1.json();
  console.log('1. Payment Config:', d1);

  // 2. Google Client ID
  const res2 = await fetch(`${BASE}/api/auth/google-client-id`);
  const d2 = await res2.json();
  console.log('2. Google Client ID:', d2);

  // 3. Check Promo Code TATAPROMAX
  const res3 = await fetch(`${BASE}/api/payment/check-promo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'TATAPROMAX' })
  });
  const d3 = await res3.json();
  console.log('3. Check Promo TATAPROMAX:', d3);
  if (!d3.valid || d3.type !== 'free') {
    throw new Error('FAIL: Check promo TATAPROMAX gagal!');
  }

  // 4. Check Promo Code TATABEBAS
  const res4 = await fetch(`${BASE}/api/payment/check-promo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'TATABEBAS' })
  });
  const d4 = await res4.json();
  console.log('4. Check Promo TATABEBAS:', d4);
  if (!d4.valid || d4.type !== 'free') {
    throw new Error('FAIL: Check promo TATABEBAS gagal!');
  }

  // 5. Redeem Promo Code TATAPROMAX
  const res5 = await fetch(`${BASE}/api/account/redeem-promo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'TATAPROMAX', email: 'audit_test@tata.app' })
  });
  const d5 = await res5.json();
  console.log('5. Redeem Promo TATAPROMAX:', d5);
  if (!d5.success || !d5.isPremium || d5.tier !== 'pro_max') {
    throw new Error('FAIL: Redeem promo TATAPROMAX gagal!');
  }

  // 6. Test Google Auth Invalid Token Handling
  const res6 = await fetch(`${BASE}/api/account/google-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: 'dummy_token' })
  });
  const d6 = await res6.json();
  console.log('6. Google Auth Invalid Token Test:', res6.status, d6);
  if (res6.status !== 401) {
    throw new Error(`FAIL: Google auth invalid token status expected 401, got ${res6.status}`);
  }

  // 7. Request OTP
  const res7 = await fetch(`${BASE}/api/account/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'otp_test@tata.app' })
  });
  const d7 = await res7.json();
  console.log('7. Request OTP response:', res7.status, d7);

  console.log('\n=== AUDIT SERVER TATA SELESAI & LULUS 100% ===');
}

testAll().catch(e => {
  console.error('AUDIT ERROR:', e);
  process.exit(1);
});
