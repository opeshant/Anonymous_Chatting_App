const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

module.exports = (app) => {

    app.get(
        '/api/v1/users/me',
        authMiddleware.isAuthenticated,
        userController.getUserProfile
    );

    app.patch(
        '/api/v1/users/me',
        authMiddleware.isAuthenticated,
        userController.updateUserProfile
    );

};