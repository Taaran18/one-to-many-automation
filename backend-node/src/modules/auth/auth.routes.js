/**
 * Auth routes — HTTP layer only.
 *
 * Each handler: parse request → call service → return JSON.
 * No business logic lives here.
 */

'use strict';

const { Router }       = require('express');
const { google }       = require('googleapis');
const authService      = require('./auth.service');
const emailService     = require('../email/email.service');
const { authenticate } = require('../../middleware/authenticate');
const { verifyToken }  = require('../../utils/jwt');
const prisma           = require('../../db/client');
const config           = require('../../config');

const router = Router();

// POST /register
router.post('/register', async (req, res) => {
  const result = await authService.register(req.body);
  res.json(result);
});

// POST /login
// Accepts both application/x-www-form-urlencoded (OAuth2 form) and JSON body.
router.post('/login', async (req, res) => {
  const username = req.body.username || req.body.email || req.body.phone_no;
  const result = await authService.login({ username, password: req.body.password });
  res.json(result);
});

// GET /profile — fetch current user's profile
router.get('/profile', authenticate, async (req, res) => {
  const result = await authService.getProfile(req.user);
  res.json(result);
});

// PATCH /profile — fill in empty fields only
router.patch('/profile', authenticate, async (req, res) => {
  const result = await authService.updateProfile(req.user, req.body);
  res.json(result);
});

// GET /auth/google/login — redirect to Google consent screen
router.get('/auth/google/login', (req, res) => {
  const oauth2Client = new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.callbackUrl,
  );
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    prompt: 'select_account',
  });
  res.redirect(url);
});

// GET /auth/google/callback — exchange code for tokens, find/create user, issue JWT
router.get('/auth/google/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`${config.app.frontendUrl}/login?error=google_cancelled`);
  }

  const oauth2Client = new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.callbackUrl,
  );

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2    = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data }  = await oauth2.userinfo.get();

  const { access_token } = await authService.googleCallback({
    googleId: data.id,
    email:    data.email,
    name:     data.name,
    avatar:   data.picture,
  });

  res.redirect(`${config.app.frontendUrl}/auth/callback?token=${access_token}`);
});

// GET /auth/:provider/login — catch-all for unsupported providers
router.get('/auth/:provider/login', (req, res) => {
  res.status(404).json({ message: `${req.params.provider} login is not supported.` });
});

// ── Gmail OAuth for email connection ──────────────────────────────────────────

// GET /email/google/connect?token=<jwt>
router.get('/email/google/connect', async (req, res) => {
  const token = req.query.token;
  if (!token) return res.redirect(`${config.app.frontendUrl}/dashboard?email_error=missing_token`);

  let payload;
  try { payload = verifyToken(token); } catch {
    return res.redirect(`${config.app.frontendUrl}/dashboard?email_error=invalid_token`);
  }

  const where = payload.sub.includes('@') ? { email: payload.sub } : { phone_no: payload.sub };
  const user  = await prisma.user.findUnique({ where });
  if (!user) return res.redirect(`${config.app.frontendUrl}/dashboard?email_error=user_not_found`);

  const state = Buffer.from(String(user.id)).toString('base64url');
  const oauth2Client = new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.emailCallbackUrl,
  );
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://mail.google.com/', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
    state,
    prompt: 'consent',
  });
  res.redirect(url);
});

// GET /email/google/callback
router.get('/email/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error || !code || !state) {
    return res.redirect(`${config.app.frontendUrl}/dashboard?email_error=cancelled`);
  }

  const userId = parseInt(Buffer.from(state, 'base64url').toString('utf8'), 10);
  if (!userId || isNaN(userId)) {
    return res.redirect(`${config.app.frontendUrl}/dashboard?email_error=invalid_state`);
  }

  const oauth2Client = new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.emailCallbackUrl,
  );
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2   = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  await emailService.connectWithGoogle(userId, {
    email:        data.email,
    name:         data.name,
    refreshToken: tokens.refresh_token,
    accessToken:  tokens.access_token,
  });

  res.redirect(`${config.app.frontendUrl}/dashboard?email_connected=google`);
});

module.exports = router;
