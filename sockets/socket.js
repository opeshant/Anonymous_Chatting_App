
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user.model');
const Chat = require('../models/chat.model');
const Message = require('../models/message.model');


const activeUsers = new Map();
const waitingQueue = [];
const matchedUsers = new Map();


const checkSocketRateLimit = (socket, eventName, limit, windowMs) => {

    if(!socket.data.eventRequests) {
        socket.data.eventRequests = {};
    }

    if(!socket.data.eventRequests[eventName]) {
        socket.data.eventRequests[eventName] = [];
    }

    const currentTime = Date.now();

    // Keep only requests within the time window
    socket.data.eventRequests[eventName] =
        socket.data.eventRequests[eventName].filter(
            time => currentTime - time < windowMs
        );

    const requests = socket.data.eventRequests[eventName];

    if(requests.length >= limit) {

        socket.emit('rate_limit_error', {
            event: eventName,
            message: 'Too many requests. Please slow down.'
        });

        return false;
    }

    requests.push(currentTime);

    return true;
};



const findPartner = async (io, socket, userId) => {
    try {
        if(matchedUsers.has(userId)) {
            return socket.emit('match_error',{message:'You are already chatting with someone'});
        }

        const alreadyWaiting = waitingQueue.some(user=>user.userId===userId);

        if(alreadyWaiting) {
            return socket.emit('match_error',{message:'You are already waiting for a partner'});
        }

        const partnerIndex = waitingQueue.findIndex(user => {
            return user.userId !== userId &&
                activeUsers.has(user.userId) &&
                activeUsers.get(user.userId).has(user.socketId) &&
                !matchedUsers.has(user.userId);
        });

        if(partnerIndex === -1) {
            waitingQueue.push({userId:userId,socketId:socket.id});

            return socket.emit('waiting_for_partner',{
                message:'Waiting for a random partner'
            });
        }

        const partner = waitingQueue.splice(partnerIndex,1)[0];
        const partnerSocket = io.sockets.sockets.get(partner.socketId);

        if(!partnerSocket) {
            waitingQueue.push({userId:userId,socketId:socket.id});

            return socket.emit('waiting_for_partner',{
                message:'Waiting for a random partner'
            });
        }

        const roomId = crypto.randomUUID();

        const chat = await Chat.create({
            participants:[userId,partner.userId]
        });

        const chatId = chat._id.toString();

        socket.join(roomId);
        partnerSocket.join(roomId);

        socket.data.roomId = roomId;
        partnerSocket.data.roomId = roomId;

        socket.data.chatId = chatId;
        partnerSocket.data.chatId = chatId;

        matchedUsers.set(userId,{
            partnerId:partner.userId,
            partnerSocketId:partner.socketId,
            roomId,
            chatId
        });

        matchedUsers.set(partner.userId,{
            partnerId:userId,
            partnerSocketId:socket.id,
            roomId,
            chatId
        });

        socket.emit('match_found',{
            roomId,
            chatId,
            partner:{
                id:partner.userId,
                name:partnerSocket.user.name
            }
        });

        partnerSocket.emit('match_found',{
            roomId,
            chatId,
            partner:{
                id:userId,
                name:socket.user.name
            }
        });

        console.log(`${socket.user.name} matched with ${partnerSocket.user.name}`);

    } catch(error) {
        console.log('Matching error:',error.message);

        socket.emit('match_error',{
            message:'Unable to find a partner. Please try again.'
        });
    }
};

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

    socket.on('typing', () => {
    const match = matchedUsers.get(userId);

    if(!match || !socket.data.roomId ||
       match.roomId !== socket.data.roomId ||
       match.chatId !== socket.data.chatId) {
        return;
    }

    socket.to(match.roomId).emit('partner_typing', {
        message: `${socket.user.name} is typing...`
    });
});

if(!checkSocketRateLimit(socket, 'typing', 5, 5000)) {
    return;
}


