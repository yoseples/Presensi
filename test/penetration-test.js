/**
 * ============================================================================
 * PENETRATION TEST SUITE: 12 ATTACK SCENARIOS
 * Sistem Absensi Digital - Client Bypass Resistance & Server Authorization Authority
 * ============================================================================
 */

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = 3002;
const BASE_URL = `http://localhost:${PORT}`;
const PRODUCT_NAME = 'presensi-smansa-pro';
const ADMIN_API_KEY = 'adm_sec_smansa_master_2026_superkey';

const serverPath = path.join(__dirname, '../server/license-server.js');
let serverProcess = null;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makeRequest(method, endpoint, body = null, headers = {}) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(endpoint, BASE_URL);
    const postData = body ? JSON.stringify(body) : null;

    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: reqHeaders,
      timeout: 4000
    }, (res) => {
      let rawData = '';
      res.on('data', chunk => { rawData += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(rawData);
        } catch (e) {
          json = { raw: rawData };
        }
        resolve({ statusCode: res.statusCode, data: json });
      });
    });

    req.on('error', (err) => resolve({ statusCode: 0, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ statusCode: 0, error: 'TIMEOUT' }); });

    if (postData) req.write(postData);
    req.end();
  });
}

const PEN_RESULTS = [];

function recordResult(attackNum, attackName, expected, actual, pass) {
  PEN_RESULTS.push({ attackNum, attackName, expected, actual, pass });
  const icon = pass ? '🛡️ [PASS]' : '💥 [VULNERABLE]';
  console.log(`  ${icon} ATTACK ${attackNum} (${attackName}): ${actual}`);
}

