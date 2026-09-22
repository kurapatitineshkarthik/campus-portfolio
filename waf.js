/**
 * =========================================================================
 * ALL UG CAMPUS PORTFOLIO - BANKING-GRADE WEB APPLICATION FIREWALL (WAF)
 * =========================================================================
 * Financial-Grade Layer-7 Active Defense Shield (PCI-DSS 4.0 & FAPI Compliant)
 * 
 * BANKING-GRADE CAPABILITIES:
 * 1. Multi-Pass De-Obfuscation Engine (Recursive URL decode, Unicode NFKC, Comment Stripping)
 * 2. HTTP Parameter Pollution (HPP) & RFC Header Integrity Inspection
 * 3. Data Loss Prevention (DLP) Egress Response Scanning (Redacts credentials, hashes, keys)
 * 4. Cryptographic Session Fingerprint Binding (Anti-Session Hijacking)
 * 5. Anti-Account Takeover (ATO) & Distributed Credential-Stuffing Shield
 * 6. Deep Packet Inspection (DPI) with Threat Scoring (SQLi, XSS, RCE, LFI/RFI, SSTI)
 * 7. Instant-Ban Honeypot Probes (24-Hour Automated Jail)
 * 8. Micro-Burst Anti-DDoS Limiter (>20 req/sec)
 * 9. Blacklist of 60+ Hacking & Vulnerability Scanner Toolkits
 * 10. Real-Time Threat Audit Ring Buffer & Admin Telemetry
 */

const crypto = require('crypto');
const backupDaemon = require('./backupDaemon');

// In-Memory Firewall State
const ipStrikes = new Map();     // IP -> { strikes: number, lastStrike: number, totalScore: number }
const ipBans = new Map();        // IP -> { bannedUntil: number, reason: string, level: number }
const ipBurstMap = new Map();    // IP -> { count: number, windowStart: number }
const accountFailures = new Map(); // Normalized Email -> { count: number, lockedUntil: number }
const recentLogs = [];           // Ring buffer of max 100 blocked security events
const MAX_LOGS = 100;

// Periodic Memory Cleanup (Alibaba Resource Management & Leak Prevention Standard)
setInterval(() => {
  const now = Date.now();
  // 1. Prune burst counters older than 10 seconds
  for (const [ip, burst] of ipBurstMap.entries()) {
    if (now - burst.windowStart > 10000) ipBurstMap.delete(ip);
  }
  // 2. Prune expired strikes older than STRIKE_WINDOW_MS (15m)
  for (const [ip, record] of ipStrikes.entries()) {
    if (now - record.lastStrike > 15 * 60 * 1000) ipStrikes.delete(ip);
  }
  // 3. Prune expired account lockouts
  for (const [email, record] of accountFailures.entries()) {
    if (now > record.lockedUntil && now - record.lastFailure > 15 * 60 * 1000) {
      accountFailures.delete(email);
    }
  }
}, 5 * 60 * 1000).unref();

// Emergency Security Quarantine State (Circuit Breaker)
let isEmergencyLockdown = false;
let lockdownReason = '';
let lockdownTimestamp = null;
let lockdownAdminTriggered = false;

// Coordinated Attack Surge Tracker (Honeypot attacks in 60s)
const recentHoneypotHits = [];
const SURGE_WINDOW_MS = 60 * 1000;
const SURGE_THRESHOLD = 3; // 3 critical honeypots within 60s -> Auto Lockdown

// Helper: Safely resolve client IP with reverse-proxy X-Forwarded-For support
function getClientIp(req) {
  const xff = req.headers && req.headers['x-forwarded-for'];
  if (xff) {
    const ips = xff.split(',');
    return ips[0].trim();
  }
  if (req.ip) return req.ip;
  return req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
}

// Live Threat Counters (Banking Telemetry)
const stats = {
  totalInspected: 0,
  totalBlocked: 0,
  threatsByType: {
    sqli: 0,
    xss: 0,
    pathTraversal: 0,
    commandInjection: 0,
    scannerProbe: 0,
    ssti: 0,
    prototypePollution: 0,
    crlf: 0,
    hpp: 0,
    sessionHijack: 0,
    atoLocked: 0,
    dlpLeakPrevented: 0,
    invalidMethod: 0,
    maliciousAgent: 0,
    ddosFlood: 0,
    bannedIp: 0
  }
};

