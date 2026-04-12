/**
 * Auth service — registration and login business logic.
 *
 * No HTTP concerns here. Throws AppError for known failure cases.
 */

'use strict';

const prisma = require('../../db/client');
const { hashPassword, verifyPassword } = require('../../utils/encryption');
const { createToken } = require('../../utils/jwt');
const { httpError } = require('../../utils/errors');

/**
 * Register a new user.
 *
 * @param {{ email?: string, phone_no?: string, password: string }}
 * @returns {{ id, email, phone_no, created_at }}
 */
async function register({ email, phone_no, password, full_name, company_name, company_type, plan }) {
  if (!email && !phone_no) {
    throw httpError(400, 'Must provide email or phone number');
  }
  if (!password) {
    throw httpError(400, 'Password is required');
  }

  if (email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw httpError(400, 'Email already registered');
  }

  if (phone_no) {
    const existing = await prisma.user.findUnique({ where: { phone_no } });
    if (existing) throw httpError(400, 'Phone number already registered');
  }

  const user = await prisma.user.create({
    data: {
      email:        email        || null,
      phone_no:     phone_no     || null,
      password:     hashPassword(password),
      full_name:    full_name    || null,
      company_name: company_name || null,
      company_type: company_type || null,
      plan:         plan         || 'free',
    },
  });

  return { id: user.id, email: user.email, phone_no: user.phone_no, created_at: user.created_at };
}

/**
 * Authenticate a user and return a JWT.
 *
 * @param {{ username: string, password: string }}
 *   `username` may be an email address or a phone number.
 * @returns {{ access_token: string, token_type: 'bearer' }}
 */
async function login({ username, password }) {
  if (!username || !password) {
    throw httpError(400, 'username and password are required');
  }

  const where = username.includes('@') ? { email: username } : { phone_no: username };
  const user = await prisma.user.findUnique({ where });

  if (!user || !verifyPassword(password, user.password)) {
    throw httpError(401, 'Incorrect credentials');
  }

  const sub = user.email || user.phone_no;
  return { access_token: createToken({ sub }), token_type: 'bearer' };
}

/**
 * Return the current user's profile (safe fields only).
 */
async function getProfile(user) {
  return {
    id:           user.id,
    email:        user.email        || null,
    phone_no:     user.phone_no     || null,
    full_name:    user.full_name    || null,
    company_name: user.company_name || null,
    company_type: user.company_type || null,
    plan:         user.plan         || 'free',
    created_at:   user.created_at,
  };
}

/**
 * Fill in only the fields that are currently null.
 * Fields that already have a value cannot be changed.
 */
async function updateProfile(user, body) {
  const { full_name, phone_no, company_name, company_type } = body;
  const data = {};

  if (full_name    && !user.full_name)    data.full_name    = full_name.trim();
  if (phone_no     && !user.phone_no)     data.phone_no     = phone_no.trim();
  if (company_name && !user.company_name) data.company_name = company_name.trim();
  if (company_type && !user.company_type) data.company_type = company_type.trim();

  if (Object.keys(data).length === 0) {
    throw httpError(400, 'No empty fields to update');
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data });
  return getProfile(updated);
}

module.exports = { register, login, getProfile, updateProfile };
