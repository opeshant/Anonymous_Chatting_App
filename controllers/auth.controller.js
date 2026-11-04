const authService = require('../services/auth.service');

const signup = async (req, res) => {

    try {

        const user = await authService.signup(req.body);

        return res.status(201).send({
            message: 'User registered successfully',
            data: {
                name: user.name,
                email: user.email
            }
        });

    }
    catch(error) {

        return res.status(error.statusCode || 500).send({
            message: error.message || 'Internal server error'
        });

    }

};

const signin = async (req, res) => {

    try {

        const result = await authService.signin(req.body);

        return res.status(200).send({
            message: 'Login successful',
            data: {
                name: result.user.name,
                email: result.user.email,
                token: result.token
            }
        });

    }
    catch(error) {

        return res.status(error.statusCode || 500).send({
            message: error.message || 'Internal server error'
        });

    }

};

module.exports = {
    signup,
    signin
};