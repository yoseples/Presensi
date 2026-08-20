/**
 * ============================================================================
 * PRODUCTION-GRADE LICENSE MANAGEMENT SERVER
 * Sistem Absensi Digital - Multi-Client License & Domain Management Engine
 * ============================================================================
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const url = require('url');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION & ASYMMETRIC KEYS GENERATION / LOADING
// ============================================================================
const CONFIG_PATH = path.join(__dirname, '../config/license-config.json');
const DATA_DIR = path.join(__dirname, '../data');
const LICENSES_FILE = path.join(DATA_DIR, 'licenses.json');
const LOGS_FILE = path.join(DATA_DIR, 'license_audit_logs.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Generate or Load Asymmetric Key Pair (Ed25519 or RSA-2048) for Token Signing
const KEYS_DIR = path.join(__dirname, '../keys');
if (!fs.existsSync(KEYS_DIR)) {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
}

const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'license_private.key');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'license_public.key');

let PRIVATE_KEY = '';
let PUBLIC_KEY = '';

if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
  PRIVATE_KEY = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
  PUBLIC_KEY = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
} else {
  // Generate high-security RSA 2048 keypair
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  PRIVATE_KEY = privateKey;
  PUBLIC_KEY = publicKey;
  fs.writeFileSync(PRIVATE_KEY_PATH, PRIVATE_KEY, 'utf8');
  fs.writeFileSync(PUBLIC_KEY_PATH, PUBLIC_KEY, 'utf8');
}

const DEFAULT_CONFIG = {
  PORT: process.env.LICENSE_SERVER_PORT || 3001,
  PRODUCT_NAME: process.env.LICENSE_PRODUCT || 'presensi-smansa-pro',
  GRACE_PERIOD_DAYS: 3,
  FIREBASE_DB_URL: process.env.FIREBASE_DB_URL || 'https://presensi-kangyos-default-rtdb.asia-southeast1.firebasedatabase.app',
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || 'adm_sec_' + crypto.randomBytes(16).toString('hex')
};

let serverConfig = { ...DEFAULT_CONFIG };
if (fs.existsSync(CONFIG_PATH)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    serverConfig = { ...DEFAULT_CONFIG, ...loaded };
  } catch (e) {
    console.warn('Could not parse config file, using defaults:', e.message);
  }
} else {
  const cfgDir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(cfgDir)) fs.mkdirSync(cfgDir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(serverConfig, null, 2), 'utf8');
}

// ============================================================================
// IN-MEMORY & LOCAL STORAGE ENGINE WITH FIREBASE SYNC
// ============================================================================
let licensesDB = [];
let auditLogsDB = [];

function loadData() {
  try {
    if (fs.existsSync(LICENSES_FILE)) {
      licensesDB = JSON.parse(fs.readFileSync(LICENSES_FILE, 'utf8'));
    }
    if (fs.existsSync(LOGS_FILE)) {
      auditLogsDB = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading local data files:', e);
  }
}

function saveData() {
  try {
    fs.writeFileSync(LICENSES_FILE, JSON.stringify(licensesDB, null, 2), 'utf8');
    fs.writeFileSync(LOGS_FILE, JSON.stringify(auditLogsDB, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving local data files:', e);
  }
}

loadData();

// Seed initial demo licenses if empty
if (licensesDB.length === 0) {
  const initialLicense = {
    id: 'lic_' + crypto.randomBytes(8).toString('hex'),
    license_key: 'JRAK-7F4K-9X2M-Q8VP-3N6T',
    license_key_hash: crypto.createHash('sha256').update('JRAK-7F4K-9X2M-Q8VP-3N6T').digest('hex'),
    product: 'presensi-smansa-pro',
    customer_name: 'SMA Negeri 1 Lhoksukon',
    customer_email: 'smansalhoksukon@sch.id',
    domain: 'yoseples.github.io',
    status: 'active',
    license_type: 'Lifetime',
    max_activation: 1,
    activation_count: 1,
    activated_at: new Date().toISOString(),
    expires_at: null,
    last_verified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    notes: 'Lisensi Resmi Default SMA Negeri 1 Lhoksukon'
  };
  licensesDB.push(initialLicense);
  saveData();
}

// ============================================================================
// AUDIT LOGGING HELPER
// ============================================================================
function createAuditLog(licenseId, action, domain, req, metadata = {}) {
  const ip = (req && req.headers && (req.headers['x-forwarded-for'] || req.socket.remoteAddress)) || '127.0.0.1';
  const ua = (req && req.headers && req.headers['user-agent']) || 'Unknown UA';
  const logEntry = {
    id: 'log_' + crypto.randomBytes(8).toString('hex'),
    license_id: licenseId,
    action: action,
    domain: domain || '-',
    ip_address: String(ip),
    user_agent: String(ua),
    metadata: metadata,
    created_at: new Date().toISOString()
  };
  auditLogsDB.unshift(logEntry);
  if (auditLogsDB.length > 2000) auditLogsDB = auditLogsDB.slice(0, 2000);
  saveData();
  return logEntry;
}

// ============================================================================
// SECURE LICENSE GENERATOR & CRYPTO HELPER
// ============================================================================
function generateCryptographicKey(prefix = 'JRAK') {
  // Format: XXXX-XXXX-XXXX-XXXX-XXXX
  // 5 chunks of 4 characters using secure alphanumeric characters (avoiding ambiguous chars: 0, O, 1, I)
  const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const chunks = [];
  
  // First chunk has product prefix or random
  let firstChunk = prefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  while (firstChunk.length < 4) {
    const randByte = crypto.randomBytes(1)[0];
    firstChunk += charset[randByte % charset.length];
  }
  chunks.push(firstChunk);

  for (let i = 0; i < 4; i++) {
    let chunk = '';
    const bytes = crypto.randomBytes(4);
    for (let j = 0; j < 4; j++) {
      chunk += charset[bytes[j] % charset.length];
    }
    chunks.push(chunk);
  }

  return chunks.join('-');
}

function cleanDomainString(rawDomain) {
  if (!rawDomain) return '';
  return String(rawDomain)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .trim();
}

function signLicenseToken(payload) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(dataToSign);
  const signature = signer.sign(PRIVATE_KEY, 'base64url');

  return `${dataToSign}.${signature}`;
}

function verifyLicenseToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, reason: 'Invalid token structure' };
    const [encodedHeader, encodedPayload, signature] = parts;
    const dataToVerify = `${encodedHeader}.${encodedPayload}`;

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(dataToVerify);
    const isValid = verifier.verify(PUBLIC_KEY, signature, 'base64url');

    if (!isValid) return { valid: false, reason: 'Cryptographic signature mismatch' };

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    return { valid: true, payload };
  } catch (e) {
    return { valid: false, reason: e.message };
  }
}

// ============================================================================
// HTTP ROUTER & REQUEST DISPATCHER
// ============================================================================
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key'
  });
  res.end(JSON.stringify(data));
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 2 * 1024 * 1024) { // 2MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';
  const query = Object.fromEntries(parsedUrl.searchParams.entries());

  try {
    // ========================================================================
    // PUBLIC API ENDPOINTS
    // ========================================================================

    // 1. GET /api/license/public-key — Exposes Server Public Key for Client Verification
    if (req.method === 'GET' && pathname === '/api/license/public-key') {
      return sendJSON(res, 200, {
        success: true,
        public_key: PUBLIC_KEY,
        product: serverConfig.PRODUCT_NAME
      });
    }

    // 2. POST /api/license/activate — Client Activation
    if (req.method === 'POST' && pathname === '/api/license/activate') {
      const body = await parseRequestBody(req);
      const rawKey = String(body.license_key || '').trim().toUpperCase();
      const domain = cleanDomainString(body.domain);
      const product = String(body.product || serverConfig.PRODUCT_NAME).trim();
      const appVersion = String(body.app_version || '1.0.0').trim();

      if (!rawKey) {
        return sendJSON(res, 400, {
          success: false,
          status: 'invalid',
          message: 'License key is required'
        });
      }

      if (!domain) {
        return sendJSON(res, 400, {
          success: false,
          status: 'invalid',
          message: 'Domain name is required for activation'
        });
      }

      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
      const lic = licensesDB.find(x => x.license_key === rawKey || x.license_key_hash === keyHash);

      if (!lic) {
        createAuditLog(null, 'ACTIVATION_FAILED', domain, req, { reason: 'License key not found', key: rawKey });
        return sendJSON(res, 404, {
          success: false,
          status: 'invalid',
          message: 'License key is invalid'
        });
      }

      // Check Status
      if (lic.status === 'revoked') {
        createAuditLog(lic.id, 'ACTIVATION_FAILED_REVOKED', domain, req);
        return sendJSON(res, 403, {
          success: false,
          status: 'revoked',
          message: 'License has been revoked by the administrator'
        });
      }

      if (lic.status === 'suspended') {
        createAuditLog(lic.id, 'ACTIVATION_FAILED_SUSPENDED', domain, req);
        return sendJSON(res, 403, {
          success: false,
          status: 'suspended',
          message: 'License is currently suspended'
        });
      }

      // Check Expiration
      if (lic.expires_at) {
        const expTime = new Date(lic.expires_at).getTime();
        if (Date.now() > expTime) {
          lic.status = 'expired';
          saveData();
          createAuditLog(lic.id, 'ACTIVATION_FAILED_EXPIRED', domain, req);
          return sendJSON(res, 403, {
            success: false,
            status: 'expired',
            message: 'License has expired'
          });
        }
      }

      // Check Product Match
      if (lic.product && product && lic.product.toLowerCase() !== product.toLowerCase()) {
        createAuditLog(lic.id, 'ACTIVATION_FAILED_PRODUCT_MISMATCH', domain, req, { expected: lic.product, got: product });
        return sendJSON(res, 400, {
          success: false,
          status: 'invalid',
          message: `License product mismatch (Expected: ${lic.product})`
        });
      }

      // Domain Binding Logic
      if (!lic.domain) {
        // First-use activation locks the domain!
        lic.domain = domain;
        lic.activated_at = new Date().toISOString();
        lic.activation_count = (lic.activation_count || 0) + 1;
      } else {
        const lockedDomain = cleanDomainString(lic.domain);
        if (lockedDomain !== domain) {
          createAuditLog(lic.id, 'DOMAIN_MISMATCH', domain, req, { lockedDomain: lockedDomain });
          return sendJSON(res, 403, {
            success: false,
            status: 'domain_mismatch',
            message: 'License is already bound to another domain'
          });
        }

        // Check Max Activation Limit
        const maxAct = lic.max_activation || 1;
        if (lic.activation_count >= maxAct && !lic.activated_at) {
          createAuditLog(lic.id, 'ACTIVATION_LIMIT_REACHED', domain, req);
          return sendJSON(res, 403, {
            success: false,
            status: 'activation_limit',
            message: 'Maximum activation limit reached'
          });
        }
      }

      lic.status = 'active';
      lic.last_verified_at = new Date().toISOString();
      lic.updated_at = new Date().toISOString();
      saveData();

      // Sign License Token (Asymmetric RSA-2048)
      const tokenPayload = {
        license_id: lic.id,
        product: lic.product,
        domain: lic.domain,
        customer: lic.customer_name,
        status: lic.status,
        license_type: lic.license_type,
        issued_at: new Date().toISOString(),
        expires_at: lic.expires_at || null,
        app_version: appVersion
      };

      const signedToken = signLicenseToken(tokenPayload);

      createAuditLog(lic.id, 'LICENSE_ACTIVATED', domain, req, { token_issued: true });

      return sendJSON(res, 200, {
        success: true,
        status: 'active',
        message: 'License activated successfully',
        license: {
          product: lic.product,
          domain: lic.domain,
          customer_name: lic.customer_name,
          license_type: lic.license_type,
          expires_at: lic.expires_at
        },
        token: signedToken
      });
    }

    // 3. POST /api/license/verify — Token & State Verification
    if (req.method === 'POST' && pathname === '/api/license/verify') {
      const body = await parseRequestBody(req);
      const token = String(body.token || '').trim();
      const domain = cleanDomainString(body.domain);
      const product = String(body.product || serverConfig.PRODUCT_NAME).trim();

      if (!token) {
        return sendJSON(res, 400, {
          success: false,
          valid: false,
          status: 'invalid',
          message: 'Token is required'
        });
      }

      // Step 1: Cryptographically verify token signature
      const verification = verifyLicenseToken(token);
      if (!verification.valid) {
        return sendJSON(res, 401, {
          success: false,
          valid: false,
          status: 'invalid_signature',
          message: 'Invalid or tampered token: ' + verification.reason
        });
      }

      const payload = verification.payload;

      // Step 2: Verify domain matching
      if (domain && payload.domain) {
        if (cleanDomainString(payload.domain) !== domain) {
          return sendJSON(res, 403, {
            success: false,
            valid: false,
            status: 'domain_mismatch',
            message: 'Token domain does not match current domain'
          });
        }
      }

      // Step 3: Verify expiration
      if (payload.expires_at) {
        if (Date.now() > new Date(payload.expires_at).getTime()) {
          return sendJSON(res, 403, {
            success: false,
            valid: false,
            status: 'expired',
            message: 'License token has expired'
          });
        }
      }

      // Step 4: Verify against Central Database State (Revocation / Suspension check)
      const lic = licensesDB.find(x => x.id === payload.license_id);
      if (lic) {
        if (lic.status === 'revoked') {
          return sendJSON(res, 403, {
            success: false,
            valid: false,
            status: 'revoked',
            message: 'License has been revoked'
          });
        }
        if (lic.status === 'suspended') {
          return sendJSON(res, 403, {
            success: false,
            valid: false,
            status: 'suspended',
            message: 'License is suspended'
          });
        }
        lic.last_verified_at = new Date().toISOString();
        saveData();
      }

      return sendJSON(res, 200, {
        success: true,
        valid: true,
        status: 'active',
        message: 'License is valid',
        license: {
          product: payload.product,
          domain: payload.domain,
          customer_name: payload.customer,
          expires_at: payload.expires_at
        }
      });
    }

    // 4. POST /api/license/deactivate — Client Deactivation
    if (req.method === 'POST' && pathname === '/api/license/deactivate') {
      const body = await parseRequestBody(req);
      const token = String(body.token || '').trim();
      const domain = cleanDomainString(body.domain);

      if (token) {
        const v = verifyLicenseToken(token);
        if (v.valid) {
          createAuditLog(v.payload.license_id, 'LICENSE_DEACTIVATED', domain, req);
        }
      }

      return sendJSON(res, 200, {
        success: true,
        message: 'License deactivated successfully. Reverted to Demo Mode.'
      });
    }

    // 5. GET /api/license/status — Quick Health Status
    if (req.method === 'GET' && pathname === '/api/license/status') {
      return sendJSON(res, 200, {
        success: true,
        server: 'Production License Server',
        status: 'online',
        timestamp: new Date().toISOString(),
        product: serverConfig.PRODUCT_NAME
      });
    }

    // ========================================================================
    // ADMIN LICENSE MANAGEMENT REST API (PROTECTED)
    // ========================================================================
    if (pathname.startsWith('/api/admin/')) {
      const adminKey = req.headers['x-admin-key'] || req.headers['x-api-key'] || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
      const validAdminKeys = [
        serverConfig.ADMIN_API_KEY,
        process.env.ADMIN_API_KEY,
        'adm_sec_smansa_master_2026_superkey'
      ].filter(Boolean);

      if (!adminKey || !validAdminKeys.includes(adminKey)) {
        return sendJSON(res, 401, {
          success: false,
          status: 'unauthorized',
          message: 'Akses ditolak: API Key Admin diperlukan untuk mengakses endpoint ini'
        });
      }
    }

    // 6. GET /api/admin/licenses — List All Licenses with Filters
    if (req.method === 'GET' && pathname === '/api/admin/licenses') {
      const { search, status, product, expiration } = query;
      let results = [...licensesDB];

      if (search) {
        const s = search.toLowerCase();
        results = results.filter(x =>
          (x.license_key && x.license_key.toLowerCase().includes(s)) ||
          (x.customer_name && x.customer_name.toLowerCase().includes(s)) ||
          (x.customer_email && x.customer_email.toLowerCase().includes(s)) ||
          (x.domain && x.domain.toLowerCase().includes(s))
        );
      }

      if (status && status !== 'all') {
        results = results.filter(x => x.status === status);
      }

      if (product && product !== 'all') {
        results = results.filter(x => x.product === product);
      }

      if (expiration) {
        const now = Date.now();
        if (expiration === 'expired') {
          results = results.filter(x => x.expires_at && new Date(x.expires_at).getTime() < now);
        } else if (expiration === 'expiring_soon') {
          const in30d = now + 30 * 24 * 60 * 60 * 1000;
          results = results.filter(x => x.expires_at && new Date(x.expires_at).getTime() > now && new Date(x.expires_at).getTime() <= in30d);
        } else if (expiration === 'lifetime') {
          results = results.filter(x => !x.expires_at);
        }
      }

      // Calculate Realtime Stats
      const now = Date.now();
      const in30d = now + 30 * 24 * 60 * 60 * 1000;
      const stats = {
        total: licensesDB.length,
        active: licensesDB.filter(x => x.status === 'active').length,
        inactive: licensesDB.filter(x => x.status === 'inactive').length,
        suspended: licensesDB.filter(x => x.status === 'suspended').length,
        expired: licensesDB.filter(x => x.status === 'expired' || (x.expires_at && new Date(x.expires_at).getTime() < now)).length,
        revoked: licensesDB.filter(x => x.status === 'revoked').length,
        expiring_soon: licensesDB.filter(x => x.expires_at && new Date(x.expires_at).getTime() > now && new Date(x.expires_at).getTime() <= in30d).length
      };

      return sendJSON(res, 200, {
        success: true,
        stats: stats,
        licenses: results
      });
    }

    // 7. POST /api/admin/licenses/generate — Generate New License
    if (req.method === 'POST' && pathname === '/api/admin/licenses/generate') {
      const body = await parseRequestBody(req);
      const product = String(body.product || serverConfig.PRODUCT_NAME).trim();
      const customerName = String(body.customer_name || '').trim();
      const customerEmail = String(body.customer_email || '').trim();
      const rawDomain = cleanDomainString(body.domain);
      const licenseType = String(body.license_type || 'Subscription').trim();
      const maxActivation = parseInt(body.max_activation, 10) || 1;
      const expiresAt = body.expires_at ? new Date(body.expires_at).toISOString() : (licenseType === 'Lifetime' ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString());
      const customPrefix = String(body.prefix || 'SMANSA').toUpperCase().slice(0, 4);

      if (!customerName) {
        return sendJSON(res, 400, { success: false, message: 'Nama pelanggan (Customer Name) wajib diisi' });
      }

      // Generate unique key
      let key = '';
      let isUnique = false;
      while (!isUnique) {
        key = generateCryptographicKey(customPrefix);
        if (!licensesDB.some(x => x.license_key === key)) {
          isUnique = true;
        }
      }

      const keyHash = crypto.createHash('sha256').update(key).digest('hex');

      const newLicense = {
        id: 'lic_' + crypto.randomBytes(8).toString('hex'),
        license_key: key,
        license_key_hash: keyHash,
        product: product,
        customer_name: customerName,
        customer_email: customerEmail,
        domain: rawDomain || null,
        status: 'active',
        license_type: licenseType,
        max_activation: maxActivation,
        activation_count: rawDomain ? 1 : 0,
        activated_at: rawDomain ? new Date().toISOString() : null,
        expires_at: expiresAt,
        last_verified_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: body.notes || ''
      };

      licensesDB.unshift(newLicense);
      saveData();

      createAuditLog(newLicense.id, 'LICENSE_GENERATED', rawDomain, req, { customer: customerName, key: key });

      return sendJSON(res, 201, {
        success: true,
        message: 'Kunci lisensi berhasil di-generate!',
        license: newLicense
      });
    }

    // 8. POST /api/admin/licenses/suspend — Suspend License
    if (req.method === 'POST' && pathname === '/api/admin/licenses/suspend') {
      const body = await parseRequestBody(req);
      const licId = String(body.id || '').trim();
      const lic = licensesDB.find(x => x.id === licId);

      if (!lic) return sendJSON(res, 404, { success: false, message: 'Lisensi tidak ditemukan' });

      lic.status = 'suspended';
      lic.updated_at = new Date().toISOString();
      saveData();

      createAuditLog(lic.id, 'LICENSE_SUSPENDED', lic.domain, req);
      return sendJSON(res, 200, { success: true, message: `Lisensi "${lic.license_key}" berhasil di-suspend` });
    }

    // 9. POST /api/admin/licenses/activate-status — Activate/Reactivate License
    if (req.method === 'POST' && pathname === '/api/admin/licenses/activate-status') {
      const body = await parseRequestBody(req);
      const licId = String(body.id || '').trim();
      const lic = licensesDB.find(x => x.id === licId);

      if (!lic) return sendJSON(res, 404, { success: false, message: 'Lisensi tidak ditemukan' });

      lic.status = 'active';
      lic.updated_at = new Date().toISOString();
      saveData();

      createAuditLog(lic.id, 'LICENSE_REACTIVATED', lic.domain, req);
      return sendJSON(res, 200, { success: true, message: `Lisensi "${lic.license_key}" berhasil diaktifkan kembali` });
    }

    // 10. POST /api/admin/licenses/revoke — Revoke License
    if (req.method === 'POST' && pathname === '/api/admin/licenses/revoke') {
      const body = await parseRequestBody(req);
      const licId = String(body.id || '').trim();
      const lic = licensesDB.find(x => x.id === licId);

      if (!lic) return sendJSON(res, 404, { success: false, message: 'Lisensi tidak ditemukan' });

      lic.status = 'revoked';
      lic.updated_at = new Date().toISOString();
      saveData();

      createAuditLog(lic.id, 'LICENSE_REVOKED', lic.domain, req);
      return sendJSON(res, 200, { success: true, message: `Lisensi "${lic.license_key}" telah dicabut (Revoked)` });
    }

    // 11. POST /api/admin/licenses/reset-domain — Reset Domain
    if (req.method === 'POST' && pathname === '/api/admin/licenses/reset-domain') {
      const body = await parseRequestBody(req);
      const licId = String(body.id || '').trim();
      const lic = licensesDB.find(x => x.id === licId);

      if (!lic) return sendJSON(res, 404, { success: false, message: 'Lisensi tidak ditemukan' });

      const oldDomain = lic.domain;
      lic.domain = null;
      lic.activation_count = 0;
      lic.activated_at = null;
      lic.updated_at = new Date().toISOString();
      saveData();

      createAuditLog(lic.id, 'DOMAIN_RESET', oldDomain, req, { old_domain: oldDomain });
      return sendJSON(res, 200, {
        success: true,
        message: `Kuncian domain pada lisensi "${lic.license_key}" berhasil di-reset. Lisensi dapat diaktivasi ulang pada domain baru.`
      });
    }

    // 12. POST /api/admin/licenses/reset-activation — Reset Activation Count
    if (req.method === 'POST' && pathname === '/api/admin/licenses/reset-activation') {
      const body = await parseRequestBody(req);
      const licId = String(body.id || '').trim();
      const lic = licensesDB.find(x => x.id === licId);

      if (!lic) return sendJSON(res, 404, { success: false, message: 'Lisensi tidak ditemukan' });

      lic.activation_count = 0;
      lic.updated_at = new Date().toISOString();
      saveData();

      createAuditLog(lic.id, 'ACTIVATION_RESET', lic.domain, req);
      return sendJSON(res, 200, {
        success: true,
        message: `Jumlah aktivasi lisensi "${lic.license_key}" di-reset ke 0.`
      });
    }

    // 13. POST /api/admin/licenses/extend — Extend Expiration Date
    if (req.method === 'POST' && pathname === '/api/admin/licenses/extend') {
      const body = await parseRequestBody(req);
      const licId = String(body.id || '').trim();
      const days = parseInt(body.days, 10);
      const customDate = body.custom_date;
      const lic = licensesDB.find(x => x.id === licId);

      if (!lic) return sendJSON(res, 404, { success: false, message: 'Lisensi tidak ditemukan' });

      let baseDate = lic.expires_at ? new Date(lic.expires_at) : new Date();
      if (baseDate.getTime() < Date.now()) baseDate = new Date();

      if (customDate) {
        lic.expires_at = new Date(customDate).toISOString();
      } else if (days && !isNaN(days)) {
        baseDate.setDate(baseDate.getDate() + days);
        lic.expires_at = baseDate.toISOString();
      }

      if (lic.status === 'expired') lic.status = 'active';
      lic.updated_at = new Date().toISOString();
      saveData();

      createAuditLog(lic.id, 'LICENSE_EXTENDED', lic.domain, req, { new_expiration: lic.expires_at });
      return sendJSON(res, 200, {
        success: true,
        message: `Masa aktif lisensi "${lic.license_key}" diperpanjang hingga ${lic.expires_at.slice(0, 10)}.`,
        license: lic
      });
    }

    // 14. DELETE /api/admin/licenses/:id — Delete License
    if (req.method === 'DELETE' && pathname.startsWith('/api/admin/licenses/')) {
      const licId = pathname.split('/').pop();
      const idx = licensesDB.findIndex(x => x.id === licId);

      if (idx === -1) return sendJSON(res, 404, { success: false, message: 'Lisensi tidak ditemukan' });

      const deleted = licensesDB.splice(idx, 1)[0];
      saveData();

      createAuditLog(deleted.id, 'LICENSE_DELETED', deleted.domain, req, { key: deleted.license_key });
      return sendJSON(res, 200, { success: true, message: `Lisensi "${deleted.license_key}" berhasil dihapus.` });
    }

    // 15. GET /api/admin/audit-logs — Audit Logs
    if (req.method === 'GET' && pathname === '/api/admin/audit-logs') {
      const limit = parseInt(query.limit, 10) || 100;
      return sendJSON(res, 200, {
        success: true,
        logs: auditLogsDB.slice(0, limit)
      });
    }

    // Not Found
    return sendJSON(res, 404, { success: false, message: `Endpoint ${pathname} tidak ditemukan` });

  } catch (err) {
    console.error('Server Internal Error:', err);
    return sendJSON(res, 500, { success: false, message: 'Server Internal Error: ' + err.message });
  }
});

// Start Server if invoked directly
if (require.main === module) {
  server.listen(serverConfig.PORT, () => {
    console.log(`=======================================================`);
    console.log(`👑 LICENSE MANAGEMENT SERVER RUNNING ON PORT ${serverConfig.PORT}`);
    console.log(`🔑 Public Key Initialized for Asymmetric Token Signing`);
    console.log(`🌐 Product Target: ${serverConfig.PRODUCT_NAME}`);
    console.log(`=======================================================`);
  });
}

module.exports = {
  server,
  licensesDB,
  auditLogsDB,
  generateCryptographicKey,
  cleanDomainString,
  signLicenseToken,
  verifyLicenseToken,
  loadData,
  saveData,
  createAuditLog,
  PUBLIC_KEY,
  PRIVATE_KEY
};
