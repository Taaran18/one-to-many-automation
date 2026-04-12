/**
 * Campaigns routes — HTTP layer only.
 */

'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const campaignsService = require('./campaigns.service');

const router = Router();
router.use(authenticate);

router.post('/', async (req, res) => {
  res.status(201).json(await campaignsService.createCampaign(req.user.id, req.body));
});

router.get('/', async (req, res) => {
  res.json(await campaignsService.listCampaigns(req.user.id, req.query.status));
});

router.get('/:campaign_id', async (req, res) => {
  res.json(await campaignsService.getCampaign(req.user.id, parseInt(req.params.campaign_id, 10)));
});

router.put('/:campaign_id', async (req, res) => {
  res.json(await campaignsService.updateCampaign(req.user.id, parseInt(req.params.campaign_id, 10), req.body));
});

router.delete('/:campaign_id', async (req, res) => {
  await campaignsService.deleteCampaign(req.user.id, parseInt(req.params.campaign_id, 10));
  res.json({ success: true });
});

router.post('/:campaign_id/start', async (req, res) => {
  await campaignsService.startCampaign(req.user.id, parseInt(req.params.campaign_id, 10));
  res.json({ success: true, message: 'Campaign started' });
});

router.post('/:campaign_id/rerun', async (req, res) => {
  await campaignsService.rerunCampaign(req.user.id, parseInt(req.params.campaign_id, 10));
  res.json({ success: true, message: 'Campaign rerun started' });
});

router.post('/:campaign_id/stop', async (req, res) => {
  await campaignsService.stopCampaign(req.user.id, parseInt(req.params.campaign_id, 10));
  res.json({ success: true, message: 'Campaign stopped' });
});

router.post('/:campaign_id/duplicate', async (req, res) => {
  res.status(201).json(await campaignsService.duplicateCampaign(req.user.id, parseInt(req.params.campaign_id, 10)));
});

router.get('/:campaign_id/logs', async (req, res) => {
  res.json(await campaignsService.getCampaignLogs(
    req.user.id,
    parseInt(req.params.campaign_id, 10),
    req.query.page,
    req.query.limit
  ));
});

module.exports = router;
