const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getProfileData,
    getProfileById,
    saveProfileData,
    deleteProfileData,
    deleteAllProfileData,
    getProfileStats
} = require('../controllers/profileDataController');

// All routes require authentication
router.use(protect);

router.route('/')
    .get(getProfileData)
    .post(saveProfileData)
    .delete(deleteAllProfileData);

router.route('/stats')
    .get(getProfileStats);

router.route('/:id')
    .get(getProfileById)
    .delete(deleteProfileData);

module.exports = router;

