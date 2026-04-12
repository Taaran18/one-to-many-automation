/**
 * Leads routes — HTTP layer only.
 *
 * IMPORTANT: Express matches routes in registration order.
 * Static paths (/groups/all, /import, /groups/:id/*) must be registered
 * before parameterised paths (/:lead_id) to prevent shadowing.
 */

'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const leadsService = require('./leads.service');
const groupsService = require('./groups.service');

const router = Router();
router.use(authenticate);

// ── Lead groups (static paths first) ────────────────────────────────────────��

router.get('/groups/all', async (req, res) => {
  res.json(await groupsService.listGroups(req.user.id));
});

router.post('/groups', async (req, res) => {
  res.json(await groupsService.createGroup(req.user.id, req.body));
});

router.post('/groups/:group_id/members', async (req, res) => {
  const result = await groupsService.addMembers(
    req.user.id,
    parseInt(req.params.group_id, 10),
    req.body.lead_ids
  );
  res.json(result);
});

router.put('/groups/:group_id', async (req, res) => {
  res.json(await groupsService.updateGroup(req.user.id, parseInt(req.params.group_id, 10), req.body));
});

router.delete('/groups/:group_id/members', async (req, res) => {
  res.json(await groupsService.removeMembers(req.user.id, parseInt(req.params.group_id, 10), req.body.lead_ids));
});

router.delete('/groups/:group_id', async (req, res) => {
  await groupsService.deleteGroup(req.user.id, parseInt(req.params.group_id, 10));
  res.json({ success: true });
});

// ── Bulk import (static path before /:lead_id) ────────────────────────────────

router.post('/import', async (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ detail: 'Body must be an array of leads' });
  }
  res.json(await leadsService.importLeads(req.user.id, req.body));
});

// ── Lead collection ───────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  res.status(201).json(await leadsService.createLead(req.user.id, req.body));
});

router.get('/', async (req, res) => {
  res.json(await leadsService.listLeads(req.user.id, req.query));
});

// ── Individual lead (parameterised paths last) ────────────────────────────────

router.get('/:lead_id/groups', async (req, res) => {
  res.json(await leadsService.getLeadGroups(req.user.id, parseInt(req.params.lead_id, 10)));
});

router.get('/:lead_id', async (req, res) => {
  res.json(await leadsService.getLead(req.user.id, parseInt(req.params.lead_id, 10)));
});

router.put('/:lead_id', async (req, res) => {
  res.json(await leadsService.updateLead(req.user.id, parseInt(req.params.lead_id, 10), req.body));
});

router.delete('/:lead_id', async (req, res) => {
  await leadsService.deleteLead(req.user.id, parseInt(req.params.lead_id, 10));
  res.json({ success: true });
});

module.exports = router;
