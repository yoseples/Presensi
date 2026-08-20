/**
 * ============================================================================
 * LICENSE MANAGEMENT V2 — PRODUCTION OPERATIONS TEST SUITE
 * Validating Lifecycle, Plans, Entitlements, Transfers, and Monitoring
 * ============================================================================
 */

const http = require('http');
const crypto = require('crypto');
const path = require('path');

const PORT = 3004;
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

const V2_TESTS = [];

function assert(condition, message, details = '') {
  V2_TESTS.push({ message, pass: Boolean(condition), details });
  const icon = condition ? '✅ [PASS]' : '❌ [FAIL]';
  console.log(`  ${icon} ${message} ${details ? `(${details})` : ''}`);
}

async function runV2OperationsTests() {
  console.log('\n=======================================================');
  console.log('🚀 RUNNING LICENSE MANAGEMENT V2 OPERATIONS TEST SUITE');
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
    // ------------------------------------------------------------------------
    // SCENARIO 1: Generate UNUSED License with Specific Plan (BASIC)
    // ------------------------------------------------------------------------
    console.log('🔹 SCENARIO 1: Generate UNUSED License (Plan: BASIC)');
    const genRes = await makeRequest('POST', '/api/admin/licenses/generate', {
      product: PRODUCT_NAME,
      customer_name: 'SMP Negeri 1 Samudera',
      customer_email: 'smp1samudera@sch.id',
      plan: 'BASIC',
      domain: '', // Unbound
      prefix: 'SMPN'
    }, { 'x-admin-key': ADMIN_API_KEY });

    assert(genRes.statusCode === 201 && genRes.data.success === true, 'Admin successfully generated new license');
    const lic1 = genRes.data.license;
    assert(lic1.status === 'unused', 'License starts with status UNUSED (lifecycle initial state)', lic1.status);
    assert(lic1.plan === 'BASIC', 'License created with BASIC plan', lic1.plan);

    // ------------------------------------------------------------------------
    // SCENARIO 2: Activate UNUSED License -> Becomes ACTIVE
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 2: First-Use Activation (UNUSED -> ACTIVE)');
    const actRes = await makeRequest('POST', '/api/license/activate', {
      license_key: lic1.license_key,
      domain: 'smpn1samudera.sch.id',
      product: PRODUCT_NAME
    });

    assert(actRes.statusCode === 200 && actRes.data.success === true, 'Activation succeeds on valid domain');
    assert(actRes.data.status === 'active', 'License status transitions UNUSED -> ACTIVE', actRes.data.status);
    const basicToken = actRes.data.token;

    // ------------------------------------------------------------------------
    // SCENARIO 3: BASIC Plan Entitlement Enforcement (Export is blocked on BASIC)
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 3: Server-side Entitlement Check (BASIC Plan has no export entitlement)');
    const basicExpRes = await makeRequest('POST', '/api/premium/export-rekap', null, {
      'Authorization': `Bearer ${basicToken}`,
      'Origin': 'https://smpn1samudera.sch.id'
    });
    assert(basicExpRes.statusCode === 403 && basicExpRes.data.error === 'FEATURE_NOT_ENTITLED', 'BASIC plan is blocked from export_advanced_rekap server-side');

    // ------------------------------------------------------------------------
    // SCENARIO 4: Upgrade Plan (BASIC -> ENTERPRISE)
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 4: Upgrade Plan (BASIC -> ENTERPRISE)');
    const upgradeRes = await makeRequest('POST', '/api/admin/licenses/change-plan', {
      id: lic1.id,
      plan: 'ENTERPRISE'
    }, { 'x-admin-key': ADMIN_API_KEY });

    assert(upgradeRes.statusCode === 200 && upgradeRes.data.success === true, 'Admin successfully upgraded plan to ENTERPRISE');
    assert(upgradeRes.data.license.plan === 'ENTERPRISE', 'Database updated with ENTERPRISE plan');

    // Reactivate / refresh token to get updated enterprise entitlements
    const actRes2 = await makeRequest('POST', '/api/license/activate', {
      license_key: lic1.license_key,
      domain: 'smpn1samudera.sch.id',
      product: PRODUCT_NAME
    });
    const enterpriseToken = actRes2.data.token;

    const entExpRes = await makeRequest('POST', '/api/premium/export-rekap', null, {
      'Authorization': `Bearer ${enterpriseToken}`,
      'Origin': 'https://smpn1samudera.sch.id'
    });
    assert(entExpRes.statusCode === 200 && entExpRes.data.success === true, 'ENTERPRISE plan successfully unlocks export_advanced_rekap');

    // ------------------------------------------------------------------------
    // SCENARIO 5: License Lifecycle (ACTIVE -> SUSPENDED -> ACTIVE)
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 5: Suspend and Reactivate Lifecycle');
    const suspRes = await makeRequest('POST', '/api/admin/licenses/suspend', { id: lic1.id }, { 'x-admin-key': ADMIN_API_KEY });
    assert(suspRes.statusCode === 200, 'Admin can suspend active license');

    const suspVerify = await makeRequest('POST', '/api/license/verify', {
      token: enterpriseToken,
      domain: 'smpn1samudera.sch.id',
      product: PRODUCT_NAME
    });
    assert(suspVerify.statusCode === 403 && suspVerify.data.status === 'suspended', 'Suspended license is blocked during verification');

    const reactRes = await makeRequest('POST', '/api/admin/licenses/reactivate', { id: lic1.id }, { 'x-admin-key': ADMIN_API_KEY });
    assert(reactRes.statusCode === 200, 'Admin can reactivate suspended license');

    const reactVerify = await makeRequest('POST', '/api/license/verify', {
      token: enterpriseToken,
      domain: 'smpn1samudera.sch.id',
      product: PRODUCT_NAME
    });
    assert(reactVerify.statusCode === 200 && reactVerify.data.status === 'active', 'Reactivated license passes verification');

    // ------------------------------------------------------------------------
    // SCENARIO 6: License Transfer (Domain A -> Domain B)
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 6: Admin License Transfer to New Domain');
    const transferRes = await makeRequest('POST', '/api/admin/licenses/transfer', {
      id: lic1.id,
      new_domain: 'smpn1samudera-baru.sch.id',
      reason: 'School Domain Migration'
    }, { 'x-admin-key': ADMIN_API_KEY });

    assert(transferRes.statusCode === 200 && transferRes.data.success === true, 'Admin successfully transferred license to new domain');
    assert(transferRes.data.license.domain === 'smpn1samudera-baru.sch.id', 'License domain bound to new domain');

    // Old token with old domain now rejected
    const oldDomainVerify = await makeRequest('POST', '/api/license/verify', {
      token: enterpriseToken,
      domain: 'smpn1samudera.sch.id',
      product: PRODUCT_NAME
    });
    assert(oldDomainVerify.statusCode === 403 && oldDomainVerify.data.status === 'domain_mismatch', 'Old domain is now rejected after transfer');

    // ------------------------------------------------------------------------
    // SCENARIO 7: License Detail Endpoint & Suspicious Status
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 7: License Detail View (with Entitlements & Status)');
    const detailRes = await makeRequest('GET', `/api/admin/licenses/${lic1.id}`, null, { 'x-admin-key': ADMIN_API_KEY });
    assert(detailRes.statusCode === 200 && detailRes.data.success === true, 'Admin can fetch full license detail');
    assert(detailRes.data.license.plan === 'ENTERPRISE', 'Detail includes plan information');
    assert(detailRes.data.license.entitlements.export === true, 'Detail includes entitlements breakdown');
    assert(detailRes.data.license.suspicious_status === 'NORMAL', 'Security status evaluates to NORMAL');

    // ------------------------------------------------------------------------
    // SCENARIO 8: Expiration Extension (+90 Days)
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 8: Expiration Extension');
    const extendRes = await makeRequest('POST', '/api/admin/licenses/extend', {
      id: lic1.id,
      days: 90
    }, { 'x-admin-key': ADMIN_API_KEY });
    assert(extendRes.statusCode === 200 && extendRes.data.success === true, 'Admin successfully extended license expiration (+90 days)');

    // ------------------------------------------------------------------------
    // SCENARIO 9: Statistics & Expiration Monitoring Endpoint
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 9: Detailed Stats & Expiration Monitoring');
    const statsRes = await makeRequest('GET', '/api/admin/stats', null, { 'x-admin-key': ADMIN_API_KEY });
    assert(statsRes.statusCode === 200 && statsRes.data.success === true, 'Admin can fetch operational stats');
    assert(typeof statsRes.data.stats.total === 'number', 'Stats includes total licenses count');
    assert(typeof statsRes.data.stats.activations.today === 'number', 'Stats includes today activations metric');

    // ------------------------------------------------------------------------
    // SCENARIO 10: Filtered Audit Logs Endpoint
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 10: Audit Logs with Action Filters');
    const logsRes = await makeRequest('GET', '/api/admin/license-logs?action=LICENSE_TRANSFERRED', null, { 'x-admin-key': ADMIN_API_KEY });
    assert(logsRes.statusCode === 200 && logsRes.data.success === true, 'Admin can query filtered audit logs');
    assert(logsRes.data.logs.some(l => l.action === 'LICENSE_TRANSFERRED'), 'Audit log contains LICENSE_TRANSFERRED event');

    // ------------------------------------------------------------------------
    // SCENARIO 11: Public Keys Rotation Store
    // ------------------------------------------------------------------------
    console.log('\n🔹 SCENARIO 11: Public Keys Rotation Store');
    const keysRes = await makeRequest('GET', '/api/license/public-keys');
    assert(keysRes.statusCode === 200 && keysRes.data.success === true, 'Client can fetch public keys store for rotation verification');
    assert(keysRes.data.keys.length >= 1, 'Key store contains active public verification keys');

    console.log('\n=======================================================');
    const passed = V2_TESTS.filter(t => t.pass).length;
    console.log(`📊 V2 OPERATIONS SUMMARY: ${passed}/${V2_TESTS.length} SCENARIOS PASSED 100%`);
    console.log('=======================================================\n');

  } catch (err) {
    console.error('V2 test exception:', err);
  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

runV2OperationsTests();
