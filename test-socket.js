const { io } = require('socket.io-client');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhZWI4YTJkODJkOTk5MDc3MjliMjk1MCIsImVtYWlsIjoiZXNoYW50QG5pdGpzci5hYy5pbiIsImlhdCI6MTc5MzgyNjQ5NCwiZXhwIjoxNzkzOTEyODk0fQ.CM7sta5n6i0yBZNv8_wTsVaOtAu8sz629Y_M4uw4-f0';

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

});

socket.on('match_error', (data) => {

    console.log('Matching error:', data.message);

});

socket.on('partner_disconnected', (data) => {

    console.log(data.message);

});

socket.on('connect_error', (error) => {

    console.log('Connection error:', error.message);

});