const express = require('express');
const router = express.Router();
const { getPendingActions, completeAction } = require('../controllers/actionController');
const { verifyExtensionKey } = require('../middleware/auth');

router.get('/pending', verifyExtensionKey, getPendingActions);
router.post('/:id/complete', verifyExtensionKey, completeAction);

module.exports = router;

