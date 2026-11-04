const { io } = require('socket.io-client');


const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhZWI5ZDNkOTIzYWE4M2FmYThmZTc1ZSIsImVtYWlsIjoiYXl1c2hAbml0anNyLmFjLmluIiwiaWF0IjoxNzkzODI4OTk3LCJleHAiOjE3OTM5MTUzOTd9.XTxWiLR4y2MxGCVf6d8NzsnbwjWzAiBeHIBvQqUD_U4';





const shouldSendMessage = process.argv[2] === 'send';

const socket = io('http://localhost:3000', {
    auth: {
        token: token
    }
});

socket.on('connect', () => {

    console.log('Connected successfully');

    socket.emit('find_partner');

});

socket.on('waiting_for_partner', (data) => {

    console.log(data.message);

});

socket.on('match_found', (data) => {

    console.log('PARTNER FOUND!');
    console.log('Room ID:', data.roomId);
    console.log('Partner:', data.partner);

    if(shouldSendMessage) {

        socket.emit('send_message', {
            message: 'Hey! How are you?'
        });

    }

});

socket.on('receive_message', (data) => {

    console.log('\nNEW MESSAGE RECEIVED!');
    console.log('Sender:', data.senderId);
    console.log('Message:', data.message);

});

socket.on('message_sent', (data) => {

    console.log('\nMESSAGE SENT SUCCESSFULLY!');
    console.log(data.message);

});

socket.on('message_error', (data) => {

    console.log('Message error:', data.message);

});

socket.on('partner_disconnected', (data) => {

    console.log(data.message);

});

socket.on('connect_error', (error) => {

    console.log('Connection error:', error.message);

});