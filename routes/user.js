const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, deleteAccount } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.delete('/account', protect, deleteAccount);

module.exports = router;
