/**
 * Fernet symmetric encryption — single responsibility: data encryption only.
 *
 * Wire-compatible with Python's `cryptography.fernet.Fernet`.
 * Used to encrypt/decrypt passwords and Meta API tokens at rest.
 *
 * JWT token handling lives in utils/jwt.js (separate concern).
 *
 * Fernet spec: https://github.com/fernet/spec/blob/master/Spec.md
 *   Key    : 32 bytes URL-safe base64 — bytes 0–15 signing, 16–31 encryption
 *   Token  : version(1) | timestamp(8) | iv(16) | ciphertext(N) | hmac(32) → base64url
 */

'use strict';

const crypto = require('crypto');
const config = require('../config');

// ── Internal base64url helpers ────────────────────────────────────────────────

function _b64Decode(str) {
  // Accept both standard (+/) and URL-safe (-_) base64, with or without padding
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
}

function _b64Encode(buf) {
  // URL-safe base64 with padding — matches Python's urlsafe_b64encode output
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
}

// ── Key derivation ────────────────────────────────────────────────────────────

function _deriveKeys(encryptionKey) {
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY is not set — cannot encrypt/decrypt data');
  }
  const keyBuf = _b64Decode(encryptionKey);
  if (keyBuf.length !== 32) {
    throw new Error(`Fernet key must decode to 32 bytes; got ${keyBuf.length}`);
  }
  return {
    signingKey: keyBuf.slice(0, 16),
    encryptionKey: keyBuf.slice(16, 32),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Encrypt plaintext using the Fernet key from config.
 * Returns a URL-safe base64 token (identical format to Python's Fernet.encrypt).
 *
 * @param {string} plaintext
 * @returns {string}
 */
function encrypt(plaintext) {
  const { signingKey, encryptionKey } = _deriveKeys(config.auth.encryptionKey);

  const version = Buffer.from([0x80]);
  const timestamp = Buffer.alloc(8);
  timestamp.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000)));

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-128-cbc', encryptionKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const payload = Buffer.concat([version, timestamp, iv, ciphertext]);
  const hmac = crypto.createHmac('sha256', signingKey).update(payload).digest();

  return _b64Encode(Buffer.concat([payload, hmac]));
}

/**
 * Decrypt a Fernet token produced by Python or Node.js.
 *
 * @param {string} token  URL-safe base64 Fernet token
 * @returns {string}      Decrypted plaintext
 * @throws {Error}        If the token is invalid, tampered, or the key is wrong
 */
function decrypt(token) {
  const { signingKey, encryptionKey } = _deriveKeys(config.auth.encryptionKey);

  const tokenBuf = _b64Decode(token);

  if (tokenBuf.length < 1 + 8 + 16 + 16 + 32) {
    throw new Error('Fernet token is too short to be valid');
  }
  if (tokenBuf[0] !== 0x80) {
    throw new Error(`Unsupported Fernet version: 0x${tokenBuf[0].toString(16)}`);
  }

  const hmacReceived = tokenBuf.slice(-32);
  const payload = tokenBuf.slice(0, -32);
  const hmacExpected = crypto.createHmac('sha256', signingKey).update(payload).digest();

  if (!crypto.timingSafeEqual(hmacReceived, hmacExpected)) {
    throw new Error('Fernet HMAC verification failed — token is invalid or key mismatch');
  }

  const iv = tokenBuf.slice(9, 25);
  const ciphertext = tokenBuf.slice(25, -32);
  const decipher = crypto.createDecipheriv('aes-128-cbc', encryptionKey, iv);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/**
 * Hash a password for storage (Fernet encrypt — same as Python's get_password_hash).
 * @param {string} password
 * @returns {string}
 */
function hashPassword(password) {
  return encrypt(password);
}

/**
 * Verify a plaintext password against a stored Fernet-encrypted value.
 * @param {string} plain
 * @param {string} encrypted
 * @returns {boolean}
 */
function verifyPassword(plain, encrypted) {
  try {
    return plain === decrypt(encrypted);
  } catch {
    return false;
  }
}

module.exports = { encrypt, decrypt, hashPassword, verifyPassword };
