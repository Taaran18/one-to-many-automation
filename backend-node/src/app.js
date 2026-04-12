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
const { upload }      = require('./middleware/upload');

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

// ── Global error handler ──────────────────────────────────────────────────────
// Produces FastAPI-compatible JSON: { detail: "..." }

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const detail = err.message || 'Internal server error';
  if (status === 500) console.error('[error]', err);
  res.status(status).json({ detail });
});

module.exports = app;
