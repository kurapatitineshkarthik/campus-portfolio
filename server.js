/**
 * =========================================================================
 * ALL UG COURSES CAMPUS PORTFOLIO - HIGH-CONCURRENCY BACKEND SERVER
 * =========================================================================
 * Supports all Undergraduate Degrees:
 * - B.Tech / B.E., BCA, B.Sc, B.Com, BBA, BA, B.Pharm, B.Des, etc.
 * - 1st Year to 4th Year
 * - Course-wise and Year-wise public filtering & search
 * - Direct Gmail SSL/STARTTLS SMTP with OTP email verification
 * - Default Admin Password 'admin123' for kurapatitineshkarthik@gmail.com
 * - Admin panel to delete fake accounts
 */

const cluster = require('cluster');
const os = require('os');
const http = require('http');
const https = require('https');
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const waf = require('./waf');
const backupDaemon = require('./backupDaemon');
const { timingSafeEqual, timingSafeOtpVerify, timingSafeSyncKeyVerify, generateSecureOtp } = require('./timingSafe');
const atomicCache = require('./atomicCache');
const {
  activatePrototypeFreezing,
  secureJsonReviver,
  structuralJsonGuard,
  raspErrorHandler,
  HeapBoundMonitor,
  canaryHoneypotMiddleware
} = require('./raspGuard');
require('dotenv').config();

// Activate RASP native V8 prototype freezing immediately upon process boot
activatePrototypeFreezing();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'all_ug_portfolio_secret_key_2026_tinesh';
const DB_PATH = path.join(__dirname, 'data', 'users.json');
const OTPS_PATH = path.join(__dirname, 'data', 'otps.json');

const emailUser = process.env.EMAIL_USER || 'kurapatitineshkarthik@gmail.com';
const emailPass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');
const ADMIN_EMAIL = 'kurapatitineshkarthik@gmail.com'.toLowerCase();

if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2));
}
if (!fs.existsSync(OTPS_PATH)) {
  fs.writeFileSync(OTPS_PATH, JSON.stringify({}, null, 2));
}

// =========================================================================
// 1. PROCESS ARCHITECTURE (Optimized for Render Cloud 512MB RAM & Local)
// =========================================================================
const isClusterMode = process.env.CLUSTER === 'true' && !process.env.RENDER;

