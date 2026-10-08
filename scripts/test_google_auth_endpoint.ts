/**
 * Test script for /api/account/google-auth endpoint
 */

async function testGoogleAuth() {
  console.log('--- Testing Google Auth Endpoint & Secrets Config ---');

  // Test missing credential validation
  const res = await fetch('http://localhost:3000/api/account/google-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const data = await res.json();
  console.log('Missing credential response status:', res.status, data);

  if (res.status !== 400 || data.error !== 'missing_google_credential') {
    throw new Error(`FAIL: Harusnya 400 missing_google_credential, didapat: ${res.status}`);
  }

  // Test invalid token validation
  const res2 = await fetch('http://localhost:3000/api/account/google-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: 'invalid_dummy_token_123' })
  });
  const data2 = await res2.json();
  console.log('Invalid token response status:', res2.status, data2);

  if (res2.status !== 401 || data2.error !== 'invalid_google_token') {
    throw new Error(`FAIL: Harusnya 401 invalid_google_token, didapat: ${res2.status}`);
  }

  console.log('✓ PASS: Endpoint /api/account/google-auth tidak lagi memunculkan error server_configuration_error SESSION_SECRET.');
}

testGoogleAuth().catch(e => {
  console.error(e);
  process.exit(1);
});
