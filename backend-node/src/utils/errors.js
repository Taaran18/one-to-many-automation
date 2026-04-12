/**
 * Application error utilities.
 *
 * All business-rule and HTTP errors throughout the codebase are created
 * with `httpError()` so the global error handler in app.js can produce
 * a consistent { detail: "..." } JSON response (matching the FastAPI shape
 * the frontend already expects).
 *
 * Usage:
 *   throw httpError(404, 'Lead not found');
 *   throw httpError(400, 'Email already registered');
 */

'use strict';

class AppError extends Error {
  /**
   * @param {number} statusCode  HTTP status code (400, 401, 403, 404, 503 …)
   * @param {string} message     Human-readable error detail
   */
  constructor(statusCode, message) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    // `status` alias keeps express-async-errors + generic error handlers happy
    this.status = statusCode;
  }
}

/**
 * Create an AppError. Throw the returned value directly.
 *
 * @param {number} statusCode
 * @param {string} message
 * @returns {AppError}
 */
function httpError(statusCode, message) {
  return new AppError(statusCode, message);
}

module.exports = { AppError, httpError };
