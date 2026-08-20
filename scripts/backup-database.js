/**
 * ============================================================================
 * DATABASE BACKUP & RESTORE UTILITY
 * Sistem Absensi Digital - License & Data Protection Engine
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const BACKUP_DIR = path.join(__dirname, '../backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function createBackup(tag = 'daily') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targetDir = path.join(BACKUP_DIR, `${tag}_backup_${timestamp}`);
  fs.mkdirSync(targetDir, { recursive: true });

  const files = ['licenses.json', 'license_audit_logs.json'];
  let count = 0;

  for (const file of files) {
    const src = path.join(DATA_DIR, file);
    if (fs.existsSync(src)) {
      const dest = path.join(targetDir, file);
      fs.copyFileSync(src, dest);
      count++;
    }
  }

  console.log(`✅ Backup created successfully: ${targetDir} (${count} files copied)`);
  return targetDir;
}

function restoreBackup(backupFolderName) {
  const targetDir = path.join(BACKUP_DIR, backupFolderName);
  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Backup directory not found: ${targetDir}`);
    return false;
  }

  const files = fs.readdirSync(targetDir);
  for (const file of files) {
    const src = path.join(targetDir, file);
    const dest = path.join(DATA_DIR, file);
    fs.copyFileSync(src, dest);
  }

  console.log(`✅ Restore completed from: ${backupFolderName}`);
  return true;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const action = args[0] || 'backup';
  const param = args[1] || 'manual';

  if (action === 'backup') {
    createBackup(param);
  } else if (action === 'restore') {
    restoreBackup(param);
  } else {
    console.log('Usage: node scripts/backup-database.js [backup|restore] [tag|folderName]');
  }
}

module.exports = { createBackup, restoreBackup };
