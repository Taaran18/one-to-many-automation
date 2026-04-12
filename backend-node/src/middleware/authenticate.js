/**
 * Authentication middleware.
 *
 * Extracts the Bearer token from the Authorization header,
 * verifies it with jwt.js, then looks up the User record and attaches
 * it to req.user.
 *
 * Mirrors the logic of Python's dependencies.py::get_current_user().
 */

'use strict';

const { verifyToken } = require('../utils/jwt');
const prisma = require('../db/client');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Could not validate credentials' });
  }

  const token = authHeader.slice(7);
  let payload;

  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ detail: 'Could not validate credentials' });
  }

  const { sub } = payload;
  if (!sub) {
    return res.status(401).json({ detail: 'Could not validate credentials' });
  }

  try {
    // Determine lookup field: email contains '@', phone does not
    const where = sub.includes('@') ? { email: sub } : { phone_no: sub };
    const user = await prisma.user.findUnique({ where });

    if (!user) {
      return res.status(401).json({ detail: 'Could not validate credentials' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate };
