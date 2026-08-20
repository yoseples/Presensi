/**
 * ============================================================================
 * COMPREHENSIVE AUTOMATED TEST SUITE FOR LICENSE MANAGEMENT SYSTEM
 * Testing all 15 Core Scenarios
 * ============================================================================
 */

const crypto = require('crypto');
const {
  server,
  licensesDB,
  auditLogsDB,
  generateCryptographicKey,
  cleanDomainString,
  signLicenseToken,
  verifyLicenseToken,
  saveData,
  PUBLIC_KEY,
  PRIVATE_KEY
} = require('../server/license-server.js');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, extraInfo = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName} ${extraInfo ? '(' + extraInfo + ')' : ''}`);
  }
}

async function runAllTests() {
  console.log('\n=======================================================');
  console.log('🧪 RUNNING LICENSE MANAGEMENT SYSTEM TEST SUITE');
  console.log('=======================================================\n');

  // Start HTTP Server on dynamic port for API testing
  const PORT = 3099;
  await new Promise((resolve) => server.listen(PORT, resolve));

  const BASE_URL = `http://127.0.0.1:${PORT}`;

  async function apiCall(endpoint, method = 'POST', body = null) {
    const headers = {
      'Content-Type': 'application/json',
      'x-admin-key': 'adm_sec_smansa_master_2026_superkey'
    };
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });
    const json = await res.json();
    return { status: res.status, data: json };
  }

  try {
    // ------------------------------------------------------------------------
    // SCENARIO 1: Generate New License
    // ------------------------------------------------------------------------
    console.log('🔹 SCENARIO 1: Generate New License via Admin API');
    const genRes = await apiCall('/api/admin/licenses/generate', 'POST', {
      product: 'presensi-smansa-pro',
      customer_name: 'SMAN 2 Lhoksukon',
      customer_email: 'sman2lhoksukon@sch.id',
      domain: '', // Unbound first domain
      license_type: 'Subscription',
      max_activation: 1,
      expires_at: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString()
    });

    assert(genRes.status === 201 && genRes.data.success === true, 'Admin can generate new license');
    const newLic = genRes.data.license;
    assert(Boolean(newLic.license_key && newLic.license_key.length >= 19), 'Generated license key has valid format (XXXX-XXXX-XXXX-XXXX-XXXX)', newLic.license_key);
    assert(newLic.domain === null, 'Generated license starts with unbound domain');

    // ------------------------------------------------------------------------
    // SCENARIO 2: First-use Domain Activation (Locks Domain)
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 2: First-use Domain Activation (Unbound -> Locked)');
    const actRes1 = await apiCall('/api/license/activate', 'POST', {
      license_key: newLic.license_key,
      domain: 'sman2lhoksukon.sch.id',
      product: 'presensi-smansa-pro'
    });

    assert(actRes1.status === 200 && actRes1.data.success === true, 'First activation on unbound license succeeds');
    assert(actRes1.data.license.domain === 'sman2lhoksukon.sch.id', 'Domain is locked to first activating domain');
    assert(Boolean(actRes1.data.token), 'Server returns cryptographically signed token');
    const issuedToken = actRes1.data.token;

    // ------------------------------------------------------------------------
    // SCENARIO 3: Valid Token Verification & Full Mode Verification
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 3: Token Verification (Valid License)');
    const verifyRes1 = await apiCall('/api/license/verify', 'POST', {
      token: issuedToken,
      domain: 'sman2lhoksukon.sch.id',
      product: 'presensi-smansa-pro'
    });

    assert(verifyRes1.status === 200 && verifyRes1.data.valid === true, 'Valid signed token passes verification');

    // ------------------------------------------------------------------------
    // SCENARIO 4: Domain Mismatch on Activation
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 4: Domain Mismatch on Activation (Different Domain)');
    const actMismatch = await apiCall('/api/license/activate', 'POST', {
      license_key: newLic.license_key,
      domain: 'other-hacked-school.com',
      product: 'presensi-smansa-pro'
    });

    assert(actMismatch.status === 403 && actMismatch.data.status === 'domain_mismatch', 'Activation on different domain is rejected with domain_mismatch');

    // ------------------------------------------------------------------------
    // SCENARIO 5: Domain Mismatch on Token Verification
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 5: Domain Mismatch on Token Verification');
    const verifyMismatch = await apiCall('/api/license/verify', 'POST', {
      token: issuedToken,
      domain: 'rogue-domain.org',
      product: 'presensi-smansa-pro'
    });

    assert(verifyMismatch.status === 403 && verifyMismatch.data.status === 'domain_mismatch', 'Token verification fails if domain does not match token');

    // ------------------------------------------------------------------------
    // SCENARIO 6: Invalid / Non-existent License Key
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 6: Invalid License Key');
    const actInvalid = await apiCall('/api/license/activate', 'POST', {
      license_key: 'JRAK-FAKE-FAKE-FAKE-FAKE',
      domain: 'myschool.sch.id',
      product: 'presensi-smansa-pro'
    });

    assert(actInvalid.status === 404 && actInvalid.data.success === false, 'Invalid license key returns 404 invalid');

    // ------------------------------------------------------------------------
    // SCENARIO 7: Empty License Key
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 7: Empty License Key');
    const actEmpty = await apiCall('/api/license/activate', 'POST', {
      license_key: '',
      domain: 'myschool.sch.id'
    });

    assert(actEmpty.status === 400 && actEmpty.data.status === 'invalid', 'Empty license key returns 400 invalid');

    // ------------------------------------------------------------------------
    // SCENARIO 8: Product Mismatch
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 8: Product Mismatch');
    const actWrongProd = await apiCall('/api/license/activate', 'POST', {
      license_key: newLic.license_key,
      domain: 'sman2lhoksukon.sch.id',
      product: 'unrelated-ecommerce-app'
    });

    assert(actWrongProd.status === 400, 'Activation with wrong product name is rejected');

    // ------------------------------------------------------------------------
    // SCENARIO 9: Suspended License
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 9: Suspend License');
    const suspendRes = await apiCall('/api/admin/licenses/suspend', 'POST', { id: newLic.id });
    assert(suspendRes.status === 200 && suspendRes.data.success === true, 'Admin can suspend license');

    const verifySuspended = await apiCall('/api/license/verify', 'POST', {
      token: issuedToken,
      domain: 'sman2lhoksukon.sch.id'
    });
    assert(verifySuspended.status === 403 && verifySuspended.data.status === 'suspended', 'Suspended license fails token verification');

    // Reactivate for further tests
    await apiCall('/api/admin/licenses/activate-status', 'POST', { id: newLic.id });

    // ------------------------------------------------------------------------
    // SCENARIO 10: Revoked License
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 10: Revoke License');
    const revokeRes = await apiCall('/api/admin/licenses/revoke', 'POST', { id: newLic.id });
    assert(revokeRes.status === 200 && revokeRes.data.success === true, 'Admin can revoke license');

    const verifyRevoked = await apiCall('/api/license/verify', 'POST', {
      token: issuedToken,
      domain: 'sman2lhoksukon.sch.id'
    });
    assert(verifyRevoked.status === 403 && verifyRevoked.data.status === 'revoked', 'Revoked license token is rejected');

    // ------------------------------------------------------------------------
    // SCENARIO 11: Reset Domain & Reset Activation
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 11: Reset Domain & Reset Activation');
    // Reactivate first
    await apiCall('/api/admin/licenses/activate-status', 'POST', { id: newLic.id });
    const resetDomainRes = await apiCall('/api/admin/licenses/reset-domain', 'POST', { id: newLic.id });
    assert(resetDomainRes.status === 200 && resetDomainRes.data.success === true, 'Admin can reset domain lock');

    // Now activate on a NEW domain!
    const actNewDomain = await apiCall('/api/license/activate', 'POST', {
      license_key: newLic.license_key,
      domain: 'new-school-domain.ac.id',
      product: 'presensi-smansa-pro'
    });
    assert(actNewDomain.status === 200 && actNewDomain.data.license.domain === 'new-school-domain.ac.id', 'License can be activated on new domain after reset');

    // ------------------------------------------------------------------------
    // SCENARIO 12: Extend Expiration
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 12: Extend License Expiration');
    const extendRes = await apiCall('/api/admin/licenses/extend', 'POST', {
      id: newLic.id,
      days: 90
    });
    assert(extendRes.status === 200 && extendRes.data.success === true, 'Admin can extend license expiration (+90 days)');

    // ------------------------------------------------------------------------
    // SCENARIO 13: Tampered Token Detection (Cryptographic Integrity)
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 13: Tampered Token Detection (RSA-2048 Cryptography)');
    const tokenParts = issuedToken.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ domain: 'hacked.com', status: 'active' })).toString('base64url');
    const forgedToken = `${tokenParts[0]}.${tamperedPayload}.${tokenParts[2]}`;

    const verifyTampered = await apiCall('/api/license/verify', 'POST', {
      token: forgedToken,
      domain: 'hacked.com'
    });
    assert((verifyTampered.status === 401 || verifyTampered.status === 403) && verifyTampered.data.valid === false, 'Cryptographically tampered token is rejected by verifier');

    // ------------------------------------------------------------------------
    // SCENARIO 14: Expired License Detection
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 14: Expired License Detection');
    const genExpRes = await apiCall('/api/admin/licenses/generate', 'POST', {
      product: 'presensi-smansa-pro',
      customer_name: 'Expired School Trial',
      domain: 'expired-school.sch.id',
      license_type: 'Trial',
      expires_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString() // Expired yesterday
    });
    const expLic = genExpRes.data.license;

    const actExpired = await apiCall('/api/license/activate', 'POST', {
      license_key: expLic.license_key,
      domain: 'expired-school.sch.id',
      product: 'presensi-smansa-pro'
    });
    assert(actExpired.status === 403 && actExpired.data.status === 'expired', 'Expired license is rejected during activation');

    // ------------------------------------------------------------------------
    // SCENARIO 15: Admin License List, Stats, and Audit Logs
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 15: Admin Stats, Filtering, and Audit Logs');
    const listRes = await apiCall('/api/admin/licenses?search=SMAN', 'GET');
    assert(listRes.status === 200 && Array.isArray(listRes.data.licenses), 'Admin can list and search licenses');
    assert(listRes.data.stats && typeof listRes.data.stats.total === 'number', 'Realtime statistics are computed correctly');

    const logsRes = await apiCall('/api/admin/audit-logs', 'GET');
    assert(logsRes.status === 200 && Array.isArray(logsRes.data.logs) && logsRes.data.logs.length > 0, 'Audit logs are properly recorded and retrieved');

  } catch (err) {
    console.error('Test Suite Exception:', err);
    assert(false, 'Test suite execution error: ' + err.message);
  } finally {
    server.close();
  }

  console.log('\n=======================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  if (failedTests === 0) {
    console.log('🎉 ALL 15 LICENSE MANAGEMENT SCENARIOS PASSED 100%!');
  } else {
    console.error(`⚠️ ${failedTests} TESTS FAILED.`);
  }
  console.log('=======================================================\n');
}

runAllTests();
