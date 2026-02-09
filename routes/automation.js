const express = require('express');
const router = express.Router();
const {
    getStats,
    updateStats,
    getSettings,
    updateSettings,
    getStatus,
    updateStatus
} = require('../controllers/automationController');
const { protect } = require('../middleware/auth');

router.get('/stats', protect, getStats);
router.put('/stats', protect, updateStats);
router.get('/settings', protect, getSettings);
router.put('/settings', protect, updateSettings);
router.get('/status', protect, getStatus);
router.put('/status', protect, updateStatus);

module.exports = router;