socket.on('stop_typing', () => {
    const match = matchedUsers.get(userId);

    if(!match || !socket.data.roomId ||
       match.roomId !== socket.data.roomId ||
       match.chatId !== socket.data.chatId) {
        return;
    }

    socket.to(match.roomId).emit('partner_stop_typing');
});

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

        if(!checkSocketRateLimit(socket, 'send_message', 10, 10000)) {
    return;
}


        // Handle manual chat ending
        socket.on('end_chat', async () => {

            try {

                // Check whether user is matched
                const match = matchedUsers.get(userId);

                if(!match || !socket.data.roomId ||
                   match.roomId !== socket.data.roomId ||
                   match.chatId !== socket.data.chatId) {

                    return socket.emit('chat_end_error', {
                        message: 'You are not currently chatting with anyone'
                    });

                }

                // Update chat in MongoDB
                const updatedChat = await Chat.findOneAndUpdate(
                    {
                        _id: match.chatId,
                        status: 'active'
                    },
                    {
                        status: 'ended',
                        endedAt: new Date()
                    },
                    {
                        new: true
                    }
                );

                if(!updatedChat) {

                    return socket.emit('chat_end_error', {
                        message: 'Chat not found or already ended'
                    });

                }

                // Remove current user from active matches
                matchedUsers.delete(userId);

                // Get partner match
                const partnerMatch = matchedUsers.get(match.partnerId);

                // Remove partner only if it belongs to the same chat
                if(partnerMatch && partnerMatch.chatId === match.chatId) {
                    matchedUsers.delete(match.partnerId);
                }

                // Get partner socket
                const partnerSocket = io.sockets.sockets.get(match.partnerSocketId);

                // Leave current user's room
                socket.leave(match.roomId);

                socket.data.roomId = null;
                socket.data.chatId = null;

                if(partnerSocket &&
                   partnerSocket.data.chatId === match.chatId) {

                    // Make partner leave the room
                    partnerSocket.leave(match.roomId);

                    partnerSocket.data.roomId = null;
                    partnerSocket.data.chatId = null;

                    // Notify partner
                    partnerSocket.emit('chat_ended', {
                        message: 'Your partner ended the chat'
                    });

                }

                // Notify current user
                socket.emit('chat_ended', {
                    message: 'Chat ended successfully'
                });

                console.log(`Chat ended: ${match.chatId}`);

            }
            catch(error) {

                console.log('Chat ending error:', error.message);

                socket.emit('chat_end_error', {
                    message: 'Unable to end chat'
                });

            }

        });


        socket.on('find_partner', async () => {
            await findPartner(io, socket, userId);
        });

        if(!checkSocketRateLimit(socket, 'find_partner', 3, 60000)) {
    return;
}


        socket.on('skip_partner', async () => {
    try {
        const match = matchedUsers.get(userId);

        if(!match || !socket.data.roomId ||
           match.roomId !== socket.data.roomId ||
           match.chatId !== socket.data.chatId) {

            return socket.emit('skip_error',{
                message:'You are not currently chatting with anyone'
            });
        }

        const updatedChat = await Chat.findOneAndUpdate(
            {_id:match.chatId,status:'active'},
            {status:'ended',endedAt:new Date()},
            {new:true}
        );

        if(!updatedChat) {
            return socket.emit('skip_error',{
                message:'Chat not found or already ended'
            });
        }

        matchedUsers.delete(userId);

        const partnerMatch = matchedUsers.get(match.partnerId);

        if(partnerMatch && partnerMatch.chatId === match.chatId) {
            matchedUsers.delete(match.partnerId);
        }

        const partnerSocket = io.sockets.sockets.get(match.partnerSocketId);

        socket.leave(match.roomId);
        socket.data.roomId = null;
        socket.data.chatId = null;

        if(partnerSocket && partnerSocket.data.chatId === match.chatId) {
            partnerSocket.leave(match.roomId);
            partnerSocket.data.roomId = null;
            partnerSocket.data.chatId = null;

            partnerSocket.emit('partner_skipped',{
                message:'Your partner skipped to the next chat'
            });
        }

        console.log(`${socket.user.name} skipped chat ${match.chatId}`);

        await findPartner(io,socket,userId);

    } catch(error) {
        console.log('Skip partner error:',error.message);

        socket.emit('skip_error',{
            message:'Unable to skip partner. Please try again.'
        });
    }
});

if(!checkSocketRateLimit(socket, 'skip_partner', 5, 60000)) {
    return;
}



       

        // Handle disconnection
        socket.on('disconnect', async () => {

            try {

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

                    // Mark chat as ended in MongoDB
                    await Chat.findByIdAndUpdate(match.chatId, {
                        status: 'ended',
                        endedAt: new Date()
                    });

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

            }
            catch(error) {

                console.log('Disconnect error:', error.message);

            }

        });

    });

};

module.exports = initializeSocket;
