const ActivityLog = require('../models/ActivityLog');

// @desc    Get activity logs
// @route   GET /api/activity/logs
// @access  Private
const getLogs = async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;

        const logs = await ActivityLog.find({ userId: req.user._id })
            .sort({ timestamp: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await ActivityLog.countDocuments({ userId: req.user._id });

        res.json({
            success: true,
            data: logs,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Create activity log
// @route   POST /api/activity/log
// @access  Private
const createLog = async (req, res) => {
    try {
        const { action, details, success = true } = req.body;

        if (!action) {
            return res.status(400).json({ success: false, message: 'Action is required' });
        }

        // Validate action against enum
        const validActions = ['profileVisit', 'connection', 'message', 'follow'];
        if (!validActions.includes(action)) {
            return res.status(400).json({ 
                success: false, 
                message: `Invalid action: ${action}. Valid actions are: ${validActions.join(', ')}` 
            });
        }

        const log = await ActivityLog.create({
            userId: req.user._id,
            action,
            details,
            success
        });

        res.status(201).json({ success: true, data: log });
    } catch (error) {
        console.error(error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                success: false, 
                message: errors[0] || 'Validation failed',
                errors: errors
            });
        }
        
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Clear activity logs
// @route   DELETE /api/activity/logs
// @access  Private
const clearLogs = async (req, res) => {
    try {
        await ActivityLog.deleteMany({ userId: req.user._id });
        res.json({ success: true, message: 'Activity logs cleared' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    getLogs,
    createLog,
    clearLogs
};