if (isClusterMode && cluster.isPrimary) {
  const cpuCount = os.cpus().length;
  const workerCount = Math.min(cpuCount, 4);

  console.log('================================================================');
  console.log(`🎓 ALL UG STUDENTS PORTFOLIO PLATFORM [CLUSTER MODE]`);
  console.log(`⚡ Spawning ${workerCount} Worker Processes for Load Balancing...`);
  console.log('================================================================');

  backupDaemon.startSchedule();

  for (let i = 0; i < workerCount; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    console.warn(`[CLUSTER] Worker ${worker.process.pid} exited. Spawning replacement...`);
    cluster.fork();
  });

} else {
  // Start automated encrypted backup daemon (every 6 hours)
  backupDaemon.startSchedule();
  // =======================================================================
  // 2. WORKER PROCESS
  // =======================================================================
  const app = express();

  // 1. BANKING-GRADE SECURITY HEADERS & PROXY TRUST (PCI-DSS 4.0 Compliant)
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'; default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com; img-src 'self' data: https:;");
    res.setHeader('Permissions-Policy', 'accelerometer=(), camera=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()');
    next();
  });

  // RASP 1: Heap Bound & Adaptive Watermark Monitor (384MB Cloud Ceiling)
  const heapBoundMonitor = new HeapBoundMonitor({ maxHeapMb: 384 });
  app.use(heapBoundMonitor.middleware());

  // RASP 2: Canary Honeypot Decoys (/api/v1/internal/*, /.git/config, etc.)
  app.use(canaryHoneypotMiddleware(waf));

  app.use(compression());
  app.use(cors());

  // RASP 3: Secure JSON Parser with Prototype Reviver Trap & Structural Complexity Limiter
  app.use(express.json({ limit: '100kb', reviver: secureJsonReviver }));
  app.use(structuralJsonGuard);
  app.use(raspErrorHandler(waf));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // 2. DATA LOSS PREVENTION (DLP) OUTBOUND RESPONSE SCANNER
  app.use(waf.dlpResponseMiddleware);

  // 3. ENTERPRISE WAF & ANTI-FLOOD ACTIVE SHIELD
  app.use(waf.antiFloodMiddleware);
  app.use(waf.firewallMiddleware);

  // 4. STATIC ASSET SERVING (Auto-detects /public directory or root fallback)
  // Physically prevents serving server source code (*.js), data directory (data/*),
  // environment files (.env), or configuration files under any circumstance.
  const hasPublicDir = fs.existsSync(path.join(__dirname, 'public')) && fs.readdirSync(path.join(__dirname, 'public')).length > 0;
  const PUBLIC_DIR = hasPublicDir ? path.join(__dirname, 'public') : __dirname;

  // Explicit honeypot probe blocker for sensitive root filenames
  const SENSITIVE_PROBES = new Set([
    '/server.js', '/waf.js', '/atomiccache.js', '/backupdaemon.js',
    '/raspguard.js', '/timingsafe.js', '/package.json', '/package-lock.json',
    '/data/users.json', '/data/otps.json', '/.env', '/config.json',
    '/ecosystem.config.js', '/dockerfile', '/restore_from_vault.js'
  ]);

  app.use((req, res, next) => {
    const cleanPath = (req.path || '').toLowerCase().replace(/\\/g, '/');
    if (SENSITIVE_PROBES.has(cleanPath)) {
      return res.status(403).json({ error: 'Forbidden: Access to server source code or databases is prohibited.' });
    }
    next();
  });

  // Mount static middleware strictly on the resolved public directory
  app.use(express.static(PUBLIC_DIR, {
    maxAge: '1h',
    etag: true,
    lastModified: true,
    dotfiles: 'ignore',
    index: ['index.html']
  }));

  // 2. ANTI-BOT & HONEYPOT PROTECTION
  function botProtection(req, res, next) {
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const blockedTools = ['sqlmap', 'nikto', 'curl/', 'python-requests', 'wget/', 'dirbuster', 'gobuster', 'masscan', 'zgrab'];
    if (blockedTools.some(tool => ua.includes(tool))) {
      return res.status(403).json({ error: 'Automated access denied.' });
    }

    // Honeypot trap check: If hidden field is filled, it is a bot submission
    if (req.body && (req.body.hp_company_trap || req.body.hp_website_trap)) {
      console.warn(`[BOT REJECTED] Honeypot triggered from IP: ${req.ip}`);
      return res.status(400).json({ error: 'Invalid submission request.' });
    }
    next();
  }

  // 3. INPUT SANITIZATION (Linear-time ReDoS-immune sanitization)
  function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    return str
      .replace(/<\s*script\b[^>]{0,200}>[\s\S]{0,5000}?<\s*\/\s*script\s*>/gi, '')
      .replace(/<\s*\/?\s*script\b[^>]{0,200}>?/gi, '')
      .replace(/javascript\s*:/gi, '')
      .replace(/vbscript\s*:/gi, '')
      .replace(/data\s*:\s*text\/html/gi, '')
      .replace(/on[a-z]{1,20}\s*=/gi, '')
      .trim();
  }

  function sanitizePayload(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => typeof item === 'string' ? sanitizeString(item) : sanitizePayload(item));
    const clean = {};
    for (const key of Object.keys(obj)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      if (typeof obj[key] === 'string') {
        clean[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        clean[key] = sanitizePayload(obj[key]);
      } else {
        clean[key] = obj[key];
      }
    }
    return clean;
  }

  // 4. MULTI-TIERED RATE LIMITERS (Campus Wi-Fi Friendly)
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down and try again later.' }
  });
  app.use(generalLimiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Please wait 15 minutes.' }
  });

  const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 25,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many OTP requests. Please wait 10 minutes.' }
  });

  const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many portfolio requests. Please slow down.' }
  });

  app.use('/api/auth/login', authLimiter, botProtection);
  app.use('/api/auth/signup', authLimiter, botProtection);
  app.use('/api/auth/resend-otp', otpLimiter, botProtection);
  app.use('/api/auth/forgot-password', otpLimiter, botProtection);
  app.use('/api/students', publicLimiter);
  app.use('/api/portfolio/', publicLimiter);

  // =======================================================================
  // 3. DATABASE & OTP HELPERS (Atomic In-Memory Cache: Zero Disk Reads on HTTP)
  // =======================================================================
  const otpEngine = atomicCache.otpEngine;

  function getUsers() {
    return atomicCache.getUsers();
  }

  function saveUsers(users) {
    return atomicCache.saveUsers(users);
  }

  function getOtps() {
    try {
      const data = fs.readFileSync(OTPS_PATH, 'utf8');
      return JSON.parse(data || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveOtps(otps) {
    const tempPath = `${OTPS_PATH}.${process.pid}.${Date.now()}.tmp`;
    try {
      fs.writeFileSync(tempPath, JSON.stringify(otps, null, 2), 'utf8');
      fs.renameSync(tempPath, OTPS_PATH);
      return true;
    } catch (e) {
      console.error('[OTP WRITE ERROR]', e);
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch (_) {}
      }
      return false;
    }
  }

  // Generate unique username in format: fullname@12345 (Clean lowercase with 5-digit number)
  function generateUniqueUsername(name, users = []) {
    const cleanName = (name || 'student')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '');
    const baseName = cleanName || 'student';

    let username = '';
    let attempts = 0;
    do {
      const random5 = Math.floor(10000 + Math.random() * 90000);
      username = `${baseName}@${random5}`;
      attempts++;
    } while (users.some(u => u.username && u.username.toLowerCase() === username.toLowerCase()) && attempts < 100);

    return username;
  }

  // Asynchronously stream student registration/update events to Google Sheet
  function streamToGoogleSheet(eventData) {
    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
    if (!webhookUrl || typeof webhookUrl !== 'string' || webhookUrl.trim() === '') {
      return;
    }

    const payload = JSON.stringify({
      timestamp: new Date().toISOString(),
      event: eventData?.event || 'unknown',
      student: eventData?.student ? {
        name: eventData.student.name || '',
        email: eventData.student.email || '',
        username: eventData.student.username || '',
        course: eventData.student.course || '',
        year: eventData.student.year || '',
        branch: eventData.student.branch || '',
        college: eventData.student.college || '',
        skills: Array.isArray(eventData.student.skills) ? eventData.student.skills.join(', ') : (eventData.student.skills || ''),
        projectsCount: Array.isArray(eventData.student.projects) ? eventData.student.projects.length : 0,
        profileUrl: `https://tinesh.in/portfolio.html?username=${encodeURIComponent(eventData.student.username || '')}`
      } : null
    });

    try {
      if (typeof fetch === 'function') {
        fetch(webhookUrl.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload
        }).catch(err => {
          console.warn('⚠️ [GOOGLE SHEET SYNC] Webhook dispatch warning:', err.message);
        });
      } else {
        const parsedUrl = new URL(webhookUrl.trim());
        const isHttps = parsedUrl.protocol === 'https:';
        const client = isHttps ? https : http;
        const req = client.request({
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          },
          timeout: 5000
        }, () => {});
        req.on('error', (err) => console.warn('⚠️ [GOOGLE SHEET SYNC] Webhook error:', err.message));
        req.write(payload);
        req.end();
      }
    } catch (err) {
      console.warn('⚠️ [GOOGLE SHEET SYNC] Webhook exception:', err.message);
    }
  }

  // Ensure default Admin Account and realistic student accounts exist for seamless testing
  async function ensureInitialSeedData() {
    try {
      let users = getUsers();
      let modified = false;

      // 1. Admin Account: Tinesh Karthik (@tineshkarthik@00001)
      let admin = users.find(u => u.email.toLowerCase() === ADMIN_EMAIL);
      if (!admin) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('admin123', salt);
        admin = {
          id: 'admin-tinesh-karthik',
          username: 'tineshkarthik@00001',
          name: 'Tinesh Karthik',
          email: ADMIN_EMAIL,
          passwordHash,
          isVerified: true,
          isAdmin: true,
          course: 'B.Tech',
          year: '3rd Year',
          branch: 'Computer Science & Engineering',
          college: 'Undergraduate College',
          tagline: 'Platform Administrator & Full-Stack Developer',
          bio: 'Welcome to the All UG Campus Portfolio platform! I am Tinesh Karthik, the platform creator and administrator.',
          avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=TineshKarthik',
          whatILearned: [
            'Enterprise Full-Stack Cloud Architecture & Container Deployment',
            'Web Application Firewall (WAF) & Financial-Grade Cybersecurity',
            'Distributed Systems, High Concurrency & Node.js Optimization'
          ],
          skills: ['JavaScript', 'Node.js', 'Express', 'Cybersecurity', 'Cloud Architecture', 'HTML/CSS'],
          projects: [],
          socials: {
            github: '',
            linkedin: '',
            email: ADMIN_EMAIL
          },
          createdAt: new Date().toISOString()
        };
        users.unshift(admin);
        modified = true;
        console.log(`👑 [ADMIN SEED] Initialized default Admin account for ${ADMIN_EMAIL} (@${admin.username})`);
      } else if (admin.username !== 'tineshkarthik@00001') {
        admin.username = 'tineshkarthik@00001';
        modified = true;
        console.log(`👑 [ADMIN UPDATE] Updated Admin username to @${admin.username}`);
      }

      // 2. Demo Student Accounts (including 'Joy' accounts for immediate search engine testing)
      if (users.length <= 1) {
        const salt = await bcrypt.genSalt(10);
        const defaultHash = await bcrypt.hash('Student@123', salt);

        const sampleStudents = [
          {
            id: 'student-joy-sharma',
            username: 'joysharma@48192',
            name: 'Joy Sharma',
            email: 'joysharma@campus.edu',
            passwordHash: defaultHash,
            isVerified: true,
            isAdmin: false,
            course: 'BCA',
            year: '2nd Year',
            branch: 'Computer Applications',
            college: 'Campus School of Computing',
            tagline: 'Aspiring Full-Stack & UI/UX Developer crafting fluid web experiences.',
            bio: '2nd-year BCA student passionate about front-end design systems, responsive interfaces, and modern JavaScript frameworks.',
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
            whatILearned: [
              'Modern UI/UX Design with Figma and Tailwind CSS',
              'Single Page Applications with React & State Management',
              'RESTful API Integration and Web Performance'
            ],
            skills: ['React', 'JavaScript', 'UI/UX Design', 'Tailwind CSS', 'Figma', 'Git'],
            projects: [
              {
                title: 'Campus Course Dashboard & Notes Hub',
                category: 'Web Development',
                description: 'Interactive dashboard allowing BCA students to access semester notes, video lectures, and live code examples.',
                googleDocsUrl: 'https://docs.google.com',
                githubUrl: 'https://github.com',
                liveUrl: 'https://tinesh.in'
              }
            ],
            socials: { github: 'https://github.com', linkedin: 'https://linkedin.com', email: 'joysharma@campus.edu' },
            createdAt: new Date().toISOString()
          },
          {
            id: 'student-joy-patel',
            username: 'joypatel@59201',
            name: 'Joy Patel',
            email: 'joypatel@campus.edu',
            passwordHash: defaultHash,
            isVerified: true,
            isAdmin: false,
            course: 'B.Sc',
            year: '1st Year',
            branch: 'Computer Science',
            college: 'Faculty of Science & Computing',
            tagline: 'Data Science Enthusiast & Python Developer exploring Machine Learning.',
            bio: '1st-year B.Sc Computer Science student focused on exploratory data analysis, statistics, and machine learning models in Python.',
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
            whatILearned: [
              'Python for Data Science (NumPy, Pandas, Matplotlib)',
              'Statistical Inference & Probability Modeling',
              'Relational Database Modeling with MySQL'
            ],
            skills: ['Python', 'Pandas', 'NumPy', 'SQL', 'Data Science', 'Statistics'],
            projects: [
              {
                title: 'Student Academic Performance Predictor',
                category: 'Data Science',
                description: 'Machine learning model that analyzes quiz scores and attendance patterns to predict end-of-semester GPA with 89% accuracy.',
                googleDocsUrl: 'https://docs.google.com',
                githubUrl: 'https://github.com',
                liveUrl: 'https://tinesh.in'
              }
            ],
            socials: { github: 'https://github.com', linkedin: 'https://linkedin.com', email: 'joypatel@campus.edu' },
            createdAt: new Date().toISOString()
          },
          {
            id: 'student-rahul-joy',
            username: 'rahuljoymukherjee@83921',
            name: 'Rahul Joy Mukherjee',
            email: 'rahuljoy@campus.edu',
            passwordHash: defaultHash,
            isVerified: true,
            isAdmin: false,
            course: 'B.Com',
            year: '2nd Year',
            branch: 'Finance & Banking',
            college: 'College of Commerce & Economics',
            tagline: 'FinTech Explorer & Financial Modeler bridging Finance and Tech.',
            bio: '2nd-year B.Com student specializing in financial analytics, equity research models, and automated corporate valuation dashboards.',
            avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
            whatILearned: [
              'Corporate Financial Modeling & DCF Valuation',
              'Automated Financial Dashboards with PowerBI & Excel',
              'FinTech Protocols & Algorithmic Trading Fundamentals'
            ],
            skills: ['Financial Modeling', 'Excel', 'PowerBI', 'Tableau', 'FinTech', 'Accounting'],
            projects: [
              {
                title: 'Student Micro-Budget & Investment Planner',
                category: 'FinTech',
                description: 'Personal finance web application tailored for college students to track living expenses, split bills, and simulate SIP investments.',
                googleDocsUrl: 'https://docs.google.com',
                githubUrl: 'https://github.com',
                liveUrl: 'https://tinesh.in'
              }
            ],
            socials: { github: '', linkedin: 'https://linkedin.com', email: 'rahuljoy@campus.edu' },
            createdAt: new Date().toISOString()
          },
          {
            id: 'student-priya-verma',
            username: 'priyaverma@71024',
            name: 'Priya Verma',
            email: 'priyaverma@campus.edu',
            passwordHash: defaultHash,
            isVerified: true,
            isAdmin: false,
            course: 'B.Tech',
            year: '3rd Year',
            branch: 'Information Technology',
            college: 'Institute of Technology',
            tagline: 'Cloud Architecture & DevOps Engineer building resilient distributed systems.',
            bio: '3rd-year B.Tech IT student specializing in container orchestration, continuous delivery pipelines, and cloud security.',
            avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80',
            whatILearned: [
              'Container Orchestration with Docker & Kubernetes',
              'CI/CD Pipeline Automation with GitHub Actions',
              'Cloud Security & Infrastructure as Code (Terraform)'
            ],
            skills: ['Docker', 'Kubernetes', 'AWS', 'Node.js', 'Terraform', 'CI/CD'],
            projects: [
              {
                title: 'Distributed Cloud Health Monitoring Platform',
                category: 'DevOps & Cloud',
                description: 'Real-time telemetry and alerting service monitoring microservices across multiple cloud clusters with automated failover.',
                googleDocsUrl: 'https://docs.google.com',
                githubUrl: 'https://github.com',
                liveUrl: 'https://tinesh.in'
              }
            ],
            socials: { github: 'https://github.com', linkedin: 'https://linkedin.com', email: 'priyaverma@campus.edu' },
            createdAt: new Date().toISOString()
          },
          {
            id: 'student-ananya-iyer',
            username: 'ananyaiyer@12894',
            name: 'Ananya Iyer',
            email: 'ananyaiyer@campus.edu',
            passwordHash: defaultHash,
            isVerified: true,
            isAdmin: false,
            course: 'BBA',
            year: '1st Year',
            branch: 'Business Analytics & Marketing',
            college: 'School of Management & Business',
            tagline: 'Product Strategist & Growth Marketer driving student startup initiatives.',
            bio: '1st-year BBA student interested in product management, user research, data-driven brand strategies, and go-to-market execution.',
            avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80',
            whatILearned: [
              'Consumer Behavior & User Research Methodologies',
              'Digital Marketing, SEO & Funnel Optimization',
              'Agile Product Management & Wireframing'
            ],
            skills: ['Product Strategy', 'Digital Marketing', 'Market Research', 'Analytics', 'Agile'],
            projects: [
              {
                title: 'Campus Startup Growth & Launch Blueprint',
                category: 'Product Strategy',
                description: 'Comprehensive go-to-market guide and acquisition funnel developed for student-founded ventures on campus.',
                googleDocsUrl: 'https://docs.google.com',
                githubUrl: '',
                liveUrl: 'https://tinesh.in'
              }
            ],
            socials: { github: '', linkedin: 'https://linkedin.com', email: 'ananyaiyer@campus.edu' },
            createdAt: new Date().toISOString()
          }
        ];

        users.push(...sampleStudents);
        modified = true;
        console.log(`🎓 [STUDENT SEED] Initialized ${sampleStudents.length} verified demo student accounts across B.Tech, BCA, B.Sc, B.Com, BBA.`);
      }

      if (modified) {
        saveUsers(users);
      }
    } catch (err) {
      console.error('Failed to initialize seed data:', err);
    }
  }

  ensureInitialSeedData();

  // =======================================================================
  // 4. MULTI-PROVIDER RESILIENT EMAIL DELIVERY (Port 587 Primary + Port 465 + HTTPS)
  // =======================================================================
  // Primary SMTP: Port 587 (STARTTLS - standard submission)
  const transporter587 = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS
    auth: { user: emailUser, pass: emailPass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    greetingTimeout: 8000,
    socketTimeout: 12000
  });

  // Fallback SMTP: Port 465 (Direct SSL)
  const transporter465 = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: emailUser, pass: emailPass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    greetingTimeout: 8000,
    socketTimeout: 12000
  });

  async function sendEmailOtp(toEmail, studentName, otpCode, purpose = 'verification') {
    const isForgot = purpose === 'forgot_password';
    const subject = isForgot
      ? `Password Reset Code: ${otpCode} - UG Campus Portfolio`
      : `Your Verification Code: ${otpCode} - UG Campus Portfolio`;

    const heading = isForgot ? 'Reset Your Password' : 'Verify Your Student Account';
    const description = isForgot
      ? `Hello <strong>${studentName || 'Student'}</strong>, use the 6-digit code below to create a new password:`
      : `Hello <strong>${studentName || 'Student'}</strong>, use the 6-digit verification code below to activate your student portfolio:`;

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; background-color: #0b0f19; color: #f9fafb; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #6366f1; margin: 0; font-size: 24px; font-weight: 800;">UG Campus Portfolio</h2>
          <p style="color: #9ca3af; font-size: 13px; margin-top: 4px;">Undergraduate Student Showcase (tinesh.in)</p>
        </div>
        <div style="background-color: #111827; padding: 24px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); text-align: center;">
          <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #ffffff;">${heading}</h3>
          <p style="color: #9ca3af; font-size: 14px; margin: 0 0 20px 0;">${description}</p>
          <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #6366f1; background: rgba(99, 102, 241, 0.12); padding: 14px 20px; border-radius: 10px; display: inline-block; font-family: monospace; border: 1px solid rgba(99, 102, 241, 0.3);">
            ${otpCode}
          </div>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">This code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
        </div>
        <div style="text-align: center; margin-top: 24px; font-size: 11px; color: #6b7280;">
          Sent securely from <a href="mailto:${emailUser}" style="color: #6366f1; text-decoration: none;">${emailUser}</a>
        </div>
      </div>
    `;

    console.log(`\n========================================================`);
    console.log(`🔑 [VERIFICATION OTP FOR ${toEmail}]: [ ${otpCode} ]`);
    console.log(`========================================================\n`);

    return dispatchEmail({
      to: toEmail,
      subject,
      html: emailHtml
    });
  }

  // Centralized Multi-Provider Resilient Email Dispatcher (Port 443 HTTPS -> Port 587 STARTTLS -> Port 465 SSL)
  async function dispatchEmail({ to, subject, html }) {
    // METHOD A: RESEND HTTPS API (Port 443 - Never blocked on Render / Cloud)
    if (process.env.RESEND_API_KEY) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM || 'UG Campus Portfolio <onboarding@resend.dev>',
            to: [to],
            subject: subject,
            html: html
          })
        });
        const data = await res.json();
        if (res.ok && data.id) {
          console.log(`[RESEND HTTPS DISPATCHED] To: ${to} [Message ID: ${data.id}]`);
          return { success: true, provider: 'resend', messageId: data.id };
        }
        console.warn('[RESEND NOTICE] Resend returned error:', data);
      } catch (err) {
        console.warn(`[RESEND NOTICE] Resend HTTPS delivery error: ${err.message}`);
      }
    }

    // METHOD B: BREVO HTTPS API (Port 443 - 300 free emails/day, never blocked)
    if (process.env.BREVO_API_KEY) {
      try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: 'UG Campus Portfolio', email: emailUser },
            to: [{ email: to, name: 'Recipient' }],
            subject: subject,
            htmlContent: html
          })
        });
        const data = await res.json();
        if (res.ok && data.messageId) {
          console.log(`[BREVO HTTPS DISPATCHED] To: ${to} [Message ID: ${data.messageId}]`);
          return { success: true, provider: 'brevo', messageId: data.messageId };
        }
        console.warn('[BREVO NOTICE] Brevo returned error:', data);
      } catch (err) {
        console.warn(`[BREVO NOTICE] Brevo HTTPS delivery error: ${err.message}`);
      }
    }

    const mailOptions = {
      from: `"UG Campus Security" <${emailUser}>`,
      to,
      subject,
      html
    };

    // METHOD C: GMAIL SMTP PORT 587 (STARTTLS - Primary standard submission)
    try {
      const info = await transporter587.sendMail(mailOptions);
      console.log(`[EMAIL DISPATCHED via Port 587] To: ${to} [Message ID: ${info.messageId}]`);
      return { success: true, provider: 'gmail_587', messageId: info.messageId };
    } catch (err587) {
      console.warn(`[EMAIL NOTICE] Port 587 failed (${err587.message}). Trying Port 465...`);
    }

    // METHOD D: GMAIL SMTP PORT 465 (Direct SSL - Fallback)
    try {
      const info = await transporter465.sendMail(mailOptions);
      console.log(`[EMAIL DISPATCHED via Port 465] To: ${to} [Message ID: ${info.messageId}]`);
      return { success: true, provider: 'gmail_465', messageId: info.messageId };
    } catch (err465) {
      console.error(`[EMAIL ERROR] Both Port 587 and 465 failed: ${err465.message}`);
      return { success: false, error: err465.message };
    }
  }

  // REAL-TIME ATTACK ALERT EMAIL TO ADMIN (Option A: High-Severity Threats)
  async function sendAttackAlertEmail({ culpritIp, threatType, threatName, url, snippet, score, action, timestamp }) {
    const formattedDate = new Date(timestamp || Date.now()).toLocaleString();
    const alertHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 28px; background-color: #0b0f19; color: #f9fafb; border-radius: 16px; border: 2px solid #ef4444;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 6px 16px; border-radius: 9999px; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid rgba(239, 68, 68, 0.35);">
            🚨 Security Alert &bull; Threat Neutralized
          </div>
          <h2 style="color: #ffffff; margin: 14px 0 6px 0; font-size: 22px; font-weight: 800;">${threatName || 'Cyberattack Detected'}</h2>
          <p style="color: #9ca3af; font-size: 13px; margin: 0;">UG Campus Portfolio Platform (tinesh.in)</p>
        </div>

        <div style="background-color: #111827; padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 20px;">
          <p style="margin: 0 0 14px 0; color: #f87171; font-weight: 600; font-size: 14px;">
            ⚠️ The Web Application Firewall (WAF) detected a high-severity threat and neutralized it immediately.
          </p>
          <table style="width: 100%; font-size: 13px; color: #d1d5db; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #9ca3af; width: 140px;"><strong>Threat Type:</strong></td>
              <td style="padding: 6px 0; font-weight: 700; color: #fca5a5;">${threatName || threatType}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #9ca3af;"><strong>Attacker IP:</strong></td>
              <td style="padding: 6px 0; font-family: monospace; color: #ef4444; font-weight: 700;">${culpritIp || 'Unknown'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #9ca3af;"><strong>Targeted URL:</strong></td>
              <td style="padding: 6px 0; font-family: monospace; color: #93c5fd; word-break: break-all;">${url || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #9ca3af;"><strong>Payload / Snippet:</strong></td>
              <td style="padding: 6px 0; font-family: monospace; color: #fbbf24; word-break: break-all;">${(snippet || 'N/A').substring(0, 150)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #9ca3af;"><strong>Threat Score:</strong></td>
              <td style="padding: 6px 0; color: #fbbf24;">${score || 10} / 30</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #9ca3af;"><strong>Action Taken:</strong></td>
              <td style="padding: 6px 0; font-weight: 700; color: #10b981;">${action || 'Blocked (403)'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #9ca3af;"><strong>Timestamp:</strong></td>
              <td style="padding: 6px 0;">${formattedDate}</td>
            </tr>
          </table>
        </div>

        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); padding: 14px; border-radius: 10px; margin-bottom: 20px; font-size: 13px; color: #a7f3d0;">
          <strong>🛡️ Platform Status: Safe</strong><br>
          Student data and credentials remain fully protected. The attacker acquired 0 data.
        </div>

        <div style="text-align: center; font-size: 12px; color: #9ca3af;">
          Log in as Administrator at <a href="https://tinesh.in/dashboard.html" style="color: #6366f1; text-decoration: none; font-weight: 600;">tinesh.in/dashboard.html</a> to review full telemetry or manage bans.
        </div>
      </div>
    `;

    console.log(`\n🚨 [WAF ATTACK ALERT] Sending incident alert to ${ADMIN_EMAIL} for IP: ${culpritIp} (${threatName})...`);
    return dispatchEmail({
      to: ADMIN_EMAIL,
      subject: `🚨 [SECURITY ALERT] ${threatName || 'Cyberattack Blocked'} from IP ${culpritIp || 'Unknown'}`,
      html: alertHtml
    });
  }

  // Register Real-Time Attack Alert Callback with WAF (Option A)
  waf.setAttackAlertCallback(sendAttackAlertEmail);

  // METHOD C: EMERGENCY SECURITY BREACH ALERT EMAIL (With Incident Telemetry)
  async function sendSecurityBreachAlertEmail({ culpritIp, reason, studentCount, timestamp, lockdownActive = true }) {
    const alertHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px; background-color: #0b0f19; color: #f9fafb; border-radius: 16px; border: 2px solid #ef4444;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="display: inline-block; background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 6px 14px; border-radius: 9999px; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid rgba(239, 68, 68, 0.3);">
            🚨 Security Alert &bull; Critical Incident
          </div>
          <h2 style="color: #ffffff; margin: 14px 0 6px 0; font-size: 22px; font-weight: 800;">Emergency Data Evacuation Triggered</h2>
          <p style="color: #9ca3af; font-size: 13px; margin: 0;">UG Campus Portfolio Platform (tinesh.in)</p>
        </div>

        <div style="background-color: #111827; padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 20px;">
          <p style="margin: 0 0 14px 0; color: #ef4444; font-weight: 600; font-size: 14px;">
            ⚠️ An intruder attempted a high-severity security breach. The WAF has activated the Emergency Circuit Breaker.
          </p>
          <table style="width: 100%; font-size: 13px; color: #d1d5db; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #9ca3af; width: 140px;"><strong>Intruder IP:</strong></td>
              <td style="padding: 6px 0; font-family: monospace; color: #f87171;">${culpritIp || 'Unknown'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #9ca3af;"><strong>Incident Reason:</strong></td>
              <td style="padding: 6px 0;">${reason || 'Security threat threshold exceeded'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #9ca3af;"><strong>Students Protected:</strong></td>
              <td style="padding: 6px 0; font-weight: 700; color: #10b981;">${studentCount || 0} student profiles</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #9ca3af;"><strong>Timestamp:</strong></td>
              <td style="padding: 6px 0;">${new Date(timestamp || Date.now()).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #9ca3af;"><strong>Server Status:</strong></td>
              <td style="padding: 6px 0; color: #fbbf24;">Quarantine Shield Active (HTTP 503)</td>
            </tr>
          </table>
        </div>

        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); padding: 14px; border-radius: 10px; margin-bottom: 20px; font-size: 13px; color: #a7f3d0;">
          <strong>🛡️ Data Protection Status:</strong><br>
          All student records were safely copied to your laptop emergency vault and sanitized on the server. The attacker acquired 0 data.
        </div>

        <div style="text-align: center; font-size: 12px; color: #9ca3af;">
          Log in as Administrator at <a href="https://tinesh.in/dashboard.html" style="color: #6366f1; text-decoration: none;">tinesh.in/dashboard.html</a> to review logs or restore.
        </div>
      </div>
    `;

    console.log(`📧 [ALERT EMAIL DISPATCHED] Emergency breach notification sent to ${ADMIN_EMAIL}`);
    return dispatchEmail({
      to: ADMIN_EMAIL,
      subject: `🚨 [SECURITY BREACH ALERT] Emergency Data Evacuated from IP ${culpritIp || 'Unknown'}`,
      html: alertHtml
    });
  }

  // Register Emergency Alert Callback with Backup Daemon
  backupDaemon.setAlertCallback(sendSecurityBreachAlertEmail);

  function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required. Please sign in.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: 'Session expired. Please sign in again.' });

      // Anti-Session Hijacking Fingerprint Check (PCI-DSS & FAPI)
      if (user.fingerprint && !waf.validateFingerprint(req, user.fingerprint)) {
        console.warn(`🚨 [WAF HIJACK BLOCKED] Stolen/mismatched session token from IP: ${req.ip}`);
        return res.status(403).json({ error: 'Security Exception: Session token used from an unauthorized device or network.' });
      }

      req.user = user;
      next();
    });
  }

  // =======================================================================
  // 5. AUTHENTICATION & LOGIN ENDPOINTS (Supports All UG Courses)
  // =======================================================================

  // Sign Up
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { name, email, password, course, year, branch, college } = req.body;
      if (!name || !email || !password || !course || !year) {
        return res.status(400).json({ error: 'Please provide all required fields' });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if user is trying to register the platform Admin email
      if (normalizedEmail === ADMIN_EMAIL) {
        return res.status(400).json({
          error: 'This email is registered as the platform Administrator. Please switch to "Sign In" and enter your admin password.'
        });
      }

      const users = getUsers();

      const existing = users.find(u => u.email.toLowerCase() === normalizedEmail && u.isVerified);
      if (existing) {
        return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const pendingUser = {
        id: 'student-' + Date.now(),
        name: sanitizeString(name),
        email: normalizedEmail,
        passwordHash,
        course: course || 'B.Tech',
        year,
        branch: branch ? sanitizeString(branch) : 'General',
        college: college ? sanitizeString(college) : 'Undergraduate College',
        isVerified: true
      };

      // Create 6-digit OTP with 10-minute validity via in-memory CAS engine
      const otp = otpEngine.createOtp(normalizedEmail, 'signup', pendingUser, 10 * 60 * 1000);

      const emailResult = await sendEmailOtp(normalizedEmail, name, otp, 'verification');

      if (!emailResult.success) {
        return res.status(500).json({
          error: `Unable to deliver verification email to ${normalizedEmail}. Please check that the email address is correct or try again in a few moments.`
        });
      }

      res.json({
        success: true,
        message: `Verification code sent to ${normalizedEmail}! Please check your email inbox.`
      });
    } catch (err) {
      console.error('[SIGNUP ERROR]', err);
      res.status(500).json({ error: 'Server error during signup: ' + err.message });
    }
  });

  // Verify OTP & Create Account (Atomic CAS & 5-Attempt Burn Protection)
  app.post('/api/auth/verify-otp', async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

      const normalizedEmail = email.toLowerCase().trim();

      // Atomic verification with instant burn upon success or 5th failure
      const verifyResult = otpEngine.verifyOtp(normalizedEmail, String(otp).trim(), 'signup');
      if (!verifyResult.success) {
        return res.status(400).json({
          error: verifyResult.message || 'Incorrect verification code. Please try again.',
          attemptsRemaining: verifyResult.attemptsRemaining
        });
      }

      const pendingUser = verifyResult.pendingUser;
      if (!pendingUser) {
        return res.status(400).json({ error: 'No pending registration details found. Please sign up again.' });
      }

      const users = getUsers();

      // Generate unique username in format: fullname@12345
      const username = generateUniqueUsername(pendingUser.name, users);

      const newUser = {
        id: pendingUser.id,
        username,
        name: pendingUser.name,
        email: pendingUser.email,
        passwordHash: pendingUser.passwordHash,
        isVerified: true,
        course: pendingUser.course,
        year: pendingUser.year,
        branch: pendingUser.branch,
        college: pendingUser.college,
        tagline: `${pendingUser.year} ${pendingUser.course} (${pendingUser.branch}) Student`,
        bio: `Hello! I am a ${pendingUser.year} student pursuing ${pendingUser.course} in ${pendingUser.branch}. Welcome to my portfolio!`,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(pendingUser.name)}`,
        whatILearned: [
          `Core coursework in ${pendingUser.course} (${pendingUser.branch})`,
          'Practical applications and project development'
        ],
        skills: ['Problem Solving', 'Analytical Skills', 'Project Work'],
        projects: [],
        socials: {
          github: '',
          linkedin: '',
          email: pendingUser.email
        },
        createdAt: new Date().toISOString()
      };

      const updatedUsers = users.filter(u => u.email.toLowerCase() !== normalizedEmail);
      updatedUsers.push(newUser);
      saveUsers(updatedUsers);

      const fingerprint = waf.generateFingerprint(req);
      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, name: newUser.name, fingerprint },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      console.log(`[USER REGISTERED] ${newUser.name} (@${newUser.username}) - ${newUser.course} (${newUser.year})`);

      // Stream new registration to Google Sheet (non-blocking)
      streamToGoogleSheet({ event: 'student_registered', student: newUser });

      res.json({
        success: true,
        token,
        user: {
          id: newUser.id,
          username: newUser.username,
          name: newUser.name,
          email: newUser.email,
          course: newUser.course,
          year: newUser.year,
          branch: newUser.branch
        }
      });
    } catch (err) {
      console.error('[VERIFY OTP ERROR]', err);
      res.status(500).json({ error: 'Server error verifying OTP: ' + err.message });
    }
  });

  // Resend OTP
  app.post('/api/auth/resend-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const normalizedEmail = email.toLowerCase().trim();
    const pending = otpEngine.getPending(normalizedEmail);

    if (!pending || !pending.pendingUser) {
      return res.status(400).json({ error: 'No pending registration found for this email. Please sign up again.' });
    }

    const newOtp = otpEngine.createOtp(normalizedEmail, pending.purpose, pending.pendingUser, 10 * 60 * 1000);
    const recipientName = (pending.pendingUser && pending.pendingUser.name) || 'Student';

    const emailResult = await sendEmailOtp(normalizedEmail, recipientName, newOtp, pending.purpose);
    if (!emailResult.success) {
      return res.status(500).json({
        error: `Unable to deliver verification email to ${normalizedEmail}. Please check that the email address is correct or try again in a few moments.`
      });
    }

    res.json({
      success: true,
      message: `A new verification code was sent to ${normalizedEmail}. Please check your email inbox.`
    });
  });

  // Sign In (Protected by Banking WAF: Anti-ATO & Anti-Session Hijacking)
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

      const normalizedEmail = email.toLowerCase().trim();

      // 1. Banking-Grade Anti-Account Takeover (ATO) Lockout Check
      const lockMinutes = waf.isAccountLocked(normalizedEmail);
      if (lockMinutes) {
        return res.status(423).json({
          error: `Account temporarily locked due to excessive failed attempts. Please try again in ${lockMinutes} minute(s).`
        });
      }

      const users = getUsers();
      let user = users.find(u => u.email.toLowerCase() === normalizedEmail);

      // Default Admin Auto-Provision on first login
      if (!user && normalizedEmail === ADMIN_EMAIL && password === 'admin123') {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('admin123', salt);
        user = {
          id: 'admin-tinesh-karthik',
          username: 'tineshkarthik@00001',
          name: 'Tinesh Karthik',
          email: ADMIN_EMAIL,
          passwordHash,
          isVerified: true,
          isAdmin: true,
          course: 'B.Tech',
          year: '3rd Year',
          branch: 'Computer Science & Engineering',
          college: 'Undergraduate College',
          tagline: 'Platform Administrator & Full-Stack Developer',
          bio: 'Welcome to the All UG Campus Portfolio platform! I am Tinesh Karthik, the platform creator and administrator.',
          avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=TineshKarthik',
          whatILearned: [
            'Enterprise Full-Stack Cloud Architecture & Container Deployment',
            'Web Application Firewall (WAF) & Financial-Grade Cybersecurity',
            'Distributed Systems, High Concurrency & Node.js Optimization'
          ],
          skills: ['JavaScript', 'Node.js', 'Express', 'Cybersecurity', 'Cloud Architecture', 'HTML/CSS'],
          projects: [],
          socials: { github: '', linkedin: '', email: ADMIN_EMAIL },
          createdAt: new Date().toISOString()
        };
        users.unshift(user);
        saveUsers(users);
      }

      if (!user) {
        waf.recordLoginFailure(normalizedEmail, req.ip);
        return res.status(400).json({ error: 'No account found with this email' });
      }

      let isMatch = false;
      if (user.passwordHash) {
        isMatch = await bcrypt.compare(password, user.passwordHash).catch(() => false);
      }

      if (!isMatch) {
        waf.recordLoginFailure(normalizedEmail, req.ip);
        return res.status(400).json({ error: 'Invalid password' });
      }

      // 2. Successful Login: Clear ATO Failures & Generate Cryptographic Fingerprint
      waf.clearLoginFailures(normalizedEmail);
      const fingerprint = waf.generateFingerprint(req);

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, fingerprint },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username || user.id,
          name: user.name,
          email: user.email,
          course: user.course || 'B.Tech',
          year: user.year,
          branch: user.branch
        }
      });
    } catch (err) {
      console.error('[LOGIN ERROR]', err);
      res.status(500).json({ error: 'Server error during login' });
    }
  });

  // Forgot Password: Step 1
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Please enter your registered email' });

      const normalizedEmail = email.toLowerCase().trim();
      const users = getUsers();
      const user = users.find(u => u.email.toLowerCase() === normalizedEmail);

      if (!user) {
        return res.status(400).json({ error: 'No account found with this email address.' });
      }

      // Create 6-digit password reset OTP with 10-minute validity via in-memory CAS engine
      const otp = otpEngine.createOtp(normalizedEmail, 'forgot_password', { userId: user.id }, 10 * 60 * 1000);

      const emailResult = await sendEmailOtp(normalizedEmail, user.name, otp, 'forgot_password');
      if (!emailResult.success) {
        return res.status(500).json({
          error: `Unable to deliver password reset email to ${normalizedEmail}. Please check that the email address is correct or try again in a few moments.`
        });
      }

      res.json({
        success: true,
        message: `Password reset code sent to ${normalizedEmail}. Check your email inbox!`
      });
    } catch (err) {
      console.error('[FORGOT PASSWORD ERROR]', err);
      res.status(500).json({ error: 'Server error: ' + err.message });
    }
  });

  // Forgot Password: Step 2 (Atomic CAS & 5-Attempt Burn Protection)
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        return res.status(400).json({ error: 'Email, OTP code, and new password are required' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Atomic verification with instant burn upon success or 5th failure
      const verifyResult = otpEngine.verifyOtp(normalizedEmail, String(otp).trim(), 'forgot_password');
      if (!verifyResult.success) {
        return res.status(400).json({
          error: verifyResult.message || 'Incorrect verification code. Please try again.',
          attemptsRemaining: verifyResult.attemptsRemaining
        });
      }

      const users = getUsers();
      const userIndex = users.findIndex(u => u.email.toLowerCase() === normalizedEmail);
      if (userIndex === -1) {
        return res.status(400).json({ error: 'Account not found.' });
      }

      const salt = await bcrypt.genSalt(10);
      const newPasswordHash = await bcrypt.hash(newPassword, salt);

      // Copy-on-Write update
      const updatedUser = JSON.parse(JSON.stringify(users[userIndex]));
      updatedUser.passwordHash = newPasswordHash;
      const updatedUsers = [...users];
      updatedUsers[userIndex] = updatedUser;
      saveUsers(updatedUsers);

      waf.clearLoginFailures(normalizedEmail);

      console.log(`[PASSWORD RESET SUCCESSFUL] For: ${normalizedEmail}`);
      res.json({ success: true, message: 'Password reset successful! You can now sign in with your new password.' });
    } catch (err) {
      console.error('[RESET PASSWORD ERROR]', err);
      res.status(500).json({ error: 'Server error resetting password: ' + err.message });
    }
  });

  // =======================================================================
  // 6. DASHBOARD & PROFILE ENDPOINTS
  // =======================================================================

  app.get('/api/student/me', authenticateToken, (req, res) => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) return res.status(404).json({ error: 'Student profile not found' });

    const user = users[userIndex];
    if (!user.username) {
      user.username = (user.email.toLowerCase() === ADMIN_EMAIL)
        ? 'tineshkarthik@00001'
        : generateUniqueUsername(user.name, users);
      saveUsers(users);
    }

    const { passwordHash, ...safeUser } = user;
    safeUser.isAdmin = (safeUser.email.toLowerCase() === ADMIN_EMAIL);
    res.json(safeUser);
  });

  app.put('/api/student/profile', authenticateToken, express.json({ limit: '10mb' }), (req, res) => {
    try {
      const users = getUsers();
      const index = users.findIndex(u => u.id === req.user.id);
      if (index === -1) return res.status(404).json({ error: 'Student not found' });

      const current = users[index];
      const cleanBody = sanitizePayload(req.body);
      const {
        name, course, year, branch, college, tagline, bio, avatarUrl, whatILearned, skills, projects, socials
      } = cleanBody;

      // Note: email remains current.email (LOCKED)
      users[index] = {
        ...current,
        name: name || current.name,
        course: course || current.course || 'B.Tech',
        year: year || current.year,
        branch: branch || current.branch,
        college: college || current.college,
        tagline: tagline !== undefined ? tagline : current.tagline,
        bio: bio !== undefined ? bio : current.bio,
        avatarUrl: avatarUrl || current.avatarUrl,
        whatILearned: Array.isArray(whatILearned) ? whatILearned : current.whatILearned,
        skills: Array.isArray(skills) ? skills : current.skills,
        projects: Array.isArray(projects) ? projects : current.projects,
        socials: socials || current.socials,
        updatedAt: new Date().toISOString()
      };

      saveUsers(users);
      if (typeof backupDaemon.queueSnapshot === 'function') {
        backupDaemon.queueSnapshot('student_profile_update');
      } else {
        backupDaemon.createSnapshot('student_profile_update');
      }
      console.log(`[PROFILE UPDATED] ${users[index].name} (${users[index].course} - ${users[index].year})`);

      // Stream profile update to Google Sheet (non-blocking)
      streamToGoogleSheet({ event: 'profile_updated', student: users[index] });

      const { passwordHash, ...safeUser } = users[index];
      safeUser.isAdmin = (safeUser.email.toLowerCase() === ADMIN_EMAIL);
      res.json({ success: true, message: 'Profile updated successfully!', user: safeUser });
    } catch (err) {
      console.error('[UPDATE PROFILE ERROR]', err);
      res.status(500).json({ error: 'Server error updating profile' });
    }
  });

  app.post('/api/student/change-password', authenticateToken, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
      }

      const users = getUsers();
      const index = users.findIndex(u => u.id === req.user.id);
      if (index === -1) return res.status(404).json({ error: 'User not found' });

      let isMatch = false;
      if (users[index].passwordHash) {
        isMatch = await bcrypt.compare(currentPassword, users[index].passwordHash).catch(() => false);
      }

      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      const salt = await bcrypt.genSalt(10);
      users[index].passwordHash = await bcrypt.hash(newPassword, salt);
      saveUsers(users);

      console.log(`[PASSWORD CHANGED] For: ${users[index].email}`);
      res.json({ success: true, message: 'Password changed successfully!' });
    } catch (err) {
      console.error('[CHANGE PASSWORD ERROR]', err);
      res.status(500).json({ error: 'Server error changing password' });
    }
  });

  // =======================================================================
  // 7. ADMIN PANEL
  // =======================================================================

  app.get('/api/admin/all-students', authenticateToken, (req, res) => {
    if (req.user.email.toLowerCase() !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Admin access denied' });
    }

    const users = getUsers();
    const list = users.map(({ passwordHash, ...safe }) => safe);
    res.json(list);
  });

  app.delete('/api/admin/student/:id', authenticateToken, (req, res) => {
    if (req.user.email.toLowerCase() !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Admin access denied' });
    }

    const targetId = req.params.id;
    let users = getUsers();
    const target = users.find(u => u.id === targetId);

    if (!target) return res.status(404).json({ error: 'Account not found' });

    if (target.email.toLowerCase() === ADMIN_EMAIL) {
      return res.status(400).json({ error: 'Cannot delete the platform admin account!' });
    }

    users = users.filter(u => u.id !== targetId);
    saveUsers(users);

    console.log(`[ADMIN DELETED ACCOUNT] ${target.name} (${target.email}) by ${req.user.email}`);
    res.json({ success: true, message: `Account "${target.name}" (${target.email}) was deleted successfully.` });
  });

  // WAF Admin: Live Threat Statistics & Status
  app.get('/api/admin/firewall-stats', authenticateToken, (req, res) => {
    if (req.user.email.toLowerCase() !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Admin access denied' });
    }
    res.json(waf.getFirewallStats());
  });

  // WAF Admin: Live Blocked Attack Incident Logs
  app.get('/api/admin/firewall-logs', authenticateToken, (req, res) => {
    if (req.user.email.toLowerCase() !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Admin access denied' });
    }
    res.json(waf.getRecentLogs());
  });

  // WAF Admin: Release / Unban an IP
  app.post('/api/admin/firewall-unban', authenticateToken, (req, res) => {
    if (req.user.email.toLowerCase() !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Admin access denied' });
    }
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP address is required' });
    const success = waf.unbanIp(ip);
    res.json({ success, message: success ? `IP ${ip} was unbanned.` : `IP ${ip} was not in ban jail.` });
  });

  // WAF Admin: Unlock a Student Account
  app.post('/api/admin/unlock-account', authenticateToken, (req, res) => {
    if (req.user.email.toLowerCase() !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Admin access denied' });
    }
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email address is required' });
    const normalized = email.toLowerCase().trim();
    waf.clearLoginFailures(normalized);
    console.log(`[ADMIN UNLOCKED ACCOUNT] ${normalized} by ${req.user.email}`);
    res.json({ success: true, message: `Account "${normalized}" was successfully unlocked.` });
  });

  // WAF Admin: Manually Ban an IP
  app.post('/api/admin/firewall-ban', authenticateToken, (req, res) => {
    if (req.user.email.toLowerCase() !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Admin access denied' });
    }
    const { ip, reason, hours } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP address is required' });
    waf.banIpManually(ip, reason || 'Manually banned by administrator', hours || 24);
    res.json({ success: true, message: `IP ${ip} was banned for ${hours || 24} hours.` });
  });

  // WAF Admin: Emergency Security Lockdown (Circuit Breaker)
  app.post('/api/admin/emergency-lockdown', authenticateToken, async (req, res) => {
    if (req.user.email.toLowerCase() !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Admin access denied' });
    }
    const { reason } = req.body;
    const lockdownInfo = waf.triggerLockdown(reason || 'Manually engaged by administrator.', true);
    // Take an immediate emergency snapshot before any changes
    backupDaemon.createSnapshot('emergency_lockdown_manual');

    // Send emergency breach alert email to admin with telemetry
    sendSecurityBreachAlertEmail({
      culpritIp: req.ip || 'Admin-Triggered',
      reason: reason || 'Manually engaged by administrator.',
      studentCount: (getUsers() || []).length,
      timestamp: Date.now(),
      lockdownActive: true
    }).catch(e => console.warn('[LOCKDOWN EMAIL NOTICE]', e.message));

    res.json({
      success: true,
      message: '🚨 EMERGENCY LOCKDOWN ENGAGED. All public and student routes are now quarantined.',
      lockdown: lockdownInfo
    });
  });

  // WAF Admin: Lift Emergency Lockdown
  app.post('/api/admin/emergency-unlock', authenticateToken, (req, res) => {
    if (req.user.email.toLowerCase() !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Admin access denied' });
    }
    const result = waf.liftLockdown();
    res.json(result);
  });

  // WAF Admin: Get Lockdown Status
  app.get('/api/admin/lockdown-status', authenticateToken, (req, res) => {
    if (req.user.email.toLowerCase() !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Admin access denied' });
    }
    res.json(waf.getLockdownInfo());
  });

  // WAF Admin: Export Complete Clean Data to Laptop (Supports JWT & X-Admin-Sync-Key)
  app.get('/api/admin/export-data', (req, res, next) => {
    const syncKey = req.headers['x-admin-sync-key'];
    const expectedKey = process.env.ADMIN_SYNC_KEY || 'campus_sync_key_2026_tinesh';

    // Allow instant automated sync if valid sync key header is provided (constant-time verification)
    if (timingSafeSyncKeyVerify(syncKey, expectedKey)) {
      const exportData = backupDaemon.exportCleanData();
      const filename = `campus_portfolio_data_${Date.now()}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.json(exportData);
    }

    // Otherwise require authenticated admin session
    authenticateToken(req, res, () => {
      if (req.user.email.toLowerCase() !== ADMIN_EMAIL) {
        return res.status(403).json({ error: 'Admin access denied' });
      }
      const exportData = backupDaemon.exportCleanData();
      const filename = `campus_portfolio_data_${Date.now()}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(exportData);
    });
  });

  // WAF Admin: Export Incremental Clean Data (WhatsApp style delta sync)
  app.get('/api/admin/export-incremental', (req, res, next) => {
    const syncKey = req.headers['x-admin-sync-key'];
    const expectedKey = process.env.ADMIN_SYNC_KEY || 'campus_sync_key_2026_tinesh';
    const sinceParam = req.query.since || 0;

    const handleExport = () => {
      const deltaData = backupDaemon.exportIncrementalData(sinceParam);
      res.setHeader('Content-Type', 'application/json');
      return res.json(deltaData);
    };

    if (timingSafeSyncKeyVerify(syncKey, expectedKey)) {
      return handleExport();
    }

    // Otherwise require authenticated admin session
    authenticateToken(req, res, () => {
      if (req.user.email.toLowerCase() !== ADMIN_EMAIL) {
        return res.status(403).json({ error: 'Admin access denied' });
      }
      handleExport();
    });
  });

  // WAF Admin: List Encrypted Backup Snapshots
  app.get('/api/admin/backup-list', authenticateToken, (req, res) => {
    if (req.user.email.toLowerCase() !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Admin access denied' });
    }
    res.json(backupDaemon.listSnapshots());
  });

  // WAF Admin: Manually Create Encrypted Snapshot Now
  app.post('/api/admin/create-backup', authenticateToken, (req, res) => {
    if (req.user.email.toLowerCase() !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Admin access denied' });
    }
    const result = backupDaemon.createSnapshot('admin_manual_trigger');
    res.json(result);
  });

  // WAF Admin: Restore Data from Laptop Vault
  app.post('/api/admin/restore-from-vault', authenticateToken, (req, res) => {
    if (req.user.email.toLowerCase() !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Admin access denied' });
    }
    const result = backupDaemon.restoreFromVault();
    if (result.success) {
      waf.liftLockdown();
    }
    res.json(result);
  });

  // WAF Admin: Push & Restore Data from Laptop (Supports X-Admin-Sync-Key & Admin JWT)
  app.post('/api/admin/restore-data', express.json({ limit: '20mb' }), (req, res) => {
    const syncKey = req.headers['x-admin-sync-key'];
    const expectedKey = process.env.ADMIN_SYNC_KEY || 'campus_sync_key_2026_tinesh';

    const handleRestore = () => {
      const incomingUsers = req.body.users || req.body;
      if (!Array.isArray(incomingUsers) || incomingUsers.length === 0) {
        return res.status(400).json({ error: 'Invalid payload: expected non-empty users array.' });
      }

      saveUsers(incomingUsers);
      backupDaemon.createSnapshot('laptop_remote_restore');
      waf.liftLockdown();

      console.log(`✅ [REMOTE RESTORE] Successfully restored ${incomingUsers.length} student records from Laptop.`);
      return res.json({
        success: true,
        message: `Successfully restored ${incomingUsers.length} student records to server!`,
        studentCount: incomingUsers.length,
        timestamp: new Date().toISOString()
      });
    };

    if (timingSafeSyncKeyVerify(syncKey, expectedKey)) {
      return handleRestore();
    }

    authenticateToken(req, res, () => {
      if (req.user.email.toLowerCase() !== ADMIN_EMAIL) {
        return res.status(403).json({ error: 'Admin access denied' });
      }
      handleRestore();
    });
  });

  // WAF Admin: Get Laptop Vault Status
  app.get('/api/admin/vault-status', authenticateToken, (req, res) => {
    if (req.user.email.toLowerCase() !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Admin access denied' });
    }
    res.json(backupDaemon.getVaultStatus());
  });

  // =======================================================================
  // 8. PUBLIC DIRECTORY API (Privacy-Safe: Login emails & internal IDs hidden)
  // =======================================================================

  function sanitizePublicStudent(student) {
    if (!student) return null;
    const {
      passwordHash,
      email, // DO NOT EXPOSE LOGIN EMAIL
      ...safe
    } = student;

    const studentId = student.username || student.id || 'student';

    // Mask or protect contact email in socials if present
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

    return {
      ...safe,
      id: studentId,
      username: studentId,
      socials: publicSocials
    };
  }

  app.get('/api/students', (req, res) => {
    const course = typeof req.query.course === 'string' ? req.query.course.trim() : '';
    const year = typeof req.query.year === 'string' ? req.query.year.trim() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    // Fast Path: Unparameterized public directory served from pre-serialized buffer + ETag (Sub-millisecond)
    if (!course && !year && !search) {
      const { buffer, etag } = atomicCache.getPublicBufferAndETag();
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
      res.set({
        'Content-Type': 'application/json; charset=utf-8',
        'ETag': etag,
        'Cache-Control': 'public, max-age=30, s-maxage=120'
      });
      return res.send(buffer);
    }

    const users = getUsers();
    let filtered = users.filter(u => u.isVerified);

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
        (u.skills || []).some(s => (typeof s === 'string' ? s.toLowerCase() : '').includes(q)) ||
        (u.projects || []).some(p => (p && typeof p.title === 'string' ? p.title.toLowerCase() : '').includes(q))
      );
    }

    res.set('Cache-Control', 'public, max-age=30, s-maxage=120');
    const safeList = filtered.map(sanitizePublicStudent);
    res.json(safeList);
  });

  app.get('/api/students/:id', (req, res) => {
    const student = atomicCache.getUserById(req.params.id);
    if (!student || !student.isVerified) return res.status(404).json({ error: 'Student not found' });

    res.set('Cache-Control', 'public, max-age=30, s-maxage=120');
    res.json(sanitizePublicStudent(student));
  });

  // Dedicated single-student portfolio data endpoint (by slug or id)
  app.get('/api/portfolio/:slug', (req, res) => {
    let slug = (req.params.slug || '').toLowerCase();
    try {
      slug = decodeURIComponent(slug);
    } catch (e) {}

    let student = atomicCache.getUserByUsername(slug) || atomicCache.getUserById(slug);
    if (!student || !student.isVerified) {
      const users = getUsers();
      student = users.find(u => 
        ((u.username && u.username.toLowerCase() === slug) || 
         u.id === req.params.slug ||
         u.id === slug ||
         (slug === 'tinesh-karthik' && u.email.toLowerCase() === ADMIN_EMAIL)) && u.isVerified
      );
    }
    if (!student) return res.status(404).json({ error: 'Student portfolio not found' });

    res.set('Cache-Control', 'public, max-age=30, s-maxage=120');
    res.json(sanitizePublicStudent(student));
  });

  // Dedicated single-student portfolio URL route (e.g. /p/tinesh-karthik)
  app.get('/p/:slug', (req, res) => {
    const portfolioFile = fs.existsSync(path.join(__dirname, 'public', 'portfolio.html'))
      ? path.join(__dirname, 'public', 'portfolio.html')
      : path.join(__dirname, 'portfolio.html');
    res.sendFile(portfolioFile);
  });

  const server = app.listen(PORT, () => {
    console.log(`  -> Worker ${process.pid} listening on port ${PORT}`);
  });

  // Slowloris & Server Overload Protection + Render Cloud Reverse-Proxy Synchronization
  // keepAliveTimeout (65s) MUST strictly exceed Render/Envoy idle proxy timeout (60s)
  server.keepAliveTimeout = 65000;   // 65 seconds (> Render 60s idle timeout)
  server.headersTimeout = 70000;     // 70 seconds (> keepAliveTimeout)
  server.requestTimeout = 30000;     // 30 seconds
  server.maxHeadersCount = 100;

  // Global Process Lifecycle Handlers (Crash-Proof RASP)
  process.on('unhandledRejection', (reason) => {
    console.error('🚨 [CRITICAL] Unhandled Promise Rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    // Prevent non-fatal undici socket idle timeouts from crashing the server
    if (err && (err.message?.includes('socket idle timeout') || err.name === 'InformationalError' || err.code === 'UND_ERR_INFO')) {
      console.warn('⚠️ [SOCKET NOTICE] Suppressed non-fatal idle socket timeout:', err.message);
      return;
    }
    console.error('🚨 [FATAL] Uncaught Exception:', err);
    setTimeout(() => process.exit(1), 1000).unref();
  });

  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received. Initiating graceful shutdown...');
    server.close(() => {
      console.log('✅ HTTP server closed. Process exiting cleanly.');
      process.exit(0);
    });
  });
}
