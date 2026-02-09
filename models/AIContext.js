const mongoose = require('mongoose');

const aiContextSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    persona: {
        type: String,
        default: ''
    },
    documents: [{
        name: String,
        content: String
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('AIContext', aiContextSchema);

