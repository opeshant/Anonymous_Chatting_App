
const Chat = require('../models/chat.model');
const Message = require('../models/message.model');
const mongoose = require('mongoose');

const getChatMessages = async (chatId, userId) => {

    try {

        // Validate chat ID
        if(!mongoose.Types.ObjectId.isValid(chatId)) {
            throw {
                status: 400,
                message: 'Invalid chat ID'
            };
        }

        // Check whether chat exists and user is a participant
        const chat = await Chat.findOne({
            _id: chatId,
            participants: userId
        });

        if(!chat) {
            throw {
                status: 404,
                message: 'Chat not found or access denied'
            };
        }

        // Fetch messages
        const messages = await Message.find({
            chatId: chatId
        }).sort({
            sentAt: 1
        });

        return messages;

    }
    catch(error) {
        throw error;
    }

};

module.exports = {
    getChatMessages
};
