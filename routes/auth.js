const express = require('express');
const router = express.Router();
const { register, login, logout, verifyToken } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/verify', protect, verifyToken);

module.exports = router;
