const { io } = require('socket.io-client');


const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhZWI4YTJkODJkOTk5MDc3MjliMjk1MCIsImVtYWlsIjoiZXNoYW50QG5pdGpzci5hYy5pbiIsImlhdCI6MTc5MzgyODQyOCwiZXhwIjoxNzkzOTE0ODI4fQ.5cLRkja1DUZw5PSE_Qg-hVUmlHZ9MUx9odj1oO5K1Mg';





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