
const authController = require('../controllers/auth.controller');

const { authLimiter } = require('../middlewares/rateLimiter');

module.exports = (app) => {

    app.post(
        '/api/v1/auth/signup',
        authLimiter,
        authController.signup
    );

    app.post(
        '/api/v1/auth/signin',
        authLimiter,
        authController.signin
    );

};