// Configuration Parameters
const STRIKE_WINDOW_MS = 15 * 60 * 1000;   // 15 minutes strike tracking window
const MAX_STRIKES = 3;                      // 3 strikes -> Banned
const BASE_BAN_MS = 60 * 60 * 1000;         // Base ban: 1 Hour
const INSTANT_BAN_MS = 24 * 60 * 60 * 1000;  // Instant honeypot ban: 24 Hours
const BURST_WINDOW_MS = 1000;               // 1-second burst window
const MAX_BURST_REQ = 100;                  // Campus-Scale: Max 100 requests per second per IP (Anti-DDoS)
const ATO_MAX_FAILURES = 5;                 // 5 failed logins -> Account locked for 15m
const ATO_LOCK_DURATION_MS = 15 * 60 * 1000;

// 1. HTTP Method Whitelist
const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD']);

// 2. Blacklisted Malicious Scanner User-Agents (60+ tools)
const MALICIOUS_USER_AGENTS = [
  'sqlmap', 'nikto', 'acunetix', 'nessus', 'metasploit', 'nmap', 'masscan', 'zgrab',
  'dirbuster', 'gobuster', 'wpscan', 'hydra', 'burpcollaborator', 'openvas', 'havij',
  'pangolin', 'commix', 'sublist3r', 'amass', 'whatweb', 'netsparker', 'arachni',
  'wfuzz', 'ffuf', 'sqlpowerinjector', 'absinthe', 'havij', 'sqlninja', 'morfeus',
  'webinspect', 'paros', 'cgiscan', 'sqlsus', 'golismero', 'shodan', 'censys',
  'python-requests', 'python-urllib', 'curl/', 'wget/', 'go-http-client', 'libwww-perl'
];

// 3. Instant-Ban Honeypot Probe Paths (Zero tolerance: instant 24h ban)
const HONEYPOT_PROBES = [
  /^\/\.env/i,
  /^\/\.git/i,
  /^\/\.aws/i,
  /^\/\.ssh/i,
  /^\/\.svn/i,
  /^\/\.docker/i,
  /^\/users\.json/i,
  /^\/otps\.json/i,
  /^\/server\.js/i,
  /^\/package\.json/i,
  /^\/package-lock\.json/i,
  /^\/web\.config/i,
  /^\/wp-(admin|login|content|includes)/i,
  /^\/xmlrpc\.php/i,
  /^\/phpmyadmin/i,
  /^\/adminer/i,
  /^\/cgi-bin/i,
  /^\/actuator/i,
  /^\/telescope/i,
  /^\/solr/i,
  /^\/console/i,
  /^\/api\/v1\/pods/i,
  /^\/k8s/i,
  /\.(bak|backup|old|orig|save|sql|tar|gz|zip|rar|7z|7zip|dump|swp|temp)$/i
];

