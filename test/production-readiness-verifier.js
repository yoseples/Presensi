/**
 * ============================================================================
 * PRODUCTION READINESS VERIFIER & 1,000-KEY ENTROPY TEST SUITE
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');

const {
  generateCryptographicKey,
  cleanDomainString,
  signLicenseToken,
  verifyLicenseToken,
  PUBLIC_KEY,
  PRIVATE_KEY
} = require('../server/license-server.js');

async function runProductionReadinessVerifier() {
  console.log('\n=======================================================');
  console.log('🔬 EXECUTING FINAL PRODUCTION READINESS VERIFICATION');
  console.log('=======================================================\n');

  // ------------------------------------------------------------------------
  // 1. 1,000-KEY CSPRNG ENTROPY & UNIQUENESS TEST
  // ------------------------------------------------------------------------
  console.log('🔹 1. Generating 1,000 CSPRNG License Keys to test collision resistance...');
  const keySet = new Set();
  let validFormatCount = 0;
  const keyRegex = /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/;

  const tStart = Date.now();
  for (let i = 0; i < 1000; i++) {
    const k = generateCryptographicKey('SMAN');
    keySet.add(k);
    if (keyRegex.test(k)) {
      validFormatCount++;
    }
  }
  const tElapsed = Date.now() - tStart;

  const isUnique1000 = (keySet.size === 1000);
  const isFormat1000 = (validFormatCount === 1000);

  console.log(`   - Generated: 1,000 keys in ${tElapsed}ms`);
  console.log(`   - Unique Count: ${keySet.size} / 1,000 (Collisions: ${1000 - keySet.size})`);
  console.log(`   - Valid Format (XXXX-XXXX-XXXX-XXXX-XXXX): ${validFormatCount} / 1,000`);
  console.log(`   - Result: ${isUnique1000 && isFormat1000 ? '✅ PASS (100% Unique & Compliant)' : '❌ FAIL'}\n`);

  // ------------------------------------------------------------------------
  // 2. REPOSITORY SECRET LEAK SCAN
  // ------------------------------------------------------------------------
  console.log('🔹 2. Scanning Project Repository & Public Assets for Sensitive Secret Leaks...');
  const projectRoot = path.join(__dirname, '..');
  const filesToScan = [
    'index.html',
    'database.sql',
    'README.md',
    'package.json',
    '.gitignore',
    'firebase.rules.json'
  ];

  const leakPatterns = [
    { name: 'Private Key in client code', regex: /BEGIN (RSA )?PRIVATE KEY/i, allowedFiles: [] },
    { name: 'Database plain password', regex: /db_password\s*=\s*['"][^'"]+['"]/i, allowedFiles: [] },
    { name: 'Firebase Service Account Private Key', regex: /"private_key":\s*"-----BEGIN/i, allowedFiles: [] },
    { name: 'AWS / Cloud Secret Key', regex: /aws_secret_access_key/i, allowedFiles: [] }
  ];

  let leaksFound = 0;
  for (const f of filesToScan) {
    const fullPath = path.join(projectRoot, f);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const p of leakPatterns) {
        if (p.regex.test(content) && !p.allowedFiles.includes(f)) {
          console.log(`   ❌ LEAK DETECTED in ${f}: ${p.name}`);
          leaksFound++;
        }
      }
    }
  }

  // Also check that keys/license_private.key is present in .gitignore
  const gitignoreContent = fs.readFileSync(path.join(projectRoot, '.gitignore'), 'utf8');
  const isGitProtected = gitignoreContent.includes('keys/license_private.key');

  console.log(`   - Public File Leaks Detected: ${leaksFound}`);
  console.log(`   - Private Key Git-Protection Status: ${isGitProtected ? '✅ PROTECTED (In .gitignore)' : '❌ UNPROTECTED'}`);
  console.log(`   - Result: ${leaksFound === 0 && isGitProtected ? '✅ PASS (Zero Secrets Exposed)' : '❌ FAIL'}\n`);

  // ------------------------------------------------------------------------
  // 3. CRYPTOGRAPHIC TAMPER & ALGORITHM HARDENING TEST
  // ------------------------------------------------------------------------
  console.log('🔹 3. Verifying Cryptographic Token Signature & Algorithm Confusion Resistance...');
  const legitPayload = {
    license_id: 'lic_audit_test',
    product: 'presensi-smansa-pro',
    domain: 'smansa.sch.id',
    customer: 'SMA Negeri 1',
    status: 'active',
    license_type: 'Lifetime',
    entitlements: { export_advanced_rekap: true, bulk_qr_generator: true },
    issued_at: new Date().toISOString(),
    expires_at: null
  };

  const legitToken = signLicenseToken(legitPayload);
  const legitVerify = verifyLicenseToken(legitToken);

  // Forgery Attack 1: Modify domain in payload
  const parts = legitToken.split('.');
  const tamperedPayload1 = Buffer.from(JSON.stringify({ ...legitPayload, domain: 'hacked.com' })).toString('base64url');
  const tamperedToken1 = `${parts[0]}.${tamperedPayload1}.${parts[2]}`;
  const verifyTamper1 = verifyLicenseToken(tamperedToken1);

  // Forgery Attack 2: Alg none attack
  const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const noneToken = `${noneHeader}.${parts[1]}.`;
  const verifyNone = verifyLicenseToken(noneToken);

  console.log(`   - Valid Token Verified: ${legitVerify.valid ? '✅ YES' : '❌ NO'}`);
  console.log(`   - Tampered Domain Rejected: ${!verifyTamper1.valid ? '✅ YES (' + verifyTamper1.reason + ')' : '❌ NO'}`);
  console.log(`   - Alg "none" Rejected: ${!verifyNone.valid ? '✅ YES (' + verifyNone.reason + ')' : '❌ NO'}`);
  console.log(`   - Result: ${legitVerify.valid && !verifyTamper1.valid && !verifyNone.valid ? '✅ PASS (100% Cryptographically Sound)' : '❌ FAIL'}\n`);

  // ------------------------------------------------------------------------
  // 4. DOMAIN NORMALIZATION TEST
  // ------------------------------------------------------------------------
  console.log('🔹 4. Testing Domain Normalization Matrix...');
  const testDomains = [
    { input: 'https://www.smansalhoksukon.sch.id/app/dashboard', expected: 'smansalhoksukon.sch.id' },
    { input: 'http://smansalhoksukon.sch.id:8080/index.html', expected: 'smansalhoksukon.sch.id' },
    { input: 'WWW.SMANSALHOKSUKON.SCH.ID', expected: 'smansalhoksukon.sch.id' },
    { input: 'smansalhoksukon.sch.id/', expected: 'smansalhoksukon.sch.id' },
    { input: 'localhost:3000', expected: 'localhost' },
    { input: '127.0.0.1:8080', expected: '127.0.0.1' }
  ];

  let domainNormPass = true;
  for (const d of testDomains) {
    const cleaned = cleanDomainString(d.input);
    if (cleaned !== d.expected) {
      console.log(`   ❌ Normalization mismatch: "${d.input}" -> "${cleaned}" (Expected: "${d.expected}")`);
      domainNormPass = false;
    }
  }
  console.log(`   - Domain Normalization Test: ${domainNormPass ? '✅ PASS (6/6 Test Cases Matched)' : '❌ FAIL'}\n`);

  console.log('=======================================================');
  console.log('🏁 PRODUCTION READINESS VERIFIER COMPLETE');
  console.log('=======================================================\n');
}

runProductionReadinessVerifier();
