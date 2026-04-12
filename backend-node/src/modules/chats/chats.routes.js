/**
 * Chats routes — HTTP layer only.
 *
 * POST /chats/webhook/incoming   Bridge callback — no auth
 * GET  /chats/unread_count
 * GET  /chats/contacts
 * GET  /chats/messages/:phone_no
 * POST /chats/send
 * POST /chats/read/:phone_no
 */

'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const chatsService = require('./chats.service');

const router = Router();

// Webhook has no auth — register before the authenticate middleware
router.post('/webhook/incoming', async (req, res) => {
  res.json(await chatsService.handleIncoming(req.body));
});

router.use(authenticate);

router.get('/unread_count',           async (req, res) => res.json(await chatsService.getUnreadCount(req.user.id)));
router.get('/contacts',               async (req, res) => res.json(await chatsService.getContacts(req.user.id, { archived: req.query.archived === '1' })));
router.get('/messages/:phone_no(*)',  async (req, res) => res.json(await chatsService.getMessages(req.user.id, req.params.phone_no)));
router.post('/send',                  async (req, res) => res.json(await chatsService.sendMessage(req.user.id, req.body)));
router.post('/read/:phone_no(*)',     async (req, res) => res.json(await chatsService.markRead(req.user.id, req.params.phone_no)));
router.delete('/contact/:phone_no(*)',   async (req, res) => res.json(await chatsService.deleteContact(req.user.id, req.params.phone_no)));
router.post('/archive/:phone_no(*)',     async (req, res) => res.json(await chatsService.setArchived(req.user.id, req.params.phone_no, true)));
router.post('/unarchive/:phone_no(*)',   async (req, res) => res.json(await chatsService.setArchived(req.user.id, req.params.phone_no, false)));

module.exports = router;
