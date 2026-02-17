const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
        index: true
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    conversationId: {
        type: String,
        required: true,
        index: true
    },
    senderName: {
        type: String,
        required: true
    },
    incomingText: {
        type: String,
        required: true
    },
    receivedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    replyText: {
        type: String,
        default: null
    },
    replyStatus: {
        type: String,
        enum: ['none', 'queued', 'sent', 'failed'],
        default: 'none',
        index: true
    },
    idempotencyKey: {
        type: String,
        required: true,
        index: true
    }
}, {
    timestamps: true
});

// Compound index for efficient querying
messageSchema.index({ accountId: 1, replyStatus: 1 });
messageSchema.index({ clientId: 1, replyStatus: 1 });
// CRITICAL: Make idempotencyKey unique per account to prevent cross-account collisions
messageSchema.index({ accountId: 1, idempotencyKey: 1 }, { unique: true });

module.exports = mongoose.model('Message', messageSchema);

