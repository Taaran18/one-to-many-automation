'use strict';

const { Router }       = require('express');
const { authenticate } = require('../../middleware/authenticate');
const emailService     = require('./email.service');

const router = Router();
router.use(authenticate);

router.get('/status',                    async (req, res) => res.json(await emailService.getStatus(req.user.id)));
router.post('/connect',                  async (req, res) => res.json(await emailService.connect(req.user.id, req.body)));
router.post('/disconnect',               async (req, res) => res.json(await emailService.disconnect(req.user.id)));
router.post('/send',                     async (req, res) => res.json(await emailService.sendEmail(req.user.id, req.body)));
router.get('/contacts',                  async (req, res) => res.json(await emailService.getEmailContacts(req.user.id)));
router.get('/thread/:lead_id',           async (req, res) => res.json(await emailService.getEmailThread(req.user.id, req.params.lead_id)));
router.post('/compose/:lead_id',         async (req, res) => res.json(await emailService.composeDirect(req.user.id, req.params.lead_id, req.body)));
router.delete('/contact/:lead_id',       async (req, res) => res.json(await emailService.deleteEmailContact(req.user.id, req.params.lead_id)));

module.exports = router;
