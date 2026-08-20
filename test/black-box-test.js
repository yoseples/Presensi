/**
 * ============================================================================
 * BLACK-BOX LICENSE BYPASS TEST SUITE (20 ATTACK VECTORS)
 * Simulating an external attacker probing WebApp, DevTools & Network Endpoints
 * ============================================================================
 */

const http = require('http');
const crypto = require('crypto');
const path = require('path');

const PORT = 3003;
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

const ATTACK_LOGS = [];

function recordAttack(num, name, action, expected, actual, httpStatus, pass) {
  ATTACK_LOGS.push({ num, name, action, expected, actual, httpStatus, pass });
  const icon = pass ? '🛡️ [PASS - Attack Blocked]' : '💥 [FAIL - Resource Leaked]';
  console.log(`\n-------------------------------------------------------`);
  console.log(`ATTACK ${num}: ${name}`);
  console.log(`REQUEST / ACTION: ${action}`);
  console.log(`EXPECTED: ${expected}`);
  console.log(`ACTUAL: ${actual}`);
  console.log(`HTTP STATUS: ${httpStatus}`);
  console.log(`RESULT: ${icon}`);
}

async function runBlackBoxTests() {
  console.log('\n=======================================================');
  console.log('🕵️‍♂️ STARTING BLACK-BOX LICENSE BYPASS ATTACK SIMULATION');
  console.log('=======================================================');

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
    // Generate legitimate reference license for baseline comparisons
    const genRes = await makeRequest('POST', '/api/admin/licenses/generate', {
      product: PRODUCT_NAME,
      customer_name: 'SMA Negeri 1 Lhoksukon',
      license_type: 'Lifetime',
      prefix: 'SMAN'
    }, { 'x-admin-key': ADMIN_API_KEY });

    const validKey = genRes.data.license.license_key;
    const validLicId = genRes.data.license.id;

    // Activate on legitimate domain
    const actRes = await makeRequest('POST', '/api/license/activate', {
      license_key: validKey,
      domain: 'smansalhoksukon.sch.id',
      product: PRODUCT_NAME
    });

    const validToken = actRes.data.token;

    // ------------------------------------------------------------------------
    // ATTACK 1: Membuka Full Mode tanpa license
    // ------------------------------------------------------------------------
    const res1 = await makeRequest('POST', '/api/premium/export-rekap');
    const pass1 = res1.statusCode === 403 && res1.data.error === 'LICENSE_REQUIRED';
    recordAttack(
      1,
      'Membuka Full Mode tanpa license',
      'HTTP POST /api/premium/export-rekap (No credentials provided)',
      'HTTP 403 LICENSE_REQUIRED, data premium tidak diberikan',
      pass1 ? 'Server menolak request tanpa token, premium data aman' : 'Protected data bocor',
      res1.statusCode,
      pass1
    );

    // ------------------------------------------------------------------------
    // ATTACK 2: Memalsukan localStorage
    // ------------------------------------------------------------------------
    const res2 = await makeRequest('POST', '/api/premium/bulk-qr-generate', {
      client_storage: { 'absensi_app_license': JSON.stringify({ status: 'FULL_VERSION', isFull: true }) }
    });
    const pass2 = res2.statusCode === 403 && res2.data.error === 'LICENSE_REQUIRED';
    recordAttack(
      2,
      'Memalsukan localStorage',
      'Injeksi localStorage absensi_app_license={"status":"FULL_VERSION"} ke server request',
      'HTTP 403 LICENSE_REQUIRED (Server mengabaikan client storage flag)',
      pass2 ? 'Server menolak flag localStorage palsu, endpoint premium diblokir' : 'Premium data bocor',
      res2.statusCode,
      pass2
    );

    // ------------------------------------------------------------------------
    // ATTACK 3: Memalsukan sessionStorage
    // ------------------------------------------------------------------------
    const res3 = await makeRequest('POST', '/api/premium/cloud-sync-backup', {
      session_data: { isPremium: true, tier: 'unlimited' }
    });
    const pass3 = res3.statusCode === 403 && res3.data.error === 'LICENSE_REQUIRED';
    recordAttack(
      3,
      'Memalsukan sessionStorage',
      'Injeksi sessionStorage.setItem("isPremium", "true") pada payload',
      'HTTP 403 LICENSE_REQUIRED',
      pass3 ? 'Server menolak session storage palsu, operasi cloud backup diblokir' : 'Premium data bocor',
      res3.statusCode,
      pass3
    );

    // ------------------------------------------------------------------------
    // ATTACK 4: Memalsukan cookie
    // ------------------------------------------------------------------------
    const res4 = await makeRequest('POST', '/api/premium/system-branding-update', {}, {
      'Cookie': 'license=active; full_version=1; role=admin'
    });
    const pass4 = res4.statusCode === 403 && res4.data.error === 'LICENSE_REQUIRED';
    recordAttack(
      4,
      'Memalsukan cookie',
      'Kirim header Cookie: license=active; full_version=1 ke endpoint white-label',
      'HTTP 403 LICENSE_REQUIRED',
      pass4 ? 'Server mengabaikan cookie manipulasi, hak update ditolak' : 'Branding updated tanpa lisensi',
      res4.statusCode,
      pass4
    );

    // ------------------------------------------------------------------------
    // ATTACK 5: Memodifikasi DOM
    // ------------------------------------------------------------------------
    const res5 = await makeRequest('POST', '/api/premium/export-rekap', {
      dom_unhidden_button: true
    });
    const pass5 = res5.statusCode === 403 && res5.data.error === 'LICENSE_REQUIRED';
    recordAttack(
      5,
      'Memodifikasi DOM',
      'Menghapus kelas "hidden" pada tombol rekap premium di browser & kirim request',
      'HTTP 403 LICENSE_REQUIRED (Backend tidak mempercayai DOM)',
      pass5 ? 'Eksekusi server-side gagal, tidak ada file yang dapat diunduh' : 'File terunduh',
      res5.statusCode,
      pass5
    );

    // ------------------------------------------------------------------------
    // ATTACK 6: Mengubah JavaScript state
    // ------------------------------------------------------------------------
    const res6 = await makeRequest('POST', '/api/premium/bulk-qr-generate', {
      js_state: { 'window.APP_IS_FULL_VERSION': true }
    });
    const pass6 = res6.statusCode === 403 && res6.data.error === 'LICENSE_REQUIRED';
    recordAttack(
      6,
      'Mengubah JavaScript state',
      'Eksekusi window.APP_IS_FULL_VERSION = true di console DevTools',
      'HTTP 403 LICENSE_REQUIRED',
      pass6 ? 'Server tetap memverifikasi token kriptografis, menolak akses' : 'Bulk QR berhasil digenerate',
      res6.statusCode,
      pass6
    );

    // ------------------------------------------------------------------------
    // ATTACK 7: Memanggil fungsi Full Mode secara langsung
    // ------------------------------------------------------------------------
    const res7 = await makeRequest('POST', '/api/premium/cloud-sync-backup', {
      direct_function_call: 'exportRekapData()'
    });
    const pass7 = res7.statusCode === 403 && res7.data.error === 'LICENSE_REQUIRED';
    recordAttack(
      7,
      'Memanggil fungsi Full Mode secara langsung',
      'Memanggil fungsi export/sync langsung dari console tanpa signed token',
      'HTTP 403 LICENSE_REQUIRED',
      pass7 ? 'Endpoint server menolak eksekusi fungsi tanpa token sah' : 'Data bocor',
      res7.statusCode,
      pass7
    );

    // ------------------------------------------------------------------------
    // ATTACK 8: Memalsukan API response
    // ------------------------------------------------------------------------
    const res8 = await makeRequest('POST', '/api/premium/export-rekap', {
      mock_response: { success: true, valid: true, status: 'active' }
    });
    const pass8 = res8.statusCode === 403 && res8.data.error === 'LICENSE_REQUIRED';
    recordAttack(
      8,
      'Memalsukan API response',
      'Intersepsi network response /api/license/verify menjadi { success: true }',
      'HTTP 403 LICENSE_REQUIRED saat meminta resource server',
      pass8 ? 'Backend menuntut token bertanda tangan asli, request rekap gagal' : 'Data rekap bocor',
      res8.statusCode,
      pass8
    );

    // ------------------------------------------------------------------------
    // ATTACK 9: Mengubah signed token (Tampering)
    // ------------------------------------------------------------------------
    const parts = validToken.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({
      product: PRODUCT_NAME,
      domain: 'smansalhoksukon.sch.id',
      status: 'active',
      entitlements: { export_advanced_rekap: true }
    })).toString('base64url');
    const forgedToken = `${parts[0]}.${forgedPayload}.${parts[2]}`;

    const res9 = await makeRequest('POST', '/api/premium/export-rekap', null, {
      'Authorization': `Bearer ${forgedToken}`,
      'Origin': 'https://smansalhoksukon.sch.id'
    });
    const pass9 = res9.statusCode === 403 && res9.data.error === 'INVALID_LICENSE_TOKEN';
    recordAttack(
      9,
      'Mengubah signed token',
      'Mengganti payload token base64 tanpa menandatangani dengan private key',
      'HTTP 403 INVALID_LICENSE_TOKEN (Signature mismatch)',
      pass9 ? 'Verifikasi signature RSA-2048 mendeteksi pemalsuan, akses ditolak' : 'Token palsu diterima',
      res9.statusCode,
      pass9
    );

    // ------------------------------------------------------------------------
    // ATTACK 10: Menggunakan token pada domain berbeda (Replay attack)
    // ------------------------------------------------------------------------
    const res10 = await makeRequest('POST', '/api/premium/export-rekap', null, {
      'Authorization': `Bearer ${validToken}`,
      'Origin': 'https://hacker-school.com'
    });
    const pass10 = res10.statusCode === 403 && res10.data.error === 'DOMAIN_MISMATCH';
    recordAttack(
      10,
      'Menggunakan token pada domain berbeda',
      'Replay token resmi smansalhoksukon.sch.id dari domain hacker-school.com',
      'HTTP 403 DOMAIN_MISMATCH',
      pass10 ? 'Server mencocokkan Host/Origin dengan bound domain token, akses ditolak' : 'Domain mismatch lolos',
      res10.statusCode,
      pass10
    );

    // ------------------------------------------------------------------------
    // ATTACK 11: Menggunakan expired token
    // ------------------------------------------------------------------------
    const expGen = await makeRequest('POST', '/api/admin/licenses/generate', {
      product: PRODUCT_NAME,
      customer_name: 'Expired Testing School',
      expires_at: new Date(Date.now() - 3600000).toISOString(),
      prefix: 'EXPD'
    }, { 'x-admin-key': ADMIN_API_KEY });
    const expAct = await makeRequest('POST', '/api/license/activate', {
      license_key: expGen.data.license.license_key,
      domain: 'expired-test.sch.id',
      product: PRODUCT_NAME
    });
    const pass11 = expAct.statusCode === 403 && expAct.data.status === 'expired';
    recordAttack(
      11,
      'Menggunakan expired token',
      'Mencoba aktivasi/verifikasi lisensi kedaluwarsa',
      'HTTP 403 expired',
      pass11 ? 'Server memeriksa timestamp expires_at dan menolak akses' : 'Lisensi expired lolos',
      expAct.statusCode,
      pass11
    );

    // ------------------------------------------------------------------------
    // ATTACK 12: Menggunakan revoked token
    // ------------------------------------------------------------------------
    await makeRequest('POST', '/api/admin/licenses/revoke', { id: validLicId }, { 'x-admin-key': ADMIN_API_KEY });
    const res12 = await makeRequest('POST', '/api/premium/export-rekap', null, {
      'Authorization': `Bearer ${validToken}`,
      'Origin': 'https://smansalhoksukon.sch.id'
    });
    const pass12 = res12.statusCode === 403 && res12.data.error === 'LICENSE_REVOKED';
    recordAttack(
      12,
      'Menggunakan revoked token',
      'Memanggil endpoint premium menggunakan token lisensi yang telah direvoke Admin',
      'HTTP 403 LICENSE_REVOKED',
      pass12 ? 'Database pusat mendeteksi status revoked, token dibatalkan seketika' : 'Token revoked masih aktif',
      res12.statusCode,
      pass12
    );

    // ------------------------------------------------------------------------
    // ATTACK 13: Memanggil premium API secara langsung tanpa token
    // ------------------------------------------------------------------------
    const res13 = await makeRequest('POST', '/api/premium/bulk-qr-generate', { batch: 100 });
    const pass13 = res13.statusCode === 403 && res13.data.error === 'LICENSE_REQUIRED';
    recordAttack(
      13,
      'Memanggil premium API secara langsung tanpa token',
      'HTTP POST /api/premium/bulk-qr-generate (tanpa Authorization header)',
      'HTTP 403 LICENSE_REQUIRED',
      pass13 ? 'Endpoint terlindungi menolak eksekusi tanpa token lisensi' : 'Bulk QR berhasil dibuat',
      res13.statusCode,
      pass13
    );

    // ------------------------------------------------------------------------
    // ATTACK 14: Memanggil premium API menggunakan token invalid
    // ------------------------------------------------------------------------
    const res14 = await makeRequest('POST', '/api/premium/cloud-sync-backup', null, {
      'Authorization': 'Bearer fake_garbage_jwt_token_12345'
    });
    const pass14 = res14.statusCode === 403 && res14.data.error === 'INVALID_LICENSE_TOKEN';
    recordAttack(
      14,
      'Memanggil premium API menggunakan token invalid',
      'Kirim Authorization: Bearer fake_garbage_jwt_token_12345 ke endpoint cloud backup',
      'HTTP 403 INVALID_LICENSE_TOKEN',
      pass14 ? 'Parser struktur token RSA menolak format sampah' : 'Token invalid diterima',
      res14.statusCode,
      pass14
    );

    // ------------------------------------------------------------------------
    // ATTACK 15: Mengakses Firebase protected resource secara langsung
    // ------------------------------------------------------------------------
    // Direct attempt to read / write license database without admin authority
    const res15 = await makeRequest('GET', '/api/admin/licenses'); // Unauthenticated
    const pass15 = res15.statusCode === 401 && res15.data.status === 'unauthorized';
    recordAttack(
      15,
      'Mengakses Firebase / DB protected resource secara langsung',
      'HTTP GET /api/admin/licenses (Tanpa x-admin-key)',
      'HTTP 401 unauthorized (Akses basis data lisensi diblokir)',
      pass15 ? 'Middleware otorisasi memblokir pembacaan tabel lisensi' : 'Database lisensi bocor',
      res15.statusCode,
      pass15
    );

    // ------------------------------------------------------------------------
    // ATTACK 16: Mencoba menggunakan endpoint admin tanpa authentication
    // ------------------------------------------------------------------------
    const res16 = await makeRequest('POST', '/api/admin/licenses/generate', { customer_name: 'Attacker' });
    const pass16 = res16.statusCode === 401 && res16.data.status === 'unauthorized';
    recordAttack(
      16,
      'Mencoba menggunakan endpoint admin tanpa authentication',
      'HTTP POST /api/admin/licenses/generate (Tanpa credentials)',
      'HTTP 401 unauthorized',
      pass16 ? 'Pembuatan lisensi ilegal diblokir total oleh server' : 'Lisensi berhasil dibuat penyerang',
      res16.statusCode,
      pass16
    );

    // ------------------------------------------------------------------------
    // ATTACK 17: Mencoba menggunakan endpoint admin sebagai non-admin
    // ------------------------------------------------------------------------
    const res17 = await makeRequest('POST', '/api/admin/licenses/suspend', { id: 'lic_any' }, {
      'Authorization': 'Bearer user_token_siswa_20240101',
      'x-api-key': 'student_key_invalid'
    });
    const pass17 = res17.statusCode === 401 && res17.data.status === 'unauthorized';
    recordAttack(
      17,
      'Mencoba menggunakan endpoint admin sebagai non-admin',
      'Kirim token siswa/guru ke endpoint admin suspend',
      'HTTP 401 unauthorized',
      pass17 ? 'Server memvalidasi kunci admin master, menolak hak akses non-admin' : 'Lisensi berhasil disuspend',
      res17.statusCode,
      pass17
    );

    // ------------------------------------------------------------------------
    // ATTACK 18: Mencoba mengubah license melalui Firebase/API secara langsung
    // ------------------------------------------------------------------------
    const res18 = await makeRequest('POST', '/api/admin/licenses/reset-domain', { id: validLicId });
    const pass18 = res18.statusCode === 401 && res18.data.status === 'unauthorized';
    recordAttack(
      18,
      'Mencoba mengubah license melalui API secara langsung',
      'HTTP POST /api/admin/licenses/reset-domain (Tanpa otorisasi admin)',
      'HTTP 401 unauthorized',
      pass18 ? 'Modifikasi kuncian domain ditolak' : 'Domain berhasil direset penyerang',
      res18.statusCode,
      pass18
    );

    // ------------------------------------------------------------------------
    // ATTACK 19: Mencoba mengubah entitlement
    // ------------------------------------------------------------------------
    const trialHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const forgedEntitlementPayload = Buffer.from(JSON.stringify({
      product: PRODUCT_NAME,
      domain: 'smansalhoksukon.sch.id',
      license_type: 'Trial',
      entitlements: { export_advanced_rekap: true, bulk_qr_generator: true, cloud_sync_backup: true } // Forged entitlements
    })).toString('base64url');
    const forgedEntitlementToken = `${trialHeader}.${forgedEntitlementPayload}.invalid_sig_bytes`;

    const res19 = await makeRequest('POST', '/api/premium/export-rekap', null, {
      'Authorization': `Bearer ${forgedEntitlementToken}`
    });
    const pass19 = res19.statusCode === 403 && res19.data.error === 'INVALID_LICENSE_TOKEN';
    recordAttack(
      19,
      'Mencoba mengubah entitlement',
      'Injeksi entitlement payload palsu pada token tanpa private key signing',
      'HTTP 403 INVALID_LICENSE_TOKEN',
      pass19 ? 'Server mendeteksi signature rusak saat memeriksa entitlement, request ditolak' : 'Entitlement palsu diterima',
      res19.statusCode,
      pass19
    );

    // ------------------------------------------------------------------------
    // ATTACK 20: Mencoba mengunduh protected resource secara langsung
    // ------------------------------------------------------------------------
    const res20 = await makeRequest('POST', '/api/premium/export-rekap', { direct_file_request: 'official_rekap.xlsx' });
    const pass20 = res20.statusCode === 403 && res20.data.error === 'LICENSE_REQUIRED';
    recordAttack(
      20,
      'Mencoba mengunduh protected resource secara langsung',
      'HTTP POST /api/premium/export-rekap (Download payload tanpa token resmi)',
      'HTTP 403 LICENSE_REQUIRED',
      pass20 ? 'File/data rekap presensi digital tidak pernah dikirimkan server' : 'Data rekap terunduh',
      res20.statusCode,
      pass20
    );

    console.log('\n=======================================================');
    const passedCount = ATTACK_LOGS.filter(r => r.pass).length;
    console.log(`📊 BLACK-BOX PENETRATION SUMMARY: ${passedCount}/20 ATTACK VECTORS DEFEATED`);
    if (passedCount === 20) {
      console.log('🛡️ ALL 20 BLACK-BOX BYPASS ATTEMPTS BLOCKED 100% (ZERO LEAKS)!');
    }
    console.log('=======================================================\n');

  } catch (err) {
    console.error('Black-box test exception:', err);
  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

runBlackBoxTests();
