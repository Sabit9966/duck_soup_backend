const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const clientSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Client name is required'],
        trim: true
    },
    linkedinPhoneNumber: {
        type: String,
        required: false,
        set: function(value) {
            if (!value) return null;
            try {
                return encrypt(value);
            } catch (error) {
                console.error('Error encrypting phone number:', error);
                return null;
            }
        },
        get: function(value) {
            if (!value) return null;
            try {
                return decrypt(value);
            } catch (error) {
                console.error('Error decrypting phone number:', error);
                return null;
            }
        }
    },
    linkedinPassword: {
        type: String,
        required: false,
        set: function(value) {
            if (!value) return null;
            try {
                return encrypt(value);
            } catch (error) {
                console.error('Error encrypting password:', error);
                return null;
            }
        },
        get: function(value) {
            if (!value) return null;
            try {
                return decrypt(value);
            } catch (error) {
                console.error('Error decrypting password:', error);
                return null;
            }
        }
    },
    aiActive: {
        type: Boolean,
        default: false
    },
    aiProvider: {
        type: String,
        enum: ['openai', 'gemini', 'both'],
        default: 'openai'
    },
    persona: {
        type: String,
        default: ''
    },
    documents: [{
        name: String,
        content: String
    }],
    lastMessageCheck: {
        type: Date,
        default: Date.now
    },
    totalReplies: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'paused', 'error'],
        default: 'active'
    }
}, {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
});

// Index for efficient querying
clientSchema.index({ userId: 1, name: 1 });

module.exports = mongoose.model('Client', clientSchema);