async function runPenetrationTests() {
  console.log('\n=======================================================');
  console.log('⚔️  RUNNING PENETRATION TEST SUITE (12 ATTACK SCENARIOS)');
  console.log('=======================================================\n');

  const { fork } = require('child_process');
  serverProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      LICENSE_SERVER_PORT: PORT,
      ADMIN_API_KEY: ADMIN_API_KEY,
      LICENSE_PRODUCT: PRODUCT_NAME
    },
    silent: true
  });

  await sleep(1500);

  try {
    // Setup 1 valid license
    const genRes = await makeRequest('POST', '/api/admin/licenses/generate', {
      product: PRODUCT_NAME,
      customer_name: 'Pen Test Target High School',
      license_type: 'Lifetime',
      prefix: 'PENT'
    }, { 'x-admin-key': ADMIN_API_KEY });

    const licenseKey = genRes.data.license.license_key;
    const licenseId = genRes.data.license.id;

    // Activate on legitimate domain
    const actRes = await makeRequest('POST', '/api/license/activate', {
      license_key: licenseKey,
      domain: 'smansa-pentest.sch.id',
      product: PRODUCT_NAME
    });

    const validToken = actRes.data.token;

    // ------------------------------------------------------------------------
    // ATTACK 1: Modify JavaScript in Client (window.APP_IS_FULL_VERSION = true)
    // ------------------------------------------------------------------------
    console.log('🔹 ATTACK 1: DevTools Modify JavaScript Variable');
    // Attacker alters window.APP_IS_FULL_VERSION = true, but calls protected backend endpoint without valid token
    const att1 = await makeRequest('POST', '/api/premium/export-rekap', { client_flag_full_mode: true }, {
      'x-client-domain': 'smansa-pentest.sch.id'
    });
    const pass1 = att1.statusCode === 403 && att1.data.error === 'LICENSE_REQUIRED';
    recordResult(1, 'Modify JavaScript Variable', 'HTTP 403 LICENSE_REQUIRED', pass1 ? 'Server rejected unverified client flag with 403 Forbidden' : 'Failed to block', pass1);

    // ------------------------------------------------------------------------
    // ATTACK 2: Modify localStorage (localStorage.setItem("fullMode", "true"))
    // ------------------------------------------------------------------------
    console.log('\n🔹 ATTACK 2: DevTools Manipulate localStorage');
    const att2 = await makeRequest('POST', '/api/premium/bulk-qr-generate', { localStorage_data: { fullMode: true } });
    const pass2 = att2.statusCode === 403 && att2.data.error === 'LICENSE_REQUIRED';
    recordResult(2, 'Manipulate localStorage', 'HTTP 403 LICENSE_REQUIRED', pass2 ? 'Server rejected local storage spoof with 403 Forbidden' : 'Failed to block', pass2);

    // ------------------------------------------------------------------------
    // ATTACK 3: Modify sessionStorage (sessionStorage.setItem("premium", "true"))
    // ------------------------------------------------------------------------
    console.log('\n🔹 ATTACK 3: DevTools Manipulate sessionStorage');
    const att3 = await makeRequest('POST', '/api/premium/cloud-sync-backup', { sessionStorage_data: { premium: true } });
    const pass3 = att3.statusCode === 403 && att3.data.error === 'LICENSE_REQUIRED';
    recordResult(3, 'Manipulate sessionStorage', 'HTTP 403 LICENSE_REQUIRED', pass3 ? 'Server rejected session storage spoof with 403 Forbidden' : 'Failed to block', pass3);

    // ------------------------------------------------------------------------
    // ATTACK 4: Modify Cookie (document.cookie = "license=full")
    // ------------------------------------------------------------------------
    console.log('\n🔹 ATTACK 4: Inject Arbitrary Cookie');
    const att4 = await makeRequest('POST', '/api/premium/system-branding-update', {}, { 'Cookie': 'license=full; role=admin' });
    const pass4 = att4.statusCode === 403 && att4.data.error === 'LICENSE_REQUIRED';
    recordResult(4, 'Inject Arbitrary Cookie', 'HTTP 403 LICENSE_REQUIRED', pass4 ? 'Server ignored cookie flag, rejected with 403 Forbidden' : 'Failed to block', pass4);

    // ------------------------------------------------------------------------
    // ATTACK 5: Modify Token Payload (Tampered JSON without private key)
    // ------------------------------------------------------------------------
    console.log('\n🔹 ATTACK 5: Modify Token Payload (Signature Forgery)');
    const parts = validToken.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({
      product: PRODUCT_NAME,
      domain: 'smansa-pentest.sch.id',
      status: 'active',
      entitlements: { export_advanced_rekap: true, bulk_qr_generator: true, cloud_sync_backup: true }
    })).toString('base64url');
    const forgedToken = `${parts[0]}.${forgedPayload}.${parts[2]}`;

    const att5 = await makeRequest('POST', '/api/premium/export-rekap', null, {
      'Authorization': `Bearer ${forgedToken}`,
      'Origin': 'https://smansa-pentest.sch.id'
    });
    const pass5 = att5.statusCode === 403 && att5.data.error === 'INVALID_LICENSE_TOKEN';
    recordResult(5, 'Modify Token Payload', 'HTTP 403 INVALID_LICENSE_TOKEN', pass5 ? 'Cryptographic signature mismatch caught, token rejected' : 'Accepted forged token', pass5);

    // ------------------------------------------------------------------------
    // ATTACK 6: Use Valid Token on Another Domain (Domain Hijacking)
    // ------------------------------------------------------------------------
    console.log('\n🔹 ATTACK 6: Token Replay on Unauthorized Domain');
    const att6 = await makeRequest('POST', '/api/premium/export-rekap', null, {
      'Authorization': `Bearer ${validToken}`,
      'Origin': 'https://attacker-domain.com'
    });
    const pass6 = att6.statusCode === 403 && att6.data.error === 'DOMAIN_MISMATCH';
    recordResult(6, 'Token Replay on Another Domain', 'HTTP 403 DOMAIN_MISMATCH', pass6 ? 'Domain mismatch caught against bound domain' : 'Allowed domain mismatch', pass6);

    // ------------------------------------------------------------------------
    // ATTACK 7: Use Expired Token
    // ------------------------------------------------------------------------
    console.log('\n🔹 ATTACK 7: Use Expired Token');
    const expGen = await makeRequest('POST', '/api/admin/licenses/generate', {
      product: PRODUCT_NAME,
      customer_name: 'Pen Test Expired',
      expires_at: new Date(Date.now() - 3600000).toISOString(),
      prefix: 'EXPD'
    }, { 'x-admin-key': ADMIN_API_KEY });
    const expAct = await makeRequest('POST', '/api/license/activate', {
      license_key: expGen.data.license.license_key,
      domain: 'exp.sch.id',
      product: PRODUCT_NAME
    });
    const pass7 = expAct.statusCode === 403 && expAct.data.status === 'expired';
    recordResult(7, 'Use Expired Token', 'HTTP 403 expired', pass7 ? 'Expired license rejected during activation' : 'Failed to block', pass7);

    // ------------------------------------------------------------------------
    // ATTACK 8: Use Revoked License Token
    // ------------------------------------------------------------------------
    console.log('\n🔹 ATTACK 8: Use Revoked License Token');
    await makeRequest('POST', '/api/admin/licenses/revoke', { id: licenseId }, { 'x-admin-key': ADMIN_API_KEY });
    const att8 = await makeRequest('POST', '/api/premium/export-rekap', null, {
      'Authorization': `Bearer ${validToken}`,
      'Origin': 'https://smansa-pentest.sch.id'
    });
    const pass8 = att8.statusCode === 403 && att8.data.error === 'LICENSE_REVOKED';
    recordResult(8, 'Use Revoked License Token', 'HTTP 403 LICENSE_REVOKED', pass8 ? 'Revoked license token blocked in real-time' : 'Allowed revoked token', pass8);

    // ------------------------------------------------------------------------
    // ATTACK 9: Fake API Response Injection
    // ------------------------------------------------------------------------
    console.log('\n🔹 ATTACK 9: Fake API Response Injection in Client');
    // Client mocks response { valid: true } but backend check on premium route still rejects without server token
    const att9 = await makeRequest('POST', '/api/premium/cloud-sync-backup', { fake_verify_response: { valid: true, status: 'active' } });
    const pass9 = att9.statusCode === 403 && att9.data.error === 'LICENSE_REQUIRED';
    recordResult(9, 'Fake API Response Injection', 'HTTP 403 LICENSE_REQUIRED', pass9 ? 'Backend requires signed token, faked client response fails' : 'Allowed fake response', pass9);

    // ------------------------------------------------------------------------
    // ATTACK 10: Direct API Invocation Without Token
    // ------------------------------------------------------------------------
    console.log('\n🔹 ATTACK 10: Direct Call to Premium Endpoints Without License');
    const att10 = await makeRequest('POST', '/api/premium/bulk-qr-generate');
    const pass10 = att10.statusCode === 403 && att10.data.error === 'LICENSE_REQUIRED';
    recordResult(10, 'Direct Call Without License', 'HTTP 403 LICENSE_REQUIRED', pass10 ? 'Direct premium API call blocked with 403 Forbidden' : 'Allowed direct call', pass10);

    // ------------------------------------------------------------------------
    // ATTACK 11: Algorithm Confusion (alg: "none")
    // ------------------------------------------------------------------------
    console.log('\n🔹 ATTACK 11: Algorithm Confusion Attack (alg: "none")');
    const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const nonePayload = Buffer.from(JSON.stringify({
      product: PRODUCT_NAME,
      domain: 'smansa-pentest.sch.id',
      status: 'active'
    })).toString('base64url');
    const noneToken = `${noneHeader}.${nonePayload}.`;

    const att11 = await makeRequest('POST', '/api/license/verify', {
      token: noneToken,
      domain: 'smansa-pentest.sch.id',
      product: PRODUCT_NAME
    });
    const pass11 = att11.statusCode === 401 && att11.data.status === 'invalid_signature';
    recordResult(11, 'Algorithm Confusion (alg: "none")', 'HTTP 401 invalid_signature', pass11 ? 'Strict algorithm verification rejected alg "none"' : 'Vulnerable to alg none', pass11);

    // ------------------------------------------------------------------------
    // ATTACK 12: Non-Admin License Management Exploitation
    // ------------------------------------------------------------------------
    console.log('\n🔹 ATTACK 12: Non-Admin Attempts License Generation / Revocation');
    const att12 = await makeRequest('POST', '/api/admin/licenses/generate', {
      product: PRODUCT_NAME,
      customer_name: 'Hacked School'
    }); // No x-admin-key header
    const pass12 = att12.statusCode === 401 && att12.data.status === 'unauthorized';
    recordResult(12, 'Non-Admin License Management Exploitation', 'HTTP 401 unauthorized', pass12 ? 'Admin management endpoint strictly blocked without valid API key' : 'Allowed unauthenticated admin action', pass12);

    console.log('\n=======================================================');
    const allPass = PEN_RESULTS.every(r => r.pass);
    console.log(`📊 PENETRATION TEST SUMMARY: ${PEN_RESULTS.filter(r => r.pass).length}/12 ATTACK VECTORS BLOCKED`);
    if (allPass) {
      console.log('🛡️ ALL 12 ATTACK SCENARIOS SUCCESSFULLY DEFEATED 100%!');
    }
    console.log('=======================================================\n');

  } catch (err) {
    console.error('Penetration test exception:', err);
  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

runPenetrationTests();
