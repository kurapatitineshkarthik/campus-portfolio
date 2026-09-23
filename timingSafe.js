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

  const hashA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(b, 'utf8').digest();

  return crypto.timingSafeEqual(hashA, hashB);
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

module.exports = {
  timingSafeEqual,
  timingSafeOtpVerify,
  timingSafeSyncKeyVerify
};
