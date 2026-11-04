const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const activeUsers = new Map();

const initializeSocket = (io) => {

    // Authenticate socket connection
    io.use(async (socket, next) => {

        try {

            const token = socket.handshake.auth.token;

            if(!token) {
                return next(new Error('Authentication token required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await User.findById(decoded.id).select('_id name email');

            if(!user) {
                return next(new Error('User not found'));
            }

            socket.user = user;

            next();

        }
        catch(error) {
            next(new Error('Invalid or expired token'));
        }

    });


    // Handle connection
    io.on('connection', async (socket) => {

        const userId = socket.user._id.toString();

        console.log(`${socket.user.name} connected`);

        if(!activeUsers.has(userId)) {

            activeUsers.set(userId, new Set());

            await User.findByIdAndUpdate(userId, {
                isOnline: true
            });

        }

        activeUsers.get(userId).add(socket.id);


        // Handle disconnection
        socket.on('disconnect', async () => {

            console.log(`${socket.user.name} disconnected`);

            const userSockets = activeUsers.get(userId);

            if(userSockets) {

                userSockets.delete(socket.id);

                if(userSockets.size === 0) {

                    activeUsers.delete(userId);

                    await User.findByIdAndUpdate(userId, {
                        isOnline: false
                    });

                }

            }

        });

    });

};

module.exports = initializeSocket;