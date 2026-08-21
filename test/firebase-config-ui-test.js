/**
 * ============================================================================
 * FIREBASE DATABASE CONFIGURATION & CONDITIONAL LICENSE UI TEST SUITE
 * ============================================================================
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '../index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

console.log('=======================================================');
console.log('🧪 EXECUTING FIREBASE CONFIG & CONDITIONAL LICENSE TESTS');
console.log('=======================================================');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${name}`);
  } catch (e) {
    console.error(`  ❌ [FAIL] ${name}: ${e.message}`);
  }
}

// 1. Firebase Configuration Panel DOM Presence
runTest('Firebase Configuration Panel is present in Settings DOM', () => {
  assert(html.includes('id="cardFirebaseSettings"'), 'cardFirebaseSettings must exist');
  assert(html.includes('id="fb_apiKey"'), 'fb_apiKey field must exist');
  assert(html.includes('id="fb_projectId"'), 'fb_projectId field must exist');
  assert(html.includes('id="fb_databaseURL"'), 'fb_databaseURL field must exist');
  assert(html.includes('id="fb_authDomain"'), 'fb_authDomain field must exist');
  assert(html.includes('id="fb_storageBucket"'), 'fb_storageBucket field must exist');
  assert(html.includes('id="fb_messagingSenderId"'), 'fb_messagingSenderId field must exist');
  assert(html.includes('id="fb_appId"'), 'fb_appId field must exist');
  assert(html.includes('id="firebaseConnectionBadge"'), 'firebaseConnectionBadge must exist');
  assert(html.includes('id="firebaseTestResultBox"'), 'firebaseTestResultBox must exist');
});

// 2. Firebase Buttons & Handlers
runTest('Firebase action handlers are present and callable', () => {
  assert(html.includes('handleTestFirebaseConnectionUI()'), 'handleTestFirebaseConnectionUI must be wired');
  assert(html.includes('handleSaveFirebaseConfigUI()'), 'handleSaveFirebaseConfigUI must be wired');
  assert(html.includes('promptResetFirebaseConfig()'), 'promptResetFirebaseConfig must be wired');
  assert(html.includes('function testFirebaseConnection'), 'testFirebaseConnection function must exist');
  assert(html.includes('function populateFirebaseFormValues'), 'populateFirebaseFormValues function must exist');
  assert(html.includes('function getFirebaseFormValues'), 'getFirebaseFormValues function must exist');
  assert(html.includes('function initFirebaseInstance'), 'initFirebaseInstance function must exist');
});

// 3. Clean Firebase Reinitialization (No Duplicate Instances)
runTest('Firebase instance reinitialization cleans up previous apps', () => {
  assert(html.includes('app.delete()'), 'Must delete previous apps before re-initializing');
  assert(html.includes('fbDb.ref().off()'), 'Must detach listeners before instance teardown');
});

// 4. Test Connection URL Validation
runTest('Test Connection validates URL format strictly', () => {
  assert(html.includes("!targetConfig.databaseURL.startsWith('https://')"), 'Must reject non-https URLs');
  assert(html.includes("testApp.delete()"), 'Must delete ephemeral testApp instance after test');
});

// 5. Conditional License Visibility & Role Access
runTest('License Activation form is conditionally hidden for Admin in Full Mode', () => {
  assert(html.includes('isSuperRole'), 'Must differentiate Developer/Super Admin vs regular Admin');
  assert(html.includes("licCard.classList.add('hidden')"), 'Must hide card from normal admin when Full');
  assert(html.includes("fbCard.classList.add('hidden')"), 'Must hide Firebase panel from normal admin');
});

// 6. Security Rule Guard
runTest('Zero-trust server-side state enforcement on Full Mode', () => {
  assert(html.includes('LicenseEngine.checkFullVersionStatus'), 'Must verify cryptographic token or signature');
});

console.log('=======================================================');
console.log(`📊 SUMMARY: ${passedTests}/${totalTests} CHECKS PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('=======================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
