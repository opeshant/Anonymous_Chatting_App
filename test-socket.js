const { io } = require('socket.io-client');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhZWI4YTJkODJkOTk5MDc3MjliMjk1MCIsImVtYWlsIjoiZXNoYW50QG5pdGpzci5hYy5pbiIsImlhdCI6MTc5MzgyNTM0MCwiZXhwIjoxNzkzOTExNzQwfQ.mMZ2U_OCwZIxpYv0cc_mDYwnUT5DT5XwTEN2yHMyrUQ';


const socket = io('http://localhost:3000', {
    auth: {
        token: token
    }
});

socket.on('connect', () => {
    console.log('Successfully connected to Socket.IO');
    console.log('Socket ID:', socket.id);
});

socket.on('connect_error', (error) => {
    console.log('Connection error:', error.message);
});

socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
});