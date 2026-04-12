/**
 * JWT token utilities — single responsibility: token signing and verification only.
 *
 * Encryption of data at rest lives in utils/encryption.js (separate concern).
 */

'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

const ALGORITHM = 'HS256';

/**
 * Sign a JWT access token.
 *
 * @param {{ sub: string }} payload   `sub` is the user's email or phone number
 * @returns {string}                  Signed JWT string
 */
function createToken(payload) {
  return jwt.sign(
    { sub: payload.sub },
    config.auth.secretKey,
    { algorithm: ALGORITHM, expiresIn: config.auth.tokenExpirySeconds }
  );
}

/**
 * Verify and decode a JWT token.
 *
 * @param {string} token
 * @returns {{ sub: string, iat: number, exp: number }}
 * @throws {jwt.JsonWebTokenError | jwt.TokenExpiredError}
 */
function verifyToken(token) {
  return jwt.verify(token, config.auth.secretKey, { algorithms: [ALGORITHM] });
}

module.exports = { createToken, verifyToken };
