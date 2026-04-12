/**
 * Templates routes — HTTP layer only.
 *
 * Static paths (/meta/sync, /meta, /meta/:id/refresh) registered before /:id
 * to prevent Express path shadowing.
 */

'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const templatesService = require('./templates.service');
const metaService = require('./meta.service');

const router = Router();
router.use(authenticate);

// ── Meta template operations (static paths first) ─────────────────────────────

router.post('/meta/sync', async (req, res) => {
  res.json(await metaService.syncTemplates(req.user.id));
});

router.post('/meta', async (req, res) => {
  res.status(201).json(await metaService.createMetaTemplate(req.user.id, req.body));
});

router.post('/meta/:template_id/refresh', async (req, res) => {
  res.json(await metaService.refreshTemplateStatus(req.user.id, parseInt(req.params.template_id, 10)));
});

// ── Email template CRUD ───────────────────────────────────────────────────────

router.post('/email', async (req, res) => {
  res.status(201).json(await templatesService.createEmailTemplate(req.user.id, req.body));
});

// ── QR template CRUD ──────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  res.status(201).json(await templatesService.createTemplate(req.user.id, req.body));
});

router.get('/', async (req, res) => {
  res.json(await templatesService.listTemplates(req.user.id));
});

router.get('/:template_id', async (req, res) => {
  res.json(await templatesService.getTemplate(req.user.id, parseInt(req.params.template_id, 10)));
});

router.put('/:template_id', async (req, res) => {
  res.json(await templatesService.updateTemplate(req.user.id, parseInt(req.params.template_id, 10), req.body));
});

router.delete('/:template_id', async (req, res) => {
  await templatesService.deleteTemplate(req.user.id, parseInt(req.params.template_id, 10));
  res.json({ success: true });
});

module.exports = router;
