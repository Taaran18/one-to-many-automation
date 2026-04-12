/**
 * WhatsApp routes — HTTP layer only.
 *
 * GET  /whatsapp/status         QR or Meta connection status
 * POST /whatsapp/connect        Init QR code flow
 * POST /whatsapp/connect/meta   Connect Meta Business API
 * GET  /whatsapp/qr             Get QR code from bridge
 * GET  /whatsapp/info           Connected phone info
 * POST /whatsapp/disconnect     Disconnect WhatsApp
 */

'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const whatsappService = require('./whatsapp.service');

const router = Router();
router.use(authenticate);

router.get('/status',           async (req, res) => res.json(await whatsappService.getStatus(req.user)));
router.post('/connect',         async (req, res) => res.json(await whatsappService.connectQR(req.user)));
router.post('/connect/meta',    async (req, res) => res.json(await whatsappService.connectMeta(req.user, req.body)));
router.get('/qr',               async (req, res) => res.json(await whatsappService.getQR(req.user.id)));
router.get('/info',             async (req, res) => res.json(await whatsappService.getInfo(req.user.id)));
router.post('/disconnect',      async (req, res) => { await whatsappService.disconnect(req.user.id); res.json({ success: true }); });

module.exports = router;
