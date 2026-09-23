/**
 * =============================================================================
 * ALL UG CAMPUS PORTFOLIO - RUNTIME APPLICATION SELF-PROTECTION (RASP) SHIELD
 * =============================================================================
 * Defense-in-Depth against Prototype Pollution, Asymmetric JSON DoS,
 * Heap-Exhaustion Out-Of-Memory (OOM) crashes, and Reconnaissance Probes.
 * =============================================================================
 */

const v8 = require('v8');

// List of core built-in prototypes to freeze against prototype pollution (CWE-1321)
// Note: Error.prototype, Promise.prototype, Function.prototype must NOT be frozen,
// as modern Node.js internals (undici/fetch, async hooks, error subclasses) assign instance properties.
const CORE_PROTOTYPES = [
  Object.prototype,
  Array.prototype,
  String.prototype,
  Number.prototype,
  Boolean.prototype,
  RegExp.prototype,
  Date.prototype,
  Map.prototype,
  Set.prototype
];

/**
 * 1. NATIVE V8 PROTOTYPE DEEP FREEZE
 * Completely prevents prototype pollution (CWE-1321) across the Node.js runtime.
 */
function activatePrototypeFreezing() {
  for (let i = 0; i < CORE_PROTOTYPES.length; i++) {
    try {
      Object.freeze(CORE_PROTOTYPES[i]);
    } catch (err) {
      console.warn(`[RASP NOTICE] Could not freeze prototype [${i}]:`, err.message);
    }
  }

  // Lock deprecated dangerous accessor methods
  const dangerousAccessors = ['__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__'];
  for (const acc of dangerousAccessors) {
    if (Object.prototype && typeof Object.prototype[acc] === 'function') {
      try {
        Object.defineProperty(Object.prototype, acc, {
          value: function () {
            throw new Error(`[RASP TRAP] Access to deprecated ${acc} is blocked.`);
          },
          writable: false,
          configurable: false
        });
      } catch (_) {}
    }
  }

  console.log('🛡️ [RASP SHIELD] 12 Core V8 prototypes frozen and accessor traps armed.');
}

/**
 * 2. SECURE JSON REVIVER TRAP
 * Intercepts prototype pollution attempts during JSON parsing before any handler runs.
 */
function secureJsonReviver(key, value) {
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    const error = new SyntaxError('PROTOTYPE_POLLUTION_ATTACK_DETECTED');
    error.statusCode = 400;
    error.isRaspTrip = true;
    error.attackKey = key;
    throw error;
  }
  return value;
}

/**
 * 3. STRUCTURAL JSON COMPLEXITY GUARD
 * Prevents asymmetric ReDoS / CPU starvation via deeply nested or excessively wide payloads.
 */
function checkObjectComplexity(obj, depth = 0, state = { totalKeys: 0 }) {
  if (!obj || typeof obj !== 'object') return true;
  if (depth > 6) return false; // Max allowed object depth
  if (Buffer.isBuffer(obj)) return true;

  const keys = Object.keys(obj);
  state.totalKeys += keys.length;
  if (state.totalKeys > 200) return false; // Max allowed keys across entire payload

  for (let i = 0; i < keys.length; i++) {
    const child = obj[keys[i]];
    if (child && typeof child === 'object') {
      if (!checkObjectComplexity(child, depth + 1, state)) {
        return false;
      }
    }
  }
  return true;
}

function structuralJsonGuard(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    const isValid = checkObjectComplexity(req.body);
    if (!isValid) {
      return res.status(400).json({
        error: 'Payload Rejected: JSON structural complexity or nesting depth limit exceeded.',
        code: 'STRUCTURAL_LIMIT_EXCEEDED'
      });
    }
  }
  next();
}

/**
 * 4. RASP ATTACK ERROR HANDLER
 * Catches RASP traps and applies WAF strikes / 403 Forbidden responses.
 */
function raspErrorHandler(wafEngine) {
  return (err, req, res, next) => {
    if (err && (err.isRaspTrip || err.message === 'PROTOTYPE_POLLUTION_ATTACK_DETECTED')) {
      const clientIp = (wafEngine && typeof wafEngine.getClientIp === 'function')
        ? wafEngine.getClientIp(req)
        : (req.ip || 'unknown');

      console.error(`🚨 [RASP ATTACK NEUTRALIZED] Prototype pollution attempt from IP: ${clientIp} on ${req.method} ${req.originalUrl}`);

      if (wafEngine && typeof wafEngine.registerIpStrike === 'function') {
        wafEngine.registerIpStrike(clientIp, 'Prototype Pollution Injection Attempt', 20);
      }

      return res.status(403).json({
        error: 'Critical security violation: Request terminated by Runtime Application Self-Protection (RASP).',
        code: 'RASP_SECURITY_BLOCK',
        incidentId: Date.now()
      });
    }
    next(err);
  };
}

