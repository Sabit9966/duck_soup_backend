const express = require('express');
const router = express.Router();
const { getLogs, createLog, clearLogs } = require('../controllers/activityController');
const { protect } = require('../middleware/auth');

router.get('/logs', protect, getLogs);
router.post('/log', protect, createLog);
router.delete('/logs', protect, clearLogs);

module.exports = router;
