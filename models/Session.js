const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token: {
        type: String,
        required: true
    },
    loginTimestamp: {
        type: Date,
        default: Date.now
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // TTL index - automatically delete expired sessions
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Session', sessionSchema);