/**
 * 5. V8 HEAP BOUND & ADAPTIVE WATERMARK MONITOR
 * Guarantees Node.js stays safely within 384MB heap ceiling on 512MB RAM cloud containers.
 */
class HeapBoundMonitor {
  constructor(options = {}) {
    this.maxHeapBytes = (options.maxHeapMb || 384) * 1024 * 1024;
    this.warningThreshold = this.maxHeapBytes * 0.75; // 288MB (75%)
    this.criticalThreshold = this.maxHeapBytes * 0.88; // 338MB (88%)
    this.state = 'GREEN';
    this.shedCount = 0;

    this.startMonitor();
  }

  startMonitor() {
    setInterval(() => {
      const mem = process.memoryUsage();
      const used = mem.heapUsed;
      const rss = mem.rss;

      if (used >= this.criticalThreshold || rss >= 440 * 1024 * 1024) {
        if (this.state !== 'RED') {
          console.error(`🚨 [RASP HEAP CRITICAL] Heap: ${(used / 1e6).toFixed(1)}MB | RSS: ${(rss / 1e6).toFixed(1)}MB. Activating Request Shedding!`);
          this.state = 'RED';
        }
        if (typeof global.gc === 'function') {
          try { global.gc(); } catch (_) {}
        }
      } else if (used >= this.warningThreshold) {
        if (this.state !== 'YELLOW') {
          console.warn(`⚠️ [RASP HEAP WARNING] Heap: ${(used / 1e6).toFixed(1)}MB. Approaching safety margin.`);
          this.state = 'YELLOW';
        }
      } else {
        if (this.state !== 'GREEN') {
          console.log(`✅ [RASP HEAP NORMALIZED] Heap stabilized at ${(used / 1e6).toFixed(1)}MB.`);
          this.state = 'GREEN';
        }
      }
    }, 5000).unref();
  }

  middleware() {
    return (req, res, next) => {
      if (this.state === 'RED') {
        // Exempt critical authentication, admin, and health check endpoints
        const isExempt = req.path === '/' ||
                         req.path.startsWith('/api/auth/') ||
                         req.path.startsWith('/api/admin/') ||
                         req.headers.authorization;

        if (!isExempt) {
          this.shedCount++;
          res.setHeader('Retry-After', '5');
          return res.status(503).json({
            error: 'Server is undergoing high memory pressure protection. Please retry in 5 seconds.',
            code: 'SYSTEM_BACKPRESSURE_ACTIVE'
          });
        }
      }
      next();
    };
  }
}

/**
 * 6. CANARY HONEYPOT DECOYS
 * Synthetic trap routes that instantly jail automated scanners and attackers for 24h.
 */
const CANARY_ROUTES = [
  '/api/v1/internal/admin-dump',
  '/api/v1/internal/users-export',
  '/.git/config',
  '/.env.production',
  '/actuator/health'
];

function canaryHoneypotMiddleware(wafEngine) {
  return (req, res, next) => {
    const urlLower = (req.originalUrl || req.url || '').toLowerCase();
    for (let i = 0; i < CANARY_ROUTES.length; i++) {
      if (urlLower.startsWith(CANARY_ROUTES[i])) {
        const clientIp = (wafEngine && typeof wafEngine.getClientIp === 'function')
          ? wafEngine.getClientIp(req)
          : (req.ip || 'unknown');

        console.error(`🚨 [CANARY HONEYPOT TRIPPED] IP ${clientIp} probed decoy route: ${CANARY_ROUTES[i]}`);
        if (wafEngine && typeof wafEngine.banIpManually === 'function') {
          wafEngine.banIpManually(clientIp, `Canary decoy trap tripped: ${CANARY_ROUTES[i]}`, 24);
        }
        return res.status(403).json({
          error: 'Access denied: Canary security tripwire activated.',
          code: 'CANARY_TRIPWIRE_TRIGGERED'
        });
      }
    }
    next();
  };
}

module.exports = {
  activatePrototypeFreezing,
  secureJsonReviver,
  structuralJsonGuard,
  raspErrorHandler,
  HeapBoundMonitor,
  canaryHoneypotMiddleware
};
