/**
 * =============================================================================
 * ALL UG CAMPUS PORTFOLIO - CRYPTOGRAPHIC CONSTANT-TIME COMPARISON SUITE
 * =============================================================================
 * Prevents remote side-channel timing attacks (CWE-208 / CWE-385) by executing
 * comparisons in guaranteed constant time using OpenSSL's crypto.timingSafeEqual.
 * Pre-hashes inputs with SHA-256 to guarantee identical 32-byte buffer lengths.
 * =============================================================================
 */

const crypto = require('crypto');

/**
 * Compares two strings in guaranteed constant time.
 * Hashing both inputs with SHA-256 ensures identical 32-byte buffer lengths
 * and prevents RangeError length leakage.
 *
 * @param {string} a - User-supplied candidate string
 * @param {string} b - Secret reference string
 * @returns {boolean} - True if identical, false otherwise
 */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  // Double-HMAC with an ephemeral random key guarantees constant-time comparison,
  // prevents length leak, and protects against hash collision side-channels.
  const ephemeralKey = crypto.randomBytes(32);
  const hmacA = crypto.createHmac('sha256', ephemeralKey).update(a, 'utf8').digest();
  const hmacB = crypto.createHmac('sha256', ephemeralKey).update(b, 'utf8').digest();

  return crypto.timingSafeEqual(hmacA, hmacB);
}

/**
 * Validates a 6-digit OTP code in constant time.
 */
function timingSafeOtpVerify(userOtp, actualOtp) {
  if (!userOtp || !actualOtp) return false;
  return timingSafeEqual(String(userOtp).trim(), String(actualOtp).trim());
}

/**
 * Validates an administrative sync key in constant time.
 */
function timingSafeSyncKeyVerify(headerKey, expectedKey) {
  if (!headerKey || !expectedKey) return false;
  return timingSafeEqual(String(headerKey), String(expectedKey));
}

/**
 * Generates an unpredictable 6-digit verification code using hardware CSPRNG.
 * Full 1,000,000 combination range (000000 to 999999) with guaranteed 6-digit padding.
 * (RFC 4086 compliant via OpenSSL crypto.randomInt)
 *
 * @returns {string} - 6-digit numeric OTP string
 */
function generateSecureOtp() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}

module.exports = {
  timingSafeEqual,
  timingSafeOtpVerify,
  timingSafeSyncKeyVerify,
  generateSecureOtp
};

