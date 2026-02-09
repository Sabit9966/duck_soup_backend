const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    action: {
        type: String,
        enum: ['profileVisit', 'connection', 'message', 'follow'],
        required: true
    },
    details: {
        type: String
    },
    success: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for efficient querying by user and timestamp
activityLogSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
