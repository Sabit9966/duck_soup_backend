const express = require('express');
const router = express.Router();
const { getPendingActions, completeAction } = require('../controllers/actionController');
const { verifyExtensionKey, validateAccountId, verifyAccountOwnership } = require('../middleware/auth');

// CRITICAL: Extension endpoints require accountId validation
// Order: verifyExtensionKey -> validateAccountId -> verifyAccountOwnership -> controller
router.get('/pending', verifyExtensionKey, validateAccountId, verifyAccountOwnership, getPendingActions);
router.post('/:id/complete', verifyExtensionKey, validateAccountId, verifyAccountOwnership, completeAction);

module.exports = router;

