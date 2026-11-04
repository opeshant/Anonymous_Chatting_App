
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({

    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        required: true
    },

    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },

    sentAt: {
        type: Date,
        default: Date.now
    }

}, {
    timestamps: true
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
