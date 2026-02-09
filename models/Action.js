const mongoose = require('mongoose');

const actionSchema = new mongoose.Schema({
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['sendMessage', 'refreshSession'],
        required: true,
        index: true
    },
    payload: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending',
        index: true
    },
    attemptCount: {
        type: Number,
        default: 0,
        min: 0
    },
    lastErrorCode: {
        type: String,
        default: null
    },
    lastErrorMessage: {
        type: String,
        default: null
    },
    lockedAt: {
        type: Date,
        default: null,
        index: true
    },
    lockOwner: {
        type: String,
        default: null
    },
    nextRunAt: {
        type: Date,
        default: null,
        index: true
    }
}, {
    timestamps: true
});

// Compound indexes for efficient querying
actionSchema.index({ accountId: 1, status: 1, nextRunAt: 1 });
actionSchema.index({ status: 1, lockedAt: 1 });

module.exports = mongoose.model('Action', actionSchema);

