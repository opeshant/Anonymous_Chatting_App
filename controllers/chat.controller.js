
const chatService = require('../services/chat.service');

const getChatMessages = async (req, res) => {

    try {

        const chatId = req.params.chatId;
        const userId = req.user._id;

        const messages = await chatService.getChatMessages(
            chatId,
            userId
        );

        return res.status(200).send({
            success: true,
            message: 'Chat messages fetched successfully',
            data: messages
        });

    }
    catch(error) {

        return res.status(error.status || 500).send({
            success: false,
            message: error.message || 'Unable to fetch chat messages'
        });

    }

};

module.exports = {
    getChatMessages
};
