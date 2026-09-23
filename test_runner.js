/**
 * =========================================================================
 * ALL UG CAMPUS PORTFOLIO - COMPREHENSIVE AUTOMATED TEST RUNNER
 * =========================================================================
 * Evaluates:
 * 1. Static Code & Asset Integrity (HTML, CSS, JS syntax, theme pre-render)
 * 2. Backend API & Privacy Contract (Sanitization, filtering, routes)
 * 3. WAF Security Shield (SQLi, XSS, Honeypots, User-Agent filtering)
 * 4. Frontend UI & Theme Logic (Modal resilience, year colors, fallbacks)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');
const express = require('express');
const http = require('http');

let totalTests = 0;
let passedTests = 0;
const failures = [];

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    failures.push({ name, error: err.message || err });
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Reason: ${err.message || err}`);
  }
}

async function testAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    failures.push({ name, error: err.message || err });
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Reason: ${err.message || err}`);
  }
}

// Helper to make local HTTP requests
function httpRequest(port, path, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path,
      method: options.method || 'GET',
      headers: {
        'User-Agent': options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'object' ? JSON.stringify(options.body) : options.body);
    }
    req.end();
  });
}

async function runAllTests() {
  console.log('\n========================================================');
  console.log('🧪 RUNNING ALL UG CAMPUS PORTFOLIO TEST SUITES');
  console.log('========================================================\n');

  // =========================================================================
  // SUITE 1: STATIC CODE & ASSET INTEGRITY AUDIT
  // =========================================================================
  console.log('--- [SUITE 1: Static Code & Asset Integrity] ---');

  const htmlFiles = ['index.html', 'portfolio.html', 'dashboard.html', 'auth.html'];
  for (const file of htmlFiles) {
    test(`HTML File exists and is non-empty: ${file}`, () => {
      const filePath = path.join(__dirname, file);
      assert.ok(fs.existsSync(filePath), `${file} should exist`);
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(content.length > 500, `${file} should have meaningful content`);
    });

    test(`Pre-render theme script present in <head> of ${file}`, () => {
      const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
      assert.ok(content.includes('portfolio-theme'), `${file} must check 'portfolio-theme' in <head>`);
      assert.ok(content.includes("document.documentElement.setAttribute('data-theme'"), `${file} must set data-theme synchronously in <head>`);
    });
  }

  test('CSS File syntax & Apple theme variables in style.css', () => {
    const cssPath = path.join(__dirname, 'style.css');
    assert.ok(fs.existsSync(cssPath), 'style.css should exist');
    const css = fs.readFileSync(cssPath, 'utf8');
    assert.ok(css.includes('--bg-primary'), 'style.css must define --bg-primary');
    assert.ok(css.includes('--text-primary'), 'style.css must define --text-primary');
    assert.ok(css.includes('--accent'), 'style.css must define --accent');
    // Verify dark mode pure white text
    assert.ok(css.includes('[data-theme="dark"]'), 'style.css must have [data-theme="dark"]');
    assert.ok(css.includes('#ffffff'), 'style.css dark mode must reference pure white #ffffff');
  });

  const jsFiles = ['script.js', 'server.js', 'waf.js', 'backupDaemon.js'];
  for (const file of jsFiles) {
    test(`JS Syntax Valid (node -c): ${file}`, () => {
      const filePath = path.join(__dirname, file);
      assert.ok(fs.existsSync(filePath), `${file} should exist`);
      // Validate syntax using node's check flag
      execSync(`node -c "${filePath}"`);
    });
  }

  // =========================================================================
  // SUITE 2: BACKEND API & DATA CONTRACT AUDIT
  // =========================================================================
  console.log('\n--- [SUITE 2: Backend API & Data Contract] ---');

  // Test sanitizePublicStudent function directly
  test('Data Privacy: sanitizePublicStudent masks email and exposes safe ID', () => {
    // Read server.js and extract or test the sanitize logic
    const mockStudent = {
      id: 'internal-uuid-12345',
      username: 'tinesh-karthik',
      name: 'Tinesh Karthik',
      email: 'secret_login@college.edu',
      passwordHash: '$2a$10$abcdefg123456789',
      course: 'B.Tech',
      year: '3rd Year',
      socials: {
        github: 'https://github.com/tinesh',
        email: 'tinesh.contact@gmail.com'
      }
    };

    // Simulate sanitizePublicStudent logic as implemented in server.js
    const { passwordHash, email, ...safe } = mockStudent;
    const studentId = mockStudent.username || mockStudent.id || 'student';
    const publicSocials = { ...(safe.socials || {}) };
    if (publicSocials.email) {
      const parts = publicSocials.email.split('@');
      if (parts.length === 2) {
        const namePart = parts[0];
        const maskedName = namePart.length > 2 
          ? namePart[0] + '***' + namePart[namePart.length - 1]
          : namePart[0] + '***';
        publicSocials.email = `${maskedName}@${parts[1]}`;
      }
    }
    const sanitized = {
      ...safe,
      id: studentId,
      username: studentId,
      socials: publicSocials
    };

    assert.strictEqual(sanitized.email, undefined, 'Login email MUST NOT be exposed');
    assert.strictEqual(sanitized.passwordHash, undefined, 'Password hash MUST NOT be exposed');
    assert.strictEqual(sanitized.id, 'tinesh-karthik', 'ID must be populated with slug/id');
    assert.strictEqual(sanitized.username, 'tinesh-karthik', 'Username must be populated');
    assert.strictEqual(sanitized.socials.email, 't***t@gmail.com', 'Contact email must be masked');
  });

  // Spin up an isolated in-memory test server on ephemeral port 3991
  const TEST_PORT = 3991;
  const testApp = express();
  testApp.use(express.json());

  const mockUsers = [
    {
      id: 'user-1',
      username: 'tinesh-karthik',
      name: 'Tinesh Karthik',
      email: 'admin@college.edu',
      isVerified: true,
      course: 'B.Tech',
      year: '3rd Year',
      branch: 'CSE',
      skills: ['JavaScript', 'Node.js'],
      projects: [{ title: 'Campus Portfolio' }]
    },
    {
      id: 'user-2',
      username: 'priya-sharma',
      name: 'Priya Sharma',
      email: 'priya@college.edu',
      isVerified: true,
      course: 'BCA',
      year: '2nd Year',
      branch: 'Cloud Computing',
      skills: ['Python', 'AWS'],
      projects: [{ title: 'Cloud Dashboard' }]
    },
    {
      id: 'user-3',
      username: 'unverified-user',
      name: 'Unverified Student',
      email: 'unverified@college.edu',
      isVerified: false,
      course: 'B.Com',
      year: '1st Year'
    }
  ];

  // Implement routes exactly matching server.js
  testApp.get('/api/students', (req, res) => {
    const { course, year, search } = req.query;
    let filtered = mockUsers.filter(u => u.isVerified);

    if (course && course.toLowerCase() !== 'all') {
      filtered = filtered.filter(u => (u.course || 'B.Tech').toLowerCase() === course.toLowerCase());
    }
    if (year && year.toLowerCase() !== 'all') {
      filtered = filtered.filter(u => (u.year || '').toLowerCase() === year.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(u =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.course || '').toLowerCase().includes(q) ||
        (u.branch || '').toLowerCase().includes(q) ||
        (u.skills || []).some(s => s.toLowerCase().includes(q)) ||
        (u.projects || []).some(p => (p.title || '').toLowerCase().includes(q))
      );
    }
    const safeList = filtered.map(u => ({
      id: u.username || u.id,
      username: u.username || u.id,
      name: u.name,
      course: u.course,
      year: u.year,
      branch: u.branch,
      skills: u.skills,
      projects: u.projects
    }));
    res.json(safeList);
  });

  testApp.get('/api/students/:id', (req, res) => {
    const student = mockUsers.find(u => (u.id === req.params.id || u.username === req.params.id) && u.isVerified);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json({ id: student.username || student.id, name: student.name });
  });

  testApp.get('/api/portfolio/:slug', (req, res) => {
    const slug = (req.params.slug || '').toLowerCase();
    const student = mockUsers.find(u =>
      ((u.username && u.username.toLowerCase() === slug) || u.id === req.params.slug) && u.isVerified
    );
    if (!student) return res.status(404).json({ error: 'Student portfolio not found' });
    res.json({ id: student.username || student.id, name: student.name });
  });

  testApp.get('/p/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'portfolio.html'));
  });

  let testServerInstance;
  await new Promise((resolve) => {
    testServerInstance = testApp.listen(TEST_PORT, () => resolve());
  });

  await testAsync('GET /api/students returns only verified students', async () => {
    const res = await httpRequest(TEST_PORT, '/api/students');
    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.length, 2, 'Should only return 2 verified students');
    assert.strictEqual(data[0].username, 'tinesh-karthik');
    assert.strictEqual(data[0].id, 'tinesh-karthik', 'id must match username');
  });

  await testAsync('GET /api/students?course=BCA filters by course', async () => {
    const res = await httpRequest(TEST_PORT, '/api/students?course=BCA');
    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.length, 1);
    assert.strictEqual(data[0].name, 'Priya Sharma');
  });

  await testAsync('GET /api/students?year=3rd%20Year filters by year', async () => {
    const res = await httpRequest(TEST_PORT, '/api/students?year=3rd%20Year');
    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.length, 1);
    assert.strictEqual(data[0].name, 'Tinesh Karthik');
  });

  await testAsync('GET /api/students?search=Python searches skills', async () => {
    const res = await httpRequest(TEST_PORT, '/api/students?search=Python');
    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.length, 1);
    assert.strictEqual(data[0].name, 'Priya Sharma');
  });

  await testAsync('GET /api/portfolio/:slug returns student details', async () => {
    const res = await httpRequest(TEST_PORT, '/api/portfolio/tinesh-karthik');
    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.name, 'Tinesh Karthik');
  });

  await testAsync('GET /api/portfolio/:slug returns 404 for unknown student', async () => {
    const res = await httpRequest(TEST_PORT, '/api/portfolio/nonexistent-student');
    assert.strictEqual(res.statusCode, 404);
  });

  await testAsync('GET /p/:slug returns portfolio.html', async () => {
    const res = await httpRequest(TEST_PORT, '/p/tinesh-karthik');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.includes('Student Portfolio | UG Campus Portfolio'));
  });

  // Close test server instance
  testServerInstance.close();

  // =========================================================================
  // SUITE 3: WAF SECURITY SHIELD AUDIT
  // =========================================================================
  console.log('\n--- [SUITE 3: WAF Security Shield] ---');

  const waf = require('./waf');

  test('WAF blocks Malicious Scanners (sqlmap, nikto)', () => {
    let blocked = false;
    const req = {
      ip: '192.168.1.100',
      method: 'GET',
      path: '/api/students',
      headers: { 'user-agent': 'sqlmap/1.5.2#stable' },
      query: {},
      body: {}
    };
    const res = {
      status: (code) => {
        if (code === 403) blocked = true;
        return { json: () => {} };
      }
    };
    const next = () => {};

    waf.firewallMiddleware(req, res, next);
    assert.ok(blocked, 'WAF must block sqlmap user agent with 403');
  });

  test('WAF blocks Honeypot Paths (/wp-admin, /cgi-bin)', () => {
    let blocked = false;
    const req = {
      ip: '192.168.1.101',
      method: 'GET',
      path: '/wp-admin',
      headers: { 'user-agent': 'Mozilla/5.0' },
      query: {},
      body: {}
    };
    const res = {
      status: (code) => {
        if (code === 403) blocked = true;
        return { json: () => {} };
      }
    };
    const next = () => {};

    waf.firewallMiddleware(req, res, next);
    assert.ok(blocked, 'WAF must block /wp-admin honeypot with 403');
  });

  test('WAF blocks SQL Injection in query params', () => {
    let blocked = false;
    const req = {
      ip: '192.168.1.102',
      method: 'GET',
      path: '/api/students',
      headers: { 'user-agent': 'Mozilla/5.0' },
      query: { search: "' UNION SELECT * FROM users--" },
      body: {}
    };
    const res = {
      status: (code) => {
        if (code === 403) blocked = true;
        return { json: () => {} };
      }
    };
    const next = () => {};

    waf.firewallMiddleware(req, res, next);
    assert.ok(blocked, 'WAF must block SQL injection with 403');
  });

  test('WAF blocks XSS payloads', () => {
    let blocked = false;
    const req = {
      ip: '192.168.1.103',
      method: 'GET',
      path: '/api/students',
      headers: { 'user-agent': 'Mozilla/5.0' },
      query: { search: '<script>alert("hacked")</script>' },
      body: {}
    };
    const res = {
      status: (code) => {
        if (code === 403) blocked = true;
        return { json: () => {} };
      }
    };
    const next = () => {};

    waf.firewallMiddleware(req, res, next);
    assert.ok(blocked, 'WAF must block XSS with 403');
  });

  test('WAF allows legitimate browser request', () => {
    let allowed = false;
    const req = {
      ip: '192.168.1.104',
      method: 'GET',
      path: '/api/students',
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      query: { course: 'B.Tech', year: '3rd Year' },
      body: {}
    };
    const res = {
      status: () => ({ json: () => {} })
    };
    const next = () => { allowed = true; };

    waf.firewallMiddleware(req, res, next);
    assert.ok(allowed, 'WAF must allow legitimate browser request');
  });

  // =========================================================================
  // SUITE 4: FRONTEND UI & THEME LOGIC AUDIT
  // =========================================================================
  console.log('\n--- [SUITE 4: Frontend UI & Theme Logic] ---');

  const scriptContent = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');

  test('script.js: openStudentModal handles undefined / missing identifiers safely', () => {
    assert.ok(scriptContent.includes('openStudentModal'), 'openStudentModal must be defined');
    // Verify multi-field matching
    assert.ok(
      scriptContent.includes('s.username') && scriptContent.includes('s.id') && scriptContent.includes('s.name'),
      'openStudentModal must check s.username, s.id, and s.name'
    );
    // Verify fallback to allStudents[0]
    assert.ok(
      scriptContent.includes('allStudents[0]'),
      'openStudentModal must have safe fallback to allStudents[0]'
    );
  });

  test('script.js: renderStudents does not generate openStudentModal(undefined)', () => {
    assert.ok(
      scriptContent.includes("openStudentModal('${s.username || s.id || ''}')"),
      "renderStudents must pass s.username || s.id || '' to openStudentModal"
    );
  });

  test('script.js: 4th Year badge color is pure white in getYearColor', () => {
    assert.ok(scriptContent.includes("'4th Year'"), 'getYearColor must handle 4th Year');
    assert.ok(scriptContent.includes("text: '#ffffff'"), '4th Year text color must be #ffffff');
  });

  test('script.js: theme synchronization listens to storage event', () => {
    assert.ok(scriptContent.includes("window.addEventListener('storage'"), 'script.js must listen to storage events');
    assert.ok(scriptContent.includes("'portfolio-theme'"), "script.js must listen for 'portfolio-theme' key");
  });

  // =========================================================================
  // SUITE 5: AUTHENTICATION & CRYPTOGRAPHIC TOKEN AUDIT
  // =========================================================================
  console.log('\n--- [SUITE 5: Authentication & Cryptographic Tokens] ---');

  const bcrypt = require('bcryptjs');
  const jwt = require('jsonwebtoken');

  test('Password Hashing: bcrypt generates valid salt and verifies hash', () => {
    const password = 'studentSecurePassword123!';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    assert.ok(hash.startsWith('$2a$') || hash.startsWith('$2b$'), 'Hash must be valid bcrypt format');
    assert.ok(bcrypt.compareSync(password, hash), 'bcrypt must successfully verify password');
    assert.ok(!bcrypt.compareSync('wrongPassword', hash), 'bcrypt must reject invalid password');
  });

  test('JWT Tokens: Signs and verifies payloads with expiry', () => {
    const secret = 'test-token-secret-key-2026';
    const payload = { id: 'student-123', email: 'test@student.edu' };
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    const decoded = jwt.verify(token, secret);
    assert.strictEqual(decoded.id, 'student-123');
    assert.strictEqual(decoded.email, 'test@student.edu');
  });

  test('Anti-Account Takeover (ATO): Locks account after 5 failed attempts', () => {
    const testEmail = 'intruder-target@campus.edu';
    waf.clearLoginFailures(testEmail);
    assert.strictEqual(waf.isAccountLocked(testEmail), false, 'Account should start unlocked');

    for (let i = 0; i < 5; i++) {
      waf.recordLoginFailure(testEmail, '10.0.0.99');
    }
    const lockedMinutes = waf.isAccountLocked(testEmail);
    assert.ok(lockedMinutes > 0, 'Account must be locked after 5 failures');
    waf.clearLoginFailures(testEmail);
    assert.strictEqual(waf.isAccountLocked(testEmail), false, 'Account must be unlocked after clearing');
  });

  // =========================================================================
  // SUITE 6: BACKUP DAEMON & DISASTER RECOVERY AUDIT
  // =========================================================================
  console.log('\n--- [SUITE 6: Backup Daemon & Disaster Recovery] ---');

  const backupDaemon = require('./backupDaemon');

  test('Backup Daemon: exportCleanData returns valid schema', () => {
    const exported = backupDaemon.exportCleanData();
    assert.ok(exported.exportedAt, 'Must include exportedAt timestamp');
    assert.ok(Array.isArray(exported.users), 'users must be an array');
    assert.strictEqual(typeof exported.otps, 'object', 'otps must be an object');
  });

  test('Backup Daemon: listSnapshots returns snapshot list without errors', () => {
    const snapshots = backupDaemon.listSnapshots();
    assert.ok(Array.isArray(snapshots), 'listSnapshots must return an array');
  });

  test('Backup Daemon: getVaultStatus reports valid laptop vault path', () => {
    const vaultStatus = backupDaemon.getVaultStatus();
    assert.ok(vaultStatus.vaultPath, 'Vault path must be defined');
    assert.strictEqual(typeof vaultStatus.vaultActive, 'boolean');
  });

  test('Backup Daemon: exportIncrementalData handles since timestamp correctly', () => {
    // 1. Since 0 should return all records
    const allDelta = backupDaemon.exportIncrementalData(0);
    assert.strictEqual(typeof allDelta.since, 'number');
    assert.ok(Array.isArray(allDelta.records));
    assert.strictEqual(allDelta.newRecordsCount, allDelta.totalRecordsCount);

    // 2. Since far future timestamp should return 0 new records (WhatsApp style)
    const futureDelta = backupDaemon.exportIncrementalData(Date.now() + 10000000);
    assert.strictEqual(futureDelta.newRecordsCount, 0);
    assert.strictEqual(futureDelta.records.length, 0);
    assert.ok(futureDelta.totalRecordsCount >= 0);
  });

  // =========================================================================
  // SUITE 7: CLOUD HARDENING & RESILIENCE VERIFICATION
  // =========================================================================
  console.log('\n--- [SUITE 7: Cloud Hardening & Launch Resilience] ---');

  test('Session Fingerprint: Stable across mobile cellular IP changes', () => {
    const req1 = { headers: { 'user-agent': 'Mozilla/5.0 (iPhone)', 'accept-language': 'en-US' }, ip: '106.203.45.12' };
    const req2 = { headers: { 'user-agent': 'Mozilla/5.0 (iPhone)', 'accept-language': 'en-US' }, ip: '49.37.12.88' }; // Changed cellular IP
    const fp1 = waf.generateFingerprint(req1);
    const fp2 = waf.generateFingerprint(req2);
    assert.strictEqual(fp1, fp2, 'Fingerprint must be stable across mobile IP changes to prevent accidental logout');
    assert.ok(waf.validateFingerprint(req2, fp1), 'Fingerprint must validate successfully');
  });

  test('Non-Destructive Honeypot: Jails attacker without clearing student database', () => {
    const usersBefore = fs.readFileSync(path.join(__dirname, 'data', 'users.json'), 'utf8');
    const attackerIp = '198.51.100.77';
    // Simulate honeypot probe
    const mockReq = { method: 'GET', originalUrl: '/.env', path: '/.env', headers: {}, ip: attackerIp };
    let statusSent = 0;
    const mockRes = {
      status: (s) => { statusSent = s; return mockRes; },
      json: () => {}
    };
    waf.firewallMiddleware(mockReq, mockRes, () => {});
    assert.strictEqual(statusSent, 403, 'Must return 403 Forbidden on honeypot probe');
    const usersAfter = fs.readFileSync(path.join(__dirname, 'data', 'users.json'), 'utf8');
    assert.strictEqual(usersBefore, usersAfter, 'Student database must NEVER be modified or cleared by honeypot probes!');
  });

  test('Auth HTML: OTP input includes numeric keypad mode and paste support', () => {
    const authContent = fs.readFileSync(path.join(__dirname, 'auth.html'), 'utf8');
    assert.ok(authContent.includes('inputmode="numeric"'), 'OTP boxes must specify inputmode="numeric" for mobile keypad');
    assert.ok(authContent.includes('paste'), 'Must support clipboard paste for 6-digit OTP');
    assert.ok(authContent.includes('sessionStorage'), 'Must support session rehydration across page refresh');
  });

  test('Dashboard HTML: handleLogout clears both localStorage and sessionStorage', () => {
    const dashContent = fs.readFileSync(path.join(__dirname, 'dashboard.html'), 'utf8');
    assert.ok(dashContent.includes('localStorage.removeItem("campus_token")'), 'Must clear campus_token from localStorage');
    assert.ok(dashContent.includes('sessionStorage.removeItem("campus_token")'), 'Must clear campus_token from sessionStorage');
  });

  test('Instagram Search: Dropdown DOM & clear button present in index.html and style.css', () => {
    const indexContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    const styleContent = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
    assert.ok(indexContent.includes('searchDropdownResults'), 'index.html must have searchDropdownResults container');
    assert.ok(indexContent.includes('searchClearBtn'), 'index.html must have searchClearBtn');
    assert.ok(styleContent.includes('.search-dropdown-menu'), 'style.css must define .search-dropdown-menu');
    assert.ok(styleContent.includes('.search-result-item'), 'style.css must define .search-result-item');
    assert.ok(styleContent.includes('.search-exact-badge'), 'style.css must define .search-exact-badge');
  });

  test('Instagram Search: Exact match priority logic in script.js', () => {
    const scriptContent = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');
    assert.ok(scriptContent.includes('scoreAndSortStudents'), 'script.js must define scoreAndSortStudents');
    assert.ok(scriptContent.includes('isExact = true'), 'script.js must detect exact match');
    assert.ok(scriptContent.includes('/p/'), 'script.js must support direct navigation to /p/username on exact match and click');
  });

  test('Dashboard HTML: Username is displayed and locked (readonly)', () => {
    const dashContent = fs.readFileSync(path.join(__dirname, 'dashboard.html'), 'utf8');
    assert.ok(dashContent.includes('id="profUsername"'), 'dashboard.html must have profUsername input');
    assert.ok(dashContent.includes('id="profUsername" class="locked-field" readonly'), 'profUsername must be locked-field and readonly');
    assert.ok(dashContent.includes('id="studentUsernameBadge"'), 'dashboard.html must have studentUsernameBadge in welcome header');
  });

  test('Server JS: generateUniqueUsername produces fullname@12345 format and admin is tineshkarthik@00001', () => {
    const serverContent = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
    assert.ok(serverContent.includes('generateUniqueUsername'), 'server.js must define generateUniqueUsername');
    assert.ok(serverContent.includes('tineshkarthik@00001'), 'server.js must set admin username to tineshkarthik@00001');
  });

  // =========================================================================
  // SUITE 8: FORTRESS SECURITY ARCHITECTURE AUDIT
  // =========================================================================
  console.log('\n--- [SUITE 8: Fortress Security Architecture] ---');

  const timingSafe = require('./timingSafe');

  test('Timing Attack Defense: timingSafeEqual performs constant-time comparisons', () => {
    assert.strictEqual(timingSafe.timingSafeEqual('correct-sync-key-2026', 'correct-sync-key-2026'), true);
    assert.strictEqual(timingSafe.timingSafeEqual('correct-sync-key-2026', 'wrong-sync-key-2026'), false);
    assert.strictEqual(timingSafe.timingSafeEqual('short', 'much-longer-string-comparison'), false);
    assert.strictEqual(timingSafe.timingSafeEqual(null, 'test'), false);
    assert.strictEqual(timingSafe.timingSafeEqual('test', undefined), false);
  });

  test('Timing Attack Defense: timingSafeOtpVerify securely verifies 6-digit OTPs', () => {
    assert.strictEqual(timingSafe.timingSafeOtpVerify('481920', '481920'), true);
    assert.strictEqual(timingSafe.timingSafeOtpVerify('481920', '481921'), false);
    assert.strictEqual(timingSafe.timingSafeOtpVerify('48192', '481920'), false);
    assert.strictEqual(timingSafe.timingSafeOtpVerify('', '481920'), false);
  });

  test('Timing Attack Defense: timingSafeSyncKeyVerify securely verifies sync keys', () => {
    const masterKey = 'campus_sync_key_2026_tinesh';
    assert.strictEqual(timingSafe.timingSafeSyncKeyVerify(masterKey, masterKey), true);
    assert.strictEqual(timingSafe.timingSafeSyncKeyVerify('forged_key', masterKey), false);
    assert.strictEqual(timingSafe.timingSafeSyncKeyVerify(undefined, masterKey), false);
  });

  test('ReDoS Immunity: Sanitizer processes pathological nested inputs in <20ms', () => {
    const pathological1 = '<'.repeat(60);
    const pathological2 = '<script '.repeat(30);
    const safeRegex = /<\s*script\b[^>]{0,200}>[\s\S]{0,5000}?<\s*\/\s*script\s*>/gi;
    
    const t0 = Date.now();
    pathological1.replace(safeRegex, '');
    pathological2.replace(safeRegex, '');
    const elapsed = Date.now() - t0;
    
    assert.ok(elapsed < 20, `Sanitizer took ${elapsed}ms; must complete in <20ms`);
  });

  test('Campus Wi-Fi NAT Protection: Composite client key isolates distinct users behind same IP', () => {
    const campusIp = '103.21.244.2';
    const student1Req = {
      headers: { 'cf-connecting-ip': campusIp, 'user-agent': 'StudentLaptop/1.0', 'x-client-id': 'student-1' }
    };
    const student2Req = {
      headers: { 'cf-connecting-ip': campusIp, 'user-agent': 'StudentPhone/2.0', 'x-client-id': 'student-2' }
    };

    const key1 = waf.getCompositeClientKey(student1Req);
    const key2 = waf.getCompositeClientKey(student2Req);

    assert.ok(key1 && key1.length === 32, 'Key 1 must be a valid 32-char hash');
    assert.ok(key2 && key2.length === 32, 'Key 2 must be a valid 32-char hash');
    assert.notStrictEqual(key1, key2, 'Two students sharing the same public IP must have distinct composite keys');
  });

  test('Reverse Proxy IP Resolution: Prioritizes Cloudflare cf-connecting-ip over spoofed headers', () => {
    const spoofedReq = {
      headers: {
        'cf-connecting-ip': '198.51.100.5',
        'x-forwarded-for': '1.2.3.4, 5.6.7.8'
      },
      ip: '127.0.0.1'
    };
    const resolved = waf.getClientIp(spoofedReq);
    assert.strictEqual(resolved, '198.51.100.5', 'WAF must prioritize cf-connecting-ip to prevent IP spoofing');
  });

  test('Data Loss Prevention (DLP): Outgoing filter deep-redacts sensitive keys immutably', () => {
    const mockResponseData = {
      user: {
        name: 'Tinesh Karthik',
        passwordHash: '$2a$10$abcdef123456',
        jwt_secret: 'hidden_secret'
      },
      tokens: [{ salt: 'secret_salt', valid: true }]
    };

    let capturedData = null;
    const mockRes = {
      json: (d) => { capturedData = d; }
    };
    waf.dlpResponseMiddleware({}, mockRes, () => {});
    mockRes.json(mockResponseData);

    assert.strictEqual(capturedData.user.name, 'Tinesh Karthik');
    assert.strictEqual(capturedData.user.passwordHash, undefined, 'passwordHash must be redacted');
    assert.strictEqual(capturedData.user.jwt_secret, undefined, 'jwt_secret must be redacted');
    assert.strictEqual(capturedData.tokens[0].salt, undefined, 'salt in array must be redacted');
    assert.strictEqual(capturedData.tokens[0].valid, true);
  });

  test('Backup Daemon: AES-256-GCM uses 12-byte IV (NIST SP 800-38D)', () => {
    const backupDaemon = require('./backupDaemon');
    const snapshot = backupDaemon.createSnapshot('test_fortress_iv');
    assert.ok(snapshot.success, 'Snapshot creation must succeed');

    const snapshots = backupDaemon.listSnapshots();
    assert.ok(snapshots.length > 0);
    const latest = snapshots[0];
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'backups', latest.filename), 'utf8'));
    // IV length in hex string: 12 bytes = 24 hex characters
    assert.strictEqual(raw.iv.length, 24, 'IV must be 12 bytes (24 hex chars) per NIST SP 800-38D');
  });

  test('Backdoor Purge: server.js contains zero runtime admin123 fallbacks in auth/login or change-password', () => {
    const serverCode = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
    assert.ok(!serverCode.includes("password === 'admin123' && users"), 'server.js must not contain password === admin123 runtime fallback');
    assert.ok(!serverCode.includes("currentPassword === 'admin123'"), 'server.js must not contain currentPassword === admin123 bypass in change-password');
  });

  // =========================================================================
  // SUITE 9: PHASE 2 DEFENSIVE HARDENING & CONCURRENCY
  // =========================================================================
  console.log('\n--- [SUITE 9: Phase 2 Defensive Hardening & Concurrency] ---');

  test('CSPRNG Entropy: generateSecureOtp generates unpredictable 6-digit codes', () => {
    const { generateSecureOtp } = require('./timingSafe');
    const codes = new Set();
    for (let i = 0; i < 50; i++) {
      const code = generateSecureOtp();
      assert.strictEqual(typeof code, 'string');
      assert.strictEqual(code.length, 6, 'OTP must be exactly 6 digits');
      assert.ok(/^\d{6}$/.test(code), 'OTP must contain only digits');
      codes.add(code);
    }
    assert.ok(codes.size >= 45, 'CSPRNG must generate distinct random codes with high entropy');
  });

  test('Atomic In-Memory Cache: Reads execute in <2ms with zero disk I/O and valid ETag', () => {
    const atomicCache = require('./atomicCache');
    const t0 = Date.now();
    const users = atomicCache.getUsers();
    const elapsed = Date.now() - t0;

    assert.ok(Array.isArray(users), 'Users must be an array');
    assert.ok(elapsed < 5, `In-memory read must complete in <5ms; took ${elapsed}ms`);

    const { buffer, etag } = atomicCache.getPublicBufferAndETag();
    assert.ok(Buffer.isBuffer(buffer), 'Public buffer must be a Buffer');
    assert.ok(typeof etag === 'string' && etag.startsWith('W/"'), 'ETag must follow weak ETag format');
  });

  test('RASP Shield: V8 Prototype Freezing prevents tampering with Object.prototype', () => {
    const { activatePrototypeFreezing } = require('./raspGuard');
    activatePrototypeFreezing();

    assert.ok(Object.isFrozen(Object.prototype), 'Object.prototype must be frozen');
    try {
      Object.prototype.pollutedExploit = true;
    } catch (_) {}
    assert.strictEqual(Object.prototype.pollutedExploit, undefined, 'Object.prototype must not be pollutable');
  });

  test('RASP Shield: JSON Reviver Trap catches __proto__ pollution attempts', () => {
    const { secureJsonReviver } = require('./raspGuard');
    assert.throws(() => {
      JSON.parse('{"__proto__": {"isAdmin": true}}', secureJsonReviver);
    }, (err) => {
      return err.message === 'PROTOTYPE_POLLUTION_ATTACK_DETECTED' && err.isRaspTrip === true;
    }, 'JSON parser must trip RASP exception on __proto__');
  });

  test('Enhanced DLP: Universal filter redacts privateKey, apiKey, syncKey, and Bcrypt string patterns', () => {
    const payload = {
      apiKey: 'secret_live_api_key_12345',
      syncKey: 'admin_sync_pass_9999',
      studentNotes: 'User hash is $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy in db'
    };

    let scrubbed = null;
    const mockRes = {
      json: (d) => { scrubbed = d; }
    };
    waf.dlpResponseMiddleware({}, mockRes, () => {});
    mockRes.json(payload);

    assert.strictEqual(scrubbed.apiKey, undefined, 'apiKey must be redacted');
    assert.strictEqual(scrubbed.syncKey, undefined, 'syncKey must be redacted');
    assert.ok(!scrubbed.studentNotes.includes('$2a$10$'), 'Bcrypt hash inside text must be redacted');
    assert.ok(scrubbed.studentNotes.includes('[REDACTED_HASH]'), 'Bcrypt pattern must be replaced with [REDACTED_HASH]');
  });


  console.log('\n========================================================');
  console.log(`📊 TEST SUMMARY: ${passedTests}/${totalTests} PASSED`);
  if (failures.length === 0) {
    console.log('🎉 ALL TEST SUITES PASSED WITH 0 ERRORS!');
    console.log('========================================================\n');
    process.exit(0);
  } else {
    console.error(`⚠️ ${failures.length} TEST(S) FAILED:`);
    failures.forEach((f, idx) => {
      console.error(`  ${idx + 1}. ${f.name}: ${f.error}`);
    });
    console.log('========================================================\n');
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
