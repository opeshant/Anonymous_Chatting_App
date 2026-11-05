
const authController = require('../controllers/auth.controller');

module.exports = (app) => {

    app.post(
        '/api/v1/auth/signup',
        authController.signup
    );

    app.post(
        '/api/v1/auth/signin',
        authController.signin
    );

};

