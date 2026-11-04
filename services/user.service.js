const User = require('../models/user.model');


// Get logged-in user's profile
const getUserProfile = async (userId) => {

    try {

        const user = await User.findById(userId).select('-password');

        if(!user) {
            throw {
                message: 'User not found',
                statusCode: 404
            };
        }

        return user;

    }
    catch(error) {
        throw error;
    }

};


// Update logged-in user's profile
const updateUserProfile = async (userId, data) => {

    try {

        const updateData = {};

        if(data.name !== undefined) {

            if(typeof data.name !== 'string' || !data.name.trim()) {
                throw {
                    message: 'Name cannot be empty',
                    statusCode: 400
                };
            }

            updateData.name = data.name.trim();

        }

        if(data.interests !== undefined) {

            if(!Array.isArray(data.interests) ||
               !data.interests.every(interest => typeof interest === 'string' && interest.trim())) {

                throw {
                    message: 'Interests must be an array of non-empty strings',
                    statusCode: 400
                };

            }

            updateData.interests = data.interests.map(interest => interest.trim());

        }

        if(Object.keys(updateData).length === 0) {
            throw {
                message: 'No valid fields provided for update',
                statusCode: 400
            };
        }

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            {
                new: true,
                runValidators: true
            }
        ).select('-password');

        if(!user) {
            throw {
                message: 'User not found',
                statusCode: 404
            };
        }

        return user;

    }
    catch(error) {
        throw error;
    }

};


module.exports = {
    getUserProfile,
    updateUserProfile
};