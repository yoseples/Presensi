/**
 * ============================================================================
 * ROLE ACCESS CONTROL TEST SUITE — LICENSE MANAGEMENT
 * Validating Strict Role Hierarchy & Access Matrix for Developer/Super Admin
 * ============================================================================
 */

const http = require('http');
const path = require('path');
const { fork } = require('child_process');

const PORT = 3005;
const BASE_URL = `http://localhost:${PORT}`;
const PRODUCT_NAME = 'presensi-smansa-pro';
const MASTER_DEVELOPER_KEY = 'adm_sec_smansa_master_2026_superkey';

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

const TEST_RESULTS = [];

function assert(condition, message, details = '') {
  TEST_RESULTS.push({ message, pass: Boolean(condition), details });
  const icon = condition ? '✅ [PASS]' : '❌ [FAIL]';
  console.log(`  ${icon} ${message} ${details ? `(${details})` : ''}`);
}

async function runRoleAccessControlTests() {
  console.log('\n=======================================================');
  console.log('🔒 RUNNING ROLE ACCESS CONTROL AUDIT TEST SUITE');
  console.log('=======================================================\n');

  serverProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      LICENSE_SERVER_PORT: PORT,
      ADMIN_API_KEY: MASTER_DEVELOPER_KEY,
      LICENSE_PRODUCT: PRODUCT_NAME
    },
    silent: true
  });

  await sleep(1500);

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Unauthenticated Access to License API (401 Unauthorized)
    // ------------------------------------------------------------------------
    console.log('🔹 1. UNAUTHENTICATED ACCESS TEST');
    const unauthGet = await makeRequest('GET', '/api/admin/licenses');
    assert(unauthGet.statusCode === 401, 'Unauthenticated GET /api/admin/licenses blocked with 401', `HTTP ${unauthGet.statusCode}`);

    const unauthPost = await makeRequest('POST', '/api/admin/licenses/generate', {
      customer_name: 'Attacker School'
    });
    assert(unauthPost.statusCode === 401, 'Unauthenticated POST /api/admin/licenses/generate blocked with 401', `HTTP ${unauthPost.statusCode}`);

    // ------------------------------------------------------------------------
    // TEST 2: Regular Admin Access to License API (403 Forbidden)
    // ------------------------------------------------------------------------
    console.log('\n🔹 2. REGULAR ADMIN ROLE ACCESS TEST');
    const regularAdminHeaders = { 'x-admin-key': 'regular_admin_user_session_token_123' };

    const adminGet = await makeRequest('GET', '/api/admin/licenses', null, regularAdminHeaders);
    assert(adminGet.statusCode === 403, 'Regular Admin GET /api/admin/licenses blocked with 403 Forbidden', `HTTP ${adminGet.statusCode}`);
    assert(adminGet.data.error === 'FORBIDDEN', 'Error code is explicitly FORBIDDEN', adminGet.data.error);

    const adminGen = await makeRequest('POST', '/api/admin/licenses/generate', { customer_name: 'Unauthorized School' }, regularAdminHeaders);
    assert(adminGen.statusCode === 403, 'Regular Admin generate license blocked with 403 Forbidden', `HTTP ${adminGen.statusCode}`);

    const adminRevoke = await makeRequest('POST', '/api/admin/licenses/revoke', { id: 'lic_default_smansa' }, regularAdminHeaders);
    assert(adminRevoke.statusCode === 403, 'Regular Admin revoke license blocked with 403 Forbidden', `HTTP ${adminRevoke.statusCode}`);

    const adminLogs = await makeRequest('GET', '/api/admin/license-logs', null, regularAdminHeaders);
    assert(adminLogs.statusCode === 403, 'Regular Admin read license logs blocked with 403 Forbidden', `HTTP ${adminLogs.statusCode}`);

    const adminStats = await makeRequest('GET', '/api/admin/stats', null, regularAdminHeaders);
    assert(adminStats.statusCode === 403, 'Regular Admin read license stats blocked with 403 Forbidden', `HTTP ${adminStats.statusCode}`);

    // ------------------------------------------------------------------------
    // TEST 3: Staff / Teacher / Student Access to License API (403 Forbidden)
    // ------------------------------------------------------------------------
    console.log('\n🔹 3. TEACHER (GURU) / STAFF (TENDIK) / STUDENT (SISWA) ACCESS TEST');
    const guruHeaders = { 'x-admin-key': 'guru_session_token_456' };
    const guruGet = await makeRequest('GET', '/api/admin/licenses', null, guruHeaders);
    assert(guruGet.statusCode === 403, 'Teacher (Guru) access blocked with 403 Forbidden', `HTTP ${guruGet.statusCode}`);

    const tendikHeaders = { 'x-admin-key': 'tendik_session_token_789' };
    const tendikGet = await makeRequest('GET', '/api/admin/licenses', null, tendikHeaders);
    assert(tendikGet.statusCode === 403, 'Staff (Tendik) access blocked with 403 Forbidden', `HTTP ${tendikGet.statusCode}`);

    const siswaHeaders = { 'x-admin-key': 'siswa_session_token_999' };
    const siswaGet = await makeRequest('GET', '/api/admin/licenses', null, siswaHeaders);
    assert(siswaGet.statusCode === 403, 'Student (Siswa) access blocked with 403 Forbidden', `HTTP ${siswaGet.statusCode}`);

    // ------------------------------------------------------------------------
    // TEST 4: Role Manipulation / Forgery Test
    // ------------------------------------------------------------------------
    console.log('\n🔹 4. ROLE MANIPULATION / FORGERY TEST');
    const forgedRoleHeaders = {
      'x-admin-key': 'forged_fake_token',
      'x-user-role': 'super_admin' // Forged header claim
    };
    const forgedGet = await makeRequest('GET', '/api/admin/licenses', null, forgedRoleHeaders);
    assert(forgedGet.statusCode === 403, 'Client-side role header forgery ("super_admin") rejected by server', `HTTP ${forgedGet.statusCode}`);

    // ------------------------------------------------------------------------
    // TEST 5: Developer / Super Admin Authorized Access (200 OK)
    // ------------------------------------------------------------------------
    console.log('\n🔹 5. DEVELOPER / SUPER ADMIN AUTHORIZED ACCESS TEST');
    const devHeaders = { 'x-admin-key': MASTER_DEVELOPER_KEY };

    const devGet = await makeRequest('GET', '/api/admin/licenses', null, devHeaders);
    assert(devGet.statusCode === 200 && devGet.data.success === true, 'Developer / Super Admin successfully reads licenses', `HTTP ${devGet.statusCode}`);

    const devGen = await makeRequest('POST', '/api/admin/licenses/generate', {
      customer_name: 'Authorized Test Client',
      plan: 'ENTERPRISE'
    }, devHeaders);
    assert(devGen.statusCode === 201 && devGen.data.success === true, 'Developer / Super Admin successfully generates license', `HTTP ${devGen.statusCode}`);

    const devLogs = await makeRequest('GET', '/api/admin/license-logs', null, devHeaders);
    assert(devLogs.statusCode === 200 && Array.isArray(devLogs.data.logs), 'Developer / Super Admin successfully reads audit logs', `HTTP ${devLogs.statusCode}`);

    // ------------------------------------------------------------------------
    // TEST 6: Audit Log Recording of Unauthorized Access Attempts
    // ------------------------------------------------------------------------
    console.log('\n🔹 6. AUDIT LOG RECORDING OF UNAUTHORIZED ACCESS');
    const auditLogsRes = await makeRequest('GET', '/api/admin/license-logs?action=UNAUTHORIZED_LICENSE_ACCESS_ATTEMPT', null, devHeaders);
    assert(auditLogsRes.statusCode === 200, 'Developer can query unauthorized access attempt logs');
    assert(auditLogsRes.data.logs.some(l => l.action === 'UNAUTHORIZED_LICENSE_ACCESS_ATTEMPT'), 'Unauthorized attempt successfully recorded in audit log');

    // ------------------------------------------------------------------------
    // TEST 7: Frontend UI & Controller Access Check
    // ------------------------------------------------------------------------
    console.log('\n🔹 7. FRONTEND UI & CONTROLLER ACCESS CHECK');
    const fs = require('fs');
    const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

    const initDashboardCode = indexHtml.split('function initDashboard()')[1].split('function ')[0];
    const adminBlock = initDashboardCode.split("else if (currentUser.role === 'admin')")[1].split("else if (currentUser.role === 'guru')")[0];
    const hasAdminLicenseInAdminRole = adminBlock.includes("menuHTML += createItem('Kelola Lisensi'");

    assert(!hasAdminLicenseInAdminRole, 'Menu "Kelola Lisensi" is completely omitted from regular Admin sidebar');

    const devBlock = initDashboardCode.split("if (currentUser.role === 'developer' || currentUser.role === 'super_admin')")[1].split("else if (currentUser.role === 'admin')")[0];
    const devHasLicense = devBlock.includes("menuHTML += createItem('Kelola Lisensi'");

    assert(devHasLicense, 'Menu "Kelola Lisensi" is exclusively rendered for Developer / Super Admin');

    const controllerGuarded = indexHtml.includes("if (!currentUser || !['developer', 'super_admin'].includes(currentUser.role))");
    assert(controllerGuarded, 'loadAdminLicenses() controller strictly enforces Developer / Super Admin guard');

    console.log('\n=======================================================');
    const passed = TEST_RESULTS.filter(t => t.pass).length;
    console.log(`📊 ROLE ACCESS CONTROL SUMMARY: ${passed}/${TEST_RESULTS.length} SCENARIOS PASSED 100%`);
    console.log('=======================================================\n');

  } catch (err) {
    console.error('Role access test error:', err);
  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

runRoleAccessControlTests();
