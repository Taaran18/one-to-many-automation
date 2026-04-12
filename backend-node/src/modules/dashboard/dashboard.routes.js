'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const dashboardService = require('./dashboard.service');

const router = Router();
router.use(authenticate);

router.get('/stats',    async (req, res) => res.json(await dashboardService.getStats(req.user.id)));
router.get('/schedule', async (req, res) => res.json(await dashboardService.getSchedule(req.user.id)));
router.get('/chart',    async (req, res) => res.json(await dashboardService.getChart(req.user.id)));

module.exports = router;
