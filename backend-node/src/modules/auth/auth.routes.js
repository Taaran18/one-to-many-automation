/**
 * Auth routes — HTTP layer only.
 *
 * Each handler: parse request → call service → return JSON.
 * No business logic lives here.
 */

'use strict';

const { Router } = require('express');
const authService = require('./auth.service');
const { authenticate } = require('../../middleware/authenticate');

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

// GET /auth/:provider/login — OAuth stub
router.get('/auth/:provider/login', (req, res) => {
  const { provider } = req.params;
  const message = provider === 'google'
    ? 'Google Login API Keys not configured. Please add GOOGLE_CLIENT_ID to .env.'
    : `${provider} Login API Keys not configured.`;
  res.json({ message });
});

// GET /auth/:provider/callback — OAuth stub
router.get('/auth/:provider/callback', (req, res) => {
  res.json({ message: `${req.params.provider} successful callback! Needs processing logic.` });
});

module.exports = router;
