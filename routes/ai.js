const express = require('express');
const router = express.Router();
const { sendMessage, uploadPersona, uploadDocuments, getContext } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.post('/message', protect, sendMessage);
router.post('/persona', protect, uploadPersona);
router.post('/documents', protect, uploadDocuments);
router.get('/context', protect, getContext);

module.exports = router;

