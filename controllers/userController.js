const User = require('../models/User');

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json({ success: true, data: user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const { username, email } = req.body;

        const user = await User.findById(req.user._id);

        if (username) user.username = username;
        if (email) user.email = email;

        const updatedUser = await user.save();

        res.json({
            success: true,
            data: {
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Delete user account
// @route   DELETE /api/user/account
// @access  Private
const deleteAccount = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.user._id);
        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    deleteAccount
};
