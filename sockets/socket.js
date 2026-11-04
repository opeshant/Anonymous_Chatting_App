
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user.model');
const Chat = require('../models/chat.model');
const Message = require('../models/message.model');


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


        // Handle messages
        socket.on('send_message', async (data) => {

            try {

                const userId = socket.user._id.toString();

                // Check whether user is matched
                const match = matchedUsers.get(userId);

                if(!match || !socket.data.roomId ||
                   match.roomId !== socket.data.roomId ||
                   match.chatId !== socket.data.chatId) {

                    return socket.emit('message_error', {
                        message: 'You are not currently connected to a partner'
                    });

                }

                // Validate message
                if(!data || typeof data.message !== 'string' ||
                   !data.message.trim()) {

                    return socket.emit('message_error', {
                        message: 'Message cannot be empty'
                    });

                }

                const message = data.message.trim();

                if(message.length > 1000) {

                    return socket.emit('message_error', {
                        message: 'Message cannot exceed 1000 characters'
                    });

                }

                // Save message in MongoDB
                const savedMessage = await Message.create({
                    chatId: match.chatId,
                    senderId: userId,
                    message: message
                });

                // Prepare message data
                const messageData = {
                    _id: savedMessage._id,
                    chatId: savedMessage.chatId,
                    senderId: userId,
                    message: savedMessage.message,
                    sentAt: savedMessage.sentAt
                };

                // Send message to partner
                socket.to(match.roomId).emit('receive_message', messageData);

                // Confirm message to sender
                socket.emit('message_sent', messageData);

                console.log(`${socket.user.name}: ${message}`);

            }
            catch(error) {

                console.log('Message error:', error.message);

                socket.emit('message_error', {
                    message: 'Unable to send message'
                });

            }

        });


        // Find random partner
        socket.on('find_partner', async () => {

            try {

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


                // Generate Socket.IO room ID
                const roomId = crypto.randomUUID();


                // Create a permanent chat in MongoDB
                const chat = await Chat.create({
                    participants: [userId, partner.userId]
                });

                const chatId = chat._id.toString();


                // Join both users to the Socket.IO room
                socket.join(roomId);
                partnerSocket.join(roomId);

                socket.data.roomId = roomId;
                partnerSocket.data.roomId = roomId;

                // Store the permanent chat ID
                socket.data.chatId = chatId;
                partnerSocket.data.chatId = chatId;


                // Store matching information
                matchedUsers.set(userId, {
                    partnerId: partner.userId,
                    partnerSocketId: partner.socketId,
                    roomId: roomId,
                    chatId: chatId
                });

                matchedUsers.set(partner.userId, {
                    partnerId: userId,
                    partnerSocketId: socket.id,
                    roomId: roomId,
                    chatId: chatId
                });


                // Notify both users
                socket.emit('match_found', {
                    roomId: roomId,
                    chatId: chatId,
                    partner: {
                        id: partner.userId,
                        name: partnerSocket.user.name
                    }
                });

                partnerSocket.emit('match_found', {
                    roomId: roomId,
                    chatId: chatId,
                    partner: {
                        id: userId,
                        name: socket.user.name
                    }
                });

                console.log(`${socket.user.name} matched with ${partnerSocket.user.name}`);

            }
            catch(error) {

                console.log('Matching error:', error.message);

                socket.emit('match_error', {
                    message: 'Unable to find a partner. Please try again.'
                });

            }

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

            if(match) {

                matchedUsers.delete(userId);

                const partnerSocket = io.sockets.sockets.get(match.partnerSocketId);

                const partnerMatch = matchedUsers.get(match.partnerId);

                if(partnerMatch && partnerMatch.chatId === match.chatId) {
                    matchedUsers.delete(match.partnerId);
                }

                if(partnerSocket) {

                    partnerSocket.leave(match.roomId);
                    partnerSocket.data.roomId = null;
                    partnerSocket.data.chatId = null;

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
