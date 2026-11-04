const User = require('../models/user.model');
const jwt = require('jsonwebtoken');

const signup = async (data) => {

    try {

        // Check required fields
        if(!data.name || !data.email || !data.password) {
            throw {
                message: 'All fields are required',
                statusCode: 400
            };
        }

        // Validate college email
        const emailRegex = /^[A-Z0-9._%+-]+@nitjsr\.ac\.in$/i;

        if(!emailRegex.test(data.email.trim())) {
            throw {
                message: 'Please use your college email address',
                statusCode: 400
            };
        }

        // Check existing user
        const existingUser = await User.findOne({
            email: data.email.trim().toLowerCase()
        });

        if(existingUser) {
            throw {
                message: 'User already registered',
                statusCode: 409
            };
        }

        // Create new user
        const user = await User.create({
            name: data.name,
            email: data.email,
            password: data.password
        });

        return user;

    }
    catch(error) {
        throw error;
    }

};

const signin = async (data) => {

    try {

        // Check required fields
        if(!data.email || !data.password) {
            throw {
                message: 'Email and password are required',
                statusCode: 400
            };
        }

        // Find user
        const user = await User.findOne({
            email: data.email.trim().toLowerCase()
        });

        if(!user) {
            throw {
                message: 'Invalid email or password',
                statusCode: 401
            };
        }

        // Compare password
        const isPasswordValid = await user.comparePassword(data.password);

        if(!isPasswordValid) {
            throw {
                message: 'Invalid email or password',
                statusCode: 401
            };
        }

        // Generate JWT
        const token = jwt.sign(
            {
                id: user._id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || '1d'
            }
        );

        return {
            user,
            token
        };

    }
    catch(error) {
        throw error;
    }

};


module.exports = {
    signup,
    signin
};