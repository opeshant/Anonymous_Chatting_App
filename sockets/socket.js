const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user.model');

const activeUsers = new Map();
const waitingQueue = [];
const matchedUsers = new Map();

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


        // Find random partner
        socket.on('find_partner', () => {

            // Check if already chatting
            if(matchedUsers.has(userId)) {

                return socket.emit('match_error', {
                    message: 'You are already chatting with someone'
                });

            }

            // Check if already waiting
            const alreadyWaiting = waitingQueue.some(
                user => user.userId === userId
            );

            if(alreadyWaiting) {

                return socket.emit('match_error', {
                    message: 'You are already waiting for a partner'
                });

            }

            // Find another available user
            const partnerIndex = waitingQueue.findIndex(user => {

                return user.userId !== userId &&
                    activeUsers.has(user.userId) &&
                    activeUsers.get(user.userId).has(user.socketId) &&
                    !matchedUsers.has(user.userId);

            });


            // No partner available
            if(partnerIndex === -1) {

                waitingQueue.push({
                    userId: userId,
                    socketId: socket.id
                });

                return socket.emit('waiting_for_partner', {
                    message: 'Waiting for a random partner'
                });

            }


            // Get partner from queue
            const partner = waitingQueue.splice(partnerIndex, 1)[0];

            const partnerSocket = io.sockets.sockets.get(partner.socketId);

            if(!partnerSocket) {

                waitingQueue.push({
                    userId: userId,
                    socketId: socket.id
                });

                return socket.emit('waiting_for_partner', {
                    message: 'Waiting for a random partner'
                });

            }


            // Create private room
            const roomId = crypto.randomUUID();

            socket.join(roomId);
            partnerSocket.join(roomId);


            // Store matching information
            matchedUsers.set(userId, {
                partnerId: partner.userId,
                partnerSocketId: partner.socketId,
                roomId: roomId
            });

            matchedUsers.set(partner.userId, {
                partnerId: userId,
                partnerSocketId: socket.id,
                roomId: roomId
            });


            // Notify both users
            socket.emit('match_found', {
                roomId: roomId,
                partner: {
                    id: partner.userId,
                    name: partnerSocket.user.name
                }
            });

            partnerSocket.emit('match_found', {
                roomId: roomId,
                partner: {
                    id: userId,
                    name: socket.user.name
                }
            });

            console.log(`${socket.user.name} matched with ${partnerSocket.user.name}`);

        });


        // Handle disconnection
        socket.on('disconnect', async () => {

            console.log(`${socket.user.name} disconnected`);

            // Remove from waiting queue
            const index = waitingQueue.findIndex(
                user => user.socketId === socket.id
            );

            if(index !== -1) {
                waitingQueue.splice(index, 1);
            }


            // Handle active match
            const match = matchedUsers.get(userId);

            if(match && match.partnerSocketId !== socket.id) {

                matchedUsers.delete(userId);

                const partnerSocket = io.sockets.sockets.get(match.partnerSocketId);

                matchedUsers.delete(match.partnerId);

                if(partnerSocket) {

                    partnerSocket.leave(match.roomId);
                    partnerSocket.data.roomId = null;
                    partnerSocket.emit('partner_disconnected', {
                        message: 'Your partner disconnected'
                    });

                }

            }


            // Remove socket from active users
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