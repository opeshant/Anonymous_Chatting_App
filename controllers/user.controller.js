const userService = require('../services/user.service');


// Get profile
const getUserProfile = async (req, res) => {

    try {

        const user = await userService.getUserProfile(req.user._id);

        return res.status(200).send({
            message: 'User profile fetched successfully',
            data: user
        });

    }
    catch(error) {

        return res.status(error.statusCode || 500).send({
            message: error.message || 'Internal server error'
        });

    }

};


// Update profile
const updateUserProfile = async (req, res) => {

    try {

        const user = await userService.updateUserProfile(
            req.user._id,
            req.body
        );

        return res.status(200).send({
            message: 'User profile updated successfully',
            data: user
        });

    }
    catch(error) {

        return res.status(error.statusCode || 500).send({
            message: error.message || 'Internal server error'
        });

    }

};


module.exports = {
    getUserProfile,
    updateUserProfile
};