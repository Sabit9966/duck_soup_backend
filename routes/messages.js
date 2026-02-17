const express = require('express');
const router = express.Router();
const { checkMessages, generateReply, logReply, handleIncomingMessage, logMonitoringActivity, processPendingMessages } = require('../controllers/messageMonitorController');
const { protect, verifyExtensionKey, validateAccountId, verifyAccountOwnership } = require('../middleware/auth');

router.post('/check', protect, checkMessages);
router.post('/generate-reply', protect, generateReply);
router.post('/log-reply', protect, logReply);
// CRITICAL: Extension endpoint requires accountId validation
router.post('/incoming', verifyExtensionKey, validateAccountId, verifyAccountOwnership, handleIncomingMessage);
router.post('/monitoring-activity', protect, logMonitoringActivity);
router.post('/process-pending', protect, processPendingMessages);

module.exports = router;

