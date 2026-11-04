
const chatController = require('../controllers/chat.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const ChatRoutes = (app) => {

    // Get messages of a particular chat
    app.get(
        '/api/v1/chats/:chatId/messages',
        authMiddleware.isAuthenticated,
        chatController.getChatMessages
    );

};

module.exports = ChatRoutes;
