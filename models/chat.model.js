
const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    participants: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    ],

    status: {
        type: String,
        enum: ['active', 'ended'],
        default: 'active'
    },

    startedAt: {
        type: Date,
        default: Date.now
    },

    endedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