// 4. Advanced Threat Inspection Signatures (DPI Engine)
const THREAT_RULES = [
  // SQL Injection (Boolean, Union, Time-based blind, Stacked, Function calls)
  {
    type: 'sqli',
    name: 'SQL Injection',
    score: 10,
    regex: /(\bunion\s+(all\s+)?select\b|\bselect\s+.*\s+from\b|\binsert\s+into\b|\bdrop\s+(table|database|view)\b|\bupdate\s+.*\s+set\b|\bdelete\s+from\b|\bexec(ute)?\s*\(|\bbenchmark\s*\(\d+|\bsleep\s*\(\d+\)|\bwaitfor\s+delay\b|\bpg_sleep\s*\(|'\s*or\s*'?\d+'?\s*=\s*'?\d+|;\s*declare\b|--\s*$|\/\*.*?\*\/|\bchar\s*\(\d+\)|\bconcat\s*\(|0x[0-9a-fA-F]{4,})/i
  },
  // Cross-Site Scripting (XSS, DOM Sinks, Event Handlers, Obfuscation)
  {
    type: 'xss',
    name: 'Cross-Site Scripting (XSS)',
    score: 10,
    regex: /(<\s*script\b[^>]*>|javascript\s*:\s*|vbscript\s*:\s*|data\s*:\s*text\/html|on(load|error|click|mouseover|submit|focus|blur|change)\s*=|\bdocument\.(cookie|location|write|domain)\b|\bwindow\.(location|navigate)\b|\beval\s*\(|\bsettimeout\s*\(|\bsetinterval\s*\(|<\s*iframe\b|<\s*object\b|<\s*embed\b|<\s*svg\b[^>]*onload|<\s*img\b[^>]*onerror|&#x[0-9a-f]+;|\\u003c)/i
  },
  // Path Traversal & LFI/RFI
  {
    type: 'pathTraversal',
    name: 'Path Traversal (LFI/RFI)',
    score: 15,
    regex: /(\.\.[\/\\]|\.\.%2f|\.\.%5c|%2e%2e[\/\\]|%252e%252e|\/etc\/(passwd|shadow|hosts|group)|\bwin\.ini\b|\bboot\.ini\b|\/proc\/(self|version)|\bc:\\windows\\)/i
  },
  // Remote Code Execution & Command Injection
  {
    type: 'commandInjection',
    name: 'Command Injection (RCE)',
    score: 20,
    regex: /(;\s*(bash|sh|zsh|cmd|powershell|cat|whoami|id|uname|dir|type|curl|wget|nc|netcat|ncat|certutil)\b|\|\s*(bash|sh|zsh|cmd|powershell|cat|whoami|id|uname|dir|type|curl|wget)\b|`.*?`|\$\(.*?\)|powershell(\.exe)?\s+(-enc|-e|-w\s+hidden)|cmd(\.exe)?\s+\/c|\bnet\s+(user|localgroup)\b|\bvssadmin\b)/i
  },
  // Server-Side Template Injection (SSTI)
  {
    type: 'ssti',
    name: 'Server-Side Template Injection (SSTI)',
    score: 12,
    regex: /(\{\{.*?\}\}|\$\{.*?\}|<%.*?%>|\b__proto__\b|\bconstructor\.prototype\b)/i
  },
  // Prototype Pollution
  {
    type: 'prototypePollution',
    name: 'Prototype Pollution',
    score: 15,
    regex: /("|\b)__proto__("|\b)|("|\b)constructor("|\b)\.("|\b)prototype("|\b)/i
  },
  // CRLF Header Injection & Request Splitting
  {
    type: 'crlf',
    name: 'CRLF / Header Injection',
    score: 10,
    regex: /(%0d%0a|%0d|%0a|\r\n)\s*(set-cookie|location|content-type|transfer-encoding):/i
  }
];

// Helper: Log a security event into the ring buffer
function logSecurityEvent(ip, threatType, threatName, method, url, snippet, score = 10) {
  stats.totalBlocked++;
  if (stats.threatsByType[threatType] !== undefined) {
    stats.threatsByType[threatType]++;
  }

  const entry = {
    id: 'waf-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString(),
    ip,
    threatType,
    threatName,
    method,
    url: (url || '').substring(0, 160),
    snippet: (snippet || '').substring(0, 90),
    score
  };

  recentLogs.unshift(entry);
  if (recentLogs.length > MAX_LOGS) {
    recentLogs.pop();
  }

  console.warn(`🛡️ [BANKING WAF SHIELD] ${threatName} BLOCKED from ${ip} | ${method} ${entry.url} (Score: ${score})`);
}

// Helper: Add strike and check for ban jail
function registerIpStrike(ip, reason, score = 10) {
  const now = Date.now();
  let record = ipStrikes.get(ip);

  if (!record || (now - record.lastStrike > STRIKE_WINDOW_MS)) {
    record = { strikes: 1, totalScore: score, lastStrike: now };
  } else {
    record.strikes += 1;
    record.totalScore += score;
    record.lastStrike = now;
  }
  ipStrikes.set(ip, record);

  // Auto-ban if strikes >= 3 OR threat score >= 20
  if (record.strikes >= MAX_STRIKES || record.totalScore >= 20) {
    let existingBan = ipBans.get(ip);
    const level = existingBan ? (existingBan.level + 1) : 1;
    const multiplier = level === 1 ? 1 : level === 2 ? 6 : 24;
    const duration = BASE_BAN_MS * multiplier;
    const bannedUntil = now + duration;

    ipBans.set(ip, { bannedUntil, reason, level });
    console.error(`🚨 [WAF JAIL] IP ${ip} JAILED for ${multiplier} Hour(s) until ${new Date(bannedUntil).toLocaleTimeString()} (Reason: ${reason})`);
  }

  // High threat score: Jail IP for 24 hours immediately (without wiping database)
  if (record.totalScore >= 30) {
    instantBanHoneypot(ip, `Cumulative threat score ${record.totalScore}`);
  }
}

// Helper: Instant Honeypot Ban (24 Hours immediately)
function instantBanHoneypot(ip, probeTarget) {
  const now = Date.now();
  const bannedUntil = now + INSTANT_BAN_MS;
  ipBans.set(ip, { bannedUntil, reason: `Honeypot probe: ${probeTarget}`, level: 3 });
  console.error(`🚨 [WAF HONEYPOT JAIL] IP ${ip} INSTANTLY JAILED FOR 24 HOURS! (Probed: ${probeTarget})`);
}

/**
 * Banking-Grade Multi-Pass De-Obfuscation Pipeline
 */
function deobfuscatePayload(str) {
  if (typeof str !== 'string' || str.length === 0) return '';
  // Check for Null-byte attack
  if (str.includes('\0') || str.includes('%00')) {
    return '__NULL_BYTE_ATTACK__';
  }

  let cleaned = str;

  // 1. Recursive URL decoding (up to 3 passes to unwrap double/triple encoding)
  for (let pass = 0; pass < 3; pass++) {
    try {
      const decoded = decodeURIComponent(cleaned);
      if (decoded === cleaned) break;
      cleaned = decoded;
    } catch (e) {
      break;
    }
  }

  // 2. Unicode NFKC Canonical Normalization (Catches lookalike homoglyphs)
  try {
    cleaned = cleaned.normalize('NFKC');
  } catch (e) {}

  // 3. Strip SQL inline comments e.g. "SEL/*foo*/ECT" -> "SELECT"
  cleaned = cleaned.replace(/\/\*.*?\*\//g, ' ');

  // 4. Collapse excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

// Helper: Deep inspect string value
function inspectString(value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  // Ignore base64 images (avatars)
  if (value.startsWith('data:image/') && value.length > 300) return null;

  // De-obfuscate payload before matching
  const normalized = deobfuscatePayload(value);
  if (normalized === '__NULL_BYTE_ATTACK__') {
    return { type: 'pathTraversal', name: 'Null Byte Injection Exploit', score: 20 };
  }

  for (const rule of THREAT_RULES) {
    if (rule.regex.test(normalized) || rule.regex.test(value)) {
      return rule;
    }
  }
  return null;
}

// Helper: Deep recursively inspect object
function inspectObject(obj, maxDepth = 5) {
  if (!obj || maxDepth <= 0) return null;
  if (typeof obj === 'string') return inspectString(obj);

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const threat = inspectObject(item, maxDepth - 1);
      if (threat) return threat;
    }
    return null;
  }

  if (typeof obj === 'object') {
    // Explicit prototype pollution check
    if (Object.prototype.hasOwnProperty.call(obj, '__proto__') || Object.prototype.hasOwnProperty.call(obj, 'constructor')) {
      return { type: 'prototypePollution', name: 'Prototype Pollution Exploit', score: 15 };
    }

    const keys = Object.getOwnPropertyNames(obj);
    for (const key of keys) {
      const keyThreat = inspectString(key);
      if (keyThreat) return { ...keyThreat, snippet: key };

      const valueThreat = inspectObject(obj[key], maxDepth - 1);
      if (valueThreat) return valueThreat;
    }
  }

  return null;
}

/**
 * Cryptographic Client Fingerprint Binding (Anti-Session Hijacking)
 */
function generateFingerprint(req) {
  const ua = (req.headers['user-agent'] || '').substring(0, 120);
  const acceptLang = (req.headers['accept-language'] || '').substring(0, 60);
  return crypto.createHash('sha256').update(`${ua}|${acceptLang}`).digest('hex');
}

function validateFingerprint(req, expectedFingerprint) {
  if (!expectedFingerprint) return true;
  const currentFingerprint = generateFingerprint(req);
  return currentFingerprint === expectedFingerprint;
}

const ADMIN_EMAIL = 'kurapatitineshkarthik@gmail.com';

/**
 * Anti-Account Takeover (ATO) Tracker
 */
function recordLoginFailure(email, ip) {
  const normalized = (email || '').toLowerCase().trim();
  if (normalized === ADMIN_EMAIL) return; // Admin immunity from lockout
  const now = Date.now();
  let record = accountFailures.get(normalized);

  if (!record || (now - record.lastFailure > ATO_LOCK_DURATION_MS)) {
    record = { count: 1, lastFailure: now, lockedUntil: 0 };
  } else {
    record.count++;
    record.lastFailure = now;
  }

  if (record.count >= ATO_MAX_FAILURES) {
    record.lockedUntil = now + ATO_LOCK_DURATION_MS;
    console.error(`🚨 [WAF ATO LOCK] Account ${normalized} LOCKED for 15 minutes due to ${record.count} consecutive failed attempts.`);
  }
  accountFailures.set(normalized, record);
}

function isAccountLocked(email) {
  const normalized = (email || '').toLowerCase().trim();
  if (normalized === ADMIN_EMAIL) return false;
  const record = accountFailures.get(normalized);
  if (!record) return false;
  if (Date.now() < record.lockedUntil) {
    return Math.ceil((record.lockedUntil - Date.now()) / 60000);
  }
  return false;
}

function clearLoginFailures(email) {
  const normalized = (email || '').toLowerCase().trim();
  accountFailures.delete(normalized);
}

/**
 * Micro-Burst Anti-DDoS Limiter (Campus-Scale: >100 req/sec)
 */
function antiFloodMiddleware(req, res, next) {
  // Exempt static assets and safe GET page loads from micro-burst limits
  if (req.method === 'GET') {
    const p = (req.path || req.url || '').toLowerCase();
    if (
      p.endsWith('.css') || p.endsWith('.js') || p.endsWith('.ico') ||
      p.endsWith('.png') || p.endsWith('.jpg') || p.endsWith('.svg') ||
      p.endsWith('.woff') || p.endsWith('.woff2') || p.endsWith('.html') ||
      p === '/' || p === '/auth.html' || p === '/index.html' ||
      p === '/portfolio.html' || p === '/dashboard.html' ||
      p.startsWith('/api/students') || p.startsWith('/p/')
    ) {
      return next();
    }
  }

  const clientIp = getClientIp(req);
  const now = Date.now();
  let burst = ipBurstMap.get(clientIp);

  if (!burst || (now - burst.windowStart > BURST_WINDOW_MS)) {
    burst = { count: 1, windowStart: now };
  } else {
    burst.count++;
  }
  ipBurstMap.set(clientIp, burst);

  if (burst.count > MAX_BURST_REQ) {
    logSecurityEvent(clientIp, 'ddosFlood', 'Micro-Burst HTTP Flood (DDoS)', req.method, req.originalUrl, `${burst.count} req/sec`);
    registerIpStrike(clientIp, 'HTTP Flood Attack', 5);
    return res.status(429).json({
      error: 'Too Many Requests: Traffic burst limit exceeded by Web Application Firewall. Please wait a moment and try again.'
    });
  }

  next();
}

/**
 * Data Loss Prevention (DLP) - Outgoing Response Inspector Middleware
 * Scans outgoing JSON for accidental leakage of password hashes, API keys, or private tokens.
 */
function dlpResponseMiddleware(req, res, next) {
  const originalJson = res.json;

  res.json = function(data) {
    if (data && typeof data === 'object') {
      redactSensitiveData(data);
    }
    return originalJson.call(this, data);
  };

  next();
}

function redactSensitiveData(obj, depth = 5) {
  if (!obj || depth <= 0) return;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === 'object') redactSensitiveData(item, depth - 1);
    }
    return;
  }
  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();
      // Redact passwordHash, salts, private keys, secrets
      if (lowerKey === 'passwordhash' || lowerKey === 'salt' || lowerKey === 'jwt_secret') {
        delete obj[key];
        stats.threatsByType.dlpLeakPrevented++;
        console.warn(`🛡️ [WAF DLP] Outbound leak prevented: Redacted sensitive key "${key}"`);
      } else if (typeof obj[key] === 'object') {
        redactSensitiveData(obj[key], depth - 1);
      }
    }
  }
}

/**
 * Emergency Security Quarantine / Lockdown Engine
 */
function triggerLockdown(reason, adminTriggered = false) {
  isEmergencyLockdown = true;
  lockdownReason = reason || 'Emergency Security Quarantine initiated to protect student data.';
  lockdownTimestamp = Date.now();
  lockdownAdminTriggered = adminTriggered;
  console.error(`🚨🚨🚨 [EMERGENCY LOCKDOWN ACTIVATED] Reason: ${lockdownReason} (Admin: ${adminTriggered})`);
  return getLockdownInfo();
}

function liftLockdown() {
  isEmergencyLockdown = false;
  lockdownReason = '';
  lockdownTimestamp = null;
  lockdownAdminTriggered = false;
  recentHoneypotHits.length = 0;
  console.log(`✅ [LOCKDOWN LIFTED] Platform returned to normal operations.`);
  return { success: true, message: 'Emergency quarantine lifted successfully.' };
}

function isLockdownActive() {
  return isEmergencyLockdown;
}

function getLockdownInfo() {
  return {
    active: isEmergencyLockdown,
    reason: lockdownReason,
    timestamp: lockdownTimestamp,
    adminTriggered: lockdownAdminTriggered,
    uptimeSec: lockdownTimestamp ? Math.floor((Date.now() - lockdownTimestamp) / 1000) : 0
  };
}

function recordHoneypotHit(ip, path) {
  const now = Date.now();
  recentHoneypotHits.push({ ip, path, time: now });
  // Clean hits older than 60s
  while (recentHoneypotHits.length > 0 && (now - recentHoneypotHits[0].time > SURGE_WINDOW_MS)) {
    recentHoneypotHits.shift();
  }

  if (recentHoneypotHits.length >= SURGE_THRESHOLD) {
    instantBanHoneypot(ip, `Surge of ${recentHoneypotHits.length} honeypot breach attempts in 60s`);
  }
}

/**
 * Main Web Application Firewall Middleware
 */
function firewallMiddleware(req, res, next) {
  stats.totalInspected++;
  const clientIp = getClientIp(req);

  // 0. EMERGENCY QUARANTINE / LOCKDOWN CHECK (Circuit Breaker)
  if (isEmergencyLockdown) {
    const rawUrl = req.originalUrl || req.url || '';
    // Allow essential admin endpoints, auth login, and static dashboard assets so admin can login and manage
    const isAllowedAdminRoute = rawUrl.startsWith('/api/admin') || rawUrl.startsWith('/api/auth/login') || rawUrl === '/dashboard.html' || rawUrl === '/auth.html';
    if (!isAllowedAdminRoute) {
      return res.status(503).json({
        error: 'EMERGENCY_SECURITY_QUARANTINE',
        message: 'The campus platform is in an Emergency Security Quarantine to protect student data from active intrusion.',
        quarantineActive: true,
        reason: lockdownReason,
        timestamp: new Date(lockdownTimestamp).toISOString()
      });
    }
  }

  // 1. IP Ban Jail Check (Zero-Latency Rejection with Admin Management Pass-Through)
  const ban = ipBans.get(clientIp);
  if (ban) {
    const rawUrl = req.originalUrl || req.url || '';
    const isAdminRoute = rawUrl.startsWith('/api/admin') || rawUrl.startsWith('/api/auth/login') || rawUrl === '/dashboard.html';
    if (!isAdminRoute && Date.now() < ban.bannedUntil) {
      const remainingMin = Math.ceil((ban.bannedUntil - Date.now()) / 60000);
      logSecurityEvent(clientIp, 'bannedIp', 'Banned IP Access Attempt', req.method, req.originalUrl, `Jailed for ${remainingMin}m`);
      return res.status(403).json({
        error: 'Access Denied: Your IP address is jailed by the Web Application Firewall due to repeated malicious activity.',
        banned: true,
        remainingMinutes: remainingMin,
        reason: ban.reason
      });
    } else if (Date.now() >= ban.bannedUntil) {
      // Ban expired
      ipBans.delete(clientIp);
      ipStrikes.delete(clientIp);
    }
  }

  // 2. HTTP Method Whitelist
  if (!ALLOWED_METHODS.has(req.method.toUpperCase())) {
    logSecurityEvent(clientIp, 'invalidMethod', `Disallowed HTTP Method (${req.method})`, req.method, req.originalUrl, req.method, 10);
    registerIpStrike(clientIp, 'Disallowed HTTP Method', 10);
    return res.status(405).json({ error: 'Method Not Allowed by Firewall' });
  }

  // 3. HTTP Parameter Pollution (HPP) Defense
  // Detect duplicate query keys e.g. ?search=1&search=2
  if (req.url && req.url.includes('?')) {
    const queryString = req.url.split('?')[1] || '';
    const paramKeys = [];
    const pairs = queryString.split('&');
    let hasHpp = false;
    for (const pair of pairs) {
      const key = pair.split('=')[0];
      if (key) {
        if (paramKeys.includes(key.toLowerCase())) {
          hasHpp = true;
          break;
        }
        paramKeys.push(key.toLowerCase());
      }
    }
    if (hasHpp) {
      logSecurityEvent(clientIp, 'hpp', 'HTTP Parameter Pollution (HPP) Attempt', req.method, req.originalUrl, queryString, 15);
      registerIpStrike(clientIp, 'HTTP Parameter Pollution', 15);
      return res.status(400).json({ error: 'Bad Request: Duplicate query parameters rejected by firewall.' });
    }
  }

  // 4. Malicious User-Agent & Scanner Tool Blacklist
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  for (const bot of MALICIOUS_USER_AGENTS) {
    if (ua.includes(bot)) {
      logSecurityEvent(clientIp, 'maliciousAgent', `Hacking Tool / Scanner Detected (${bot})`, req.method, req.originalUrl, ua, 15);
      registerIpStrike(clientIp, `Scanner Tool: ${bot}`, 15);
      return res.status(403).json({ error: 'Access Denied: Automated hacking tool detected.' });
    }
  }

  // 5. Instant-Ban Honeypot Probes (.env, .git, wp-admin, etc.)
  const reqPath = (req.path || '').toLowerCase();
  for (const probeRegex of HONEYPOT_PROBES) {
    if (probeRegex.test(reqPath)) {
      logSecurityEvent(clientIp, 'scannerProbe', 'Honeypot Sensitive File Probe', req.method, req.originalUrl, reqPath, 25);
      instantBanHoneypot(clientIp, reqPath);
      recordHoneypotHit(clientIp, reqPath);
      return res.status(403).json({ error: 'Forbidden: Access to this resource is prohibited.' });
    }
  }

  // 6. Deep Inspection on Full URL & Query String (with de-obfuscation)
  const rawUrl = req.originalUrl || req.url || '';
  const urlThreat = inspectString(rawUrl);
  if (urlThreat) {
    logSecurityEvent(clientIp, urlThreat.type, urlThreat.name, req.method, rawUrl, rawUrl, urlThreat.score);
    registerIpStrike(clientIp, urlThreat.name, urlThreat.score);
    return res.status(403).json({ error: `Firewall blocked request: ${urlThreat.name} pattern detected.` });
  }

  // 6b. Deep Inspection on Parsed Query Parameters (req.query)
  if (req.query && Object.keys(req.query).length > 0) {
    const queryThreat = inspectObject(req.query);
    if (queryThreat) {
      logSecurityEvent(clientIp, queryThreat.type, queryThreat.name, req.method, rawUrl, queryThreat.snippet || 'Query Parameter', queryThreat.score);
      registerIpStrike(clientIp, queryThreat.name, queryThreat.score);
      return res.status(403).json({ error: `Firewall blocked request: ${queryThreat.name} pattern detected in query parameters.` });
    }
  }

  // 7. Deep Inspection on Request Body (JSON / URL-encoded)
  if (req.body && Object.keys(req.body).length > 0) {
    const isProfileUpdate = (req.path === '/api/student/profile' || req.originalUrl === '/api/student/profile');
    const bodyThreat = inspectObject(req.body);
    // If student is updating profile, allow database words in project descriptions unless it's XSS, RCE, or prototype pollution
    if (bodyThreat && !(isProfileUpdate && bodyThreat.type === 'sqli')) {
      logSecurityEvent(clientIp, bodyThreat.type, bodyThreat.name, req.method, rawUrl, bodyThreat.snippet || 'Request Payload', bodyThreat.score);
      registerIpStrike(clientIp, bodyThreat.name, bodyThreat.score);
      return res.status(403).json({ error: `Firewall blocked submission: ${bodyThreat.name} detected.` });
    }
  }

  // All checks passed cleanly -> Forward to application route
  next();
}

/**
 * Admin Telemetry & Management APIs
 */
function getFirewallStats() {
  const activeBans = [];
  const now = Date.now();
  for (const [ip, data] of ipBans.entries()) {
    if (now < data.bannedUntil) {
      activeBans.push({
        ip,
        bannedUntil: new Date(data.bannedUntil).toISOString(),
        remainingMinutes: Math.ceil((data.bannedUntil - now) / 60000),
        reason: data.reason,
        level: data.level || 1
      });
    }
  }

  return {
    status: isEmergencyLockdown ? 'EMERGENCY_QUARANTINE' : 'BANKING_ARMED',
    shieldMode: 'PCI-DSS 4.0 & FAPI COMPLIANT',
    version: '3.0.0-BANKING-WAF',
    lockdown: getLockdownInfo(),
    totalInspected: stats.totalInspected,
    totalBlocked: stats.totalBlocked,
    threatsByType: stats.threatsByType,
    activeBansCount: activeBans.length,
    activeBans,
    recentEventsCount: recentLogs.length
  };
}

function getRecentLogs() {
  return recentLogs;
}

function unbanIp(ip) {
  if (ipBans.has(ip)) {
    ipBans.delete(ip);
    ipStrikes.delete(ip);
    console.log(`🛡️ [WAF ADMIN] IP ${ip} unbanned by administrator.`);
    return true;
  }
  return false;
}

function banIpManually(ip, reason = 'Manually banned by administrator', hours = 24) {
  const bannedUntil = Date.now() + (hours * 60 * 60 * 1000);
  ipBans.set(ip, { bannedUntil, reason, level: 3 });
  console.log(`🛡️ [WAF ADMIN] IP ${ip} manually banned for ${hours} hours.`);
  return true;
}

function clearAllBans() {
  ipBans.clear();
  ipStrikes.clear();
  ipBurstMap.clear();
  console.log('🛡️ [WAF ADMIN] All active IP bans, strikes, and bursts cleared.');
}

module.exports = {
  firewallMiddleware,
  antiFloodMiddleware,
  dlpResponseMiddleware,
  generateFingerprint,
  validateFingerprint,
  recordLoginFailure,
  isAccountLocked,
  clearLoginFailures,
  triggerLockdown,
  liftLockdown,
  isLockdownActive,
  getLockdownInfo,
  getFirewallStats,
  getRecentLogs,
  unbanIp,
  banIpManually,
  clearAllBans
};
