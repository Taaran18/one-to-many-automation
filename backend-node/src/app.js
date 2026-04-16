/**
 * Express application factory.
 * Sets up CORS, body parsing, static files, all route handlers, and error handling.
 */

'use strict';

require('express-async-errors'); // Must be required before express

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');

const authRouter      = require('./modules/auth/auth.routes');
const leadsRouter     = require('./modules/leads/leads.routes');
const templatesRouter = require('./modules/templates/templates.routes');
const campaignsRouter = require('./modules/campaigns/campaigns.routes');
const dashboardRouter = require('./modules/dashboard/dashboard.routes');
const whatsappRouter  = require('./modules/whatsapp/whatsapp.routes');
const chatsRouter     = require('./modules/chats/chats.routes');
const emailRouter     = require('./modules/email/email.routes');
const apiKeysRouter   = require('./modules/apikeys/apikeys.routes');
const { upload }      = require('./middleware/upload');
const { authenticate } = require('./middleware/authenticate');
const apiKeySvc       = require('./modules/apikeys/apikeys.service');

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────

app.use(cors({
  origin: config.app.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['*'],
}));

// ── Body parsing ──────────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true })); // for OAuth2 form login

// ── Static files (uploads) ────────────────────────────────────────────────────

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Root health check ─────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'OneToMany Automation API', version: '1.0', runtime: 'Node.js/Express' });
});

// ── Image upload ──────────────────────────────────────────────────────────────

app.post('/upload/image', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'No file uploaded or invalid file type.' });
  res.json({ url: `${config.app.backendUrl}/uploads/${req.file.filename}` });
});

// ── Route registration ────────────────────────────────────────────────────────

app.use('/',          authRouter);      // /register, /login, /auth/:provider/*
app.use('/leads',     leadsRouter);
app.use('/templates', templatesRouter);
app.use('/campaigns', campaignsRouter);
app.use('/dashboard', dashboardRouter);
app.use('/whatsapp',  whatsappRouter);
app.use('/chats',     chatsRouter);
app.use('/email',     emailRouter);
app.use('/api-keys',  authenticate, apiKeysRouter);

// ── Public API (API key auth, no session required) ────────────────────────────

app.post('/v1/send', async (req, res) => {
  const rawKey = (req.headers['x-api-key'] || '').trim();
  if (!rawKey) return res.status(401).json({ detail: 'Missing X-API-Key header' });

  const { phone, message } = req.body;
  if (!phone || !message) return res.status(400).json({ detail: 'phone and message are required' });

  await apiKeySvc.sendViaKey(rawKey, phone, message);
  res.json({ success: true });
});

app.post('/v1/webhook/:token', async (req, res) => {
  const { token } = req.params;
  const { phone, message } = req.body;
  if (!phone || !message) return res.status(400).json({ detail: 'phone and message are required' });

  await apiKeySvc.sendViaWebhook(token, phone, message);
  res.json({ success: true });
});

// ── Global error handler ──────────────────────────────────────────────────────
// Produces FastAPI-compatible JSON: { detail: "..." }

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const detail = err.message || 'Internal server error';
  if (status === 500) console.error('[error]', err);
  res.status(status).json({ detail });
});

module.exports = app;
