/**
 * =========================================================================
 * ALL UG CAMPUS PORTFOLIO - LAPTOP VAULT DISASTER RECOVERY TOOL
 * =========================================================================
 * Run this tool anytime in PowerShell: node restore_from_vault.js
 * Restores the evacuated student database from your laptop Documents folder
 * or data/backups snapshots back into data/users.json safely and securely.
 * Supports AES-256-GCM encrypted (.enc) snapshots with NIST SP 800-38D validation.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Resolve Vault directory (Detects OneDrive and local Documents)
function resolveVaultDir() {
  const oneDriveDocs = path.join(os.homedir(), 'OneDrive', 'Documents');
  const oneDriveVault = path.join(oneDriveDocs, 'Campus_Emergency_Vault');
  if (fs.existsSync(oneDriveVault)) {
    return oneDriveVault;
  }
  const localVault = path.join(os.homedir(), 'Documents', 'Campus_Emergency_Vault');
  if (fs.existsSync(localVault)) {
    return localVault;
  }
  if (fs.existsSync(oneDriveDocs)) {
    return oneDriveVault;
  }
  return localVault;
}

const VAULT_DIR = resolveVaultDir();
const BACKUP_DIR = path.join(__dirname, 'data', 'backups');
const TARGET_USERS_FILE = path.join(__dirname, 'data', 'users.json');
const TARGET_OTPS_FILE = path.join(__dirname, 'data', 'otps.json');

// Derive Decryption Key
const BACKUP_SECRET = process.env.BACKUP_SECRET || process.env.JWT_SECRET || 'campus-portfolio-master-backup-key-2026';
const KEY = crypto.scryptSync(BACKUP_SECRET, 'ug-campus-backup-salt-9988', 32);

function decryptPayload(payload) {
  if (!payload || !payload.iv || !payload.authTag || !payload.data) {
    throw new Error('Invalid encrypted payload schema: iv, authTag, and data are required.');
  }

  const ivBuf = Buffer.from(payload.iv, 'hex');
  const authTagBuf = Buffer.from(payload.authTag, 'hex');

  // NIST SP 800-38D 16-byte tag assertion
  if (authTagBuf.length !== 16) {
    throw new Error('Cryptographic verification failure: GCM authentication tag must be strictly 16 bytes.');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, ivBuf);
  decipher.setAuthTag(authTagBuf);
  let decrypted = decipher.update(payload.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

console.log('================================================================');
console.log('🛡️ ALL UG CAMPUS PORTFOLIO - VAULT DISASTER RECOVERY TOOL');
console.log('================================================================');
console.log(`📁 Checking Laptop Vault: ${VAULT_DIR}`);

let candidateBackups = [];

// 1. Check Laptop Vault for Emergency Backups (.json or .enc)
if (fs.existsSync(VAULT_DIR)) {
  const files = fs.readdirSync(VAULT_DIR)
    .filter(f => f.startsWith('EMERGENCY_VAULT_') && (f.endsWith('.enc') || f.endsWith('.json')))
    .map(f => {
      const fullPath = path.join(VAULT_DIR, f);
      return {
        name: f,
        path: fullPath,
        time: fs.statSync(fullPath).mtimeMs,
        size: fs.statSync(fullPath).size,
        encrypted: f.endsWith('.enc'),
        source: 'Laptop Emergency Vault'
      };
    });
  candidateBackups.push(...files);
}

// 2. Check local data/backups folder for server snapshots
if (fs.existsSync(BACKUP_DIR)) {
  const localFiles = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('snapshot_') && f.endsWith('.enc'))
    .map(f => {
      const fullPath = path.join(BACKUP_DIR, f);
      return {
        name: f,
        path: fullPath,
        time: fs.statSync(fullPath).mtimeMs,
        size: fs.statSync(fullPath).size,
        encrypted: true,
        source: 'Server Rolling Backups'
      };
    });
  candidateBackups.push(...localFiles);
}

candidateBackups.sort((a, b) => b.time - a.time);

if (candidateBackups.length === 0) {
  console.log('ℹ️ No backup snapshots found in laptop vault or backups directory.');
  console.log('   Your current server data in data/users.json is active.');
  process.exit(0);
}

const latest = candidateBackups[0];
console.log(`\n🔍 Found ${candidateBackups.length} snapshot(s).`);
console.log(`⭐ Selected Snapshot: ${latest.name} (${latest.source})`);
console.log(`📅 Timestamp: ${new Date(latest.time).toLocaleString()}`);
console.log(`📦 Size: ${latest.size} bytes (Encrypted: ${latest.encrypted ? 'AES-256-GCM' : 'Plaintext'})`);

try {
  const raw = fs.readFileSync(latest.path, 'utf8');
  let users = null;

  if (latest.encrypted) {
    console.log('🔐 Decrypting AES-256-GCM payload with authenticated master key...');
    const encryptedObj = JSON.parse(raw);
    const decryptedRaw = decryptPayload(encryptedObj);
    const parsed = JSON.parse(decryptedRaw);

    if (Array.isArray(parsed)) {
      users = parsed;
    } else if (parsed && Array.isArray(parsed.users)) {
      users = parsed.users;
      if (parsed.otps) {
        fs.writeFileSync(TARGET_OTPS_FILE, JSON.stringify(parsed.otps, null, 2), 'utf8');
        console.log(`✅ Restored OTP records to ${TARGET_OTPS_FILE}`);
      }
    }
  } else {
    users = JSON.parse(raw);
  }

  if (!Array.isArray(users)) {
    throw new Error('Invalid snapshot structure: Users array could not be parsed.');
  }

  // Ensure data directory exists
  if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
  }

  // Restore to data/users.json
  fs.writeFileSync(TARGET_USERS_FILE, JSON.stringify(users, null, 2), 'utf8');

  console.log(`\n✅ [RESTORE SUCCESSFUL] Restored ${users.length} student record(s) to:`);
  console.log(`   ${TARGET_USERS_FILE}`);
  console.log('\n💡 You can now restart your server: node server.js');
  console.log('================================================================\n');
} catch (err) {
  console.error('\n❌ [RESTORE FAILED]:', err.message);
  process.exit(1);
}
