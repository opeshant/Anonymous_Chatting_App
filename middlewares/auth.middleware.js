const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const isAuthenticated = async (req, res, next) => {

    try {

        // Get token from request header
        const token = req.headers.authorization;

        if(!token || !token.startsWith('Bearer ')) {
            return res.status(401).send({
                message: 'Authentication token is required'
            });
        }

        // Extract token
        const accessToken = token.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

        // Find user
        const user = await User.findById(decoded.id);

        if(!user) {
            return res.status(401).send({
                message: 'User does not exist'
            });
        }

        // Attach user to request
        req.user = user;

        next();

    }
    catch(error) {

        return res.status(401).send({
            message: 'Invalid or expired authentication token'
        });

    }

};

module.exports = {
    isAuthenticated
};