
const { io } = require('socket.io-client');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhZWI4YTJkODJkOTk5MDc3MjliMjk1MCIsImVtYWlsIjoiZXNoYW50QG5pdGpzci5hYy5pbiIsImlhdCI6MTc5MzgzMTkwMywiZXhwIjoxNzkzOTE4MzAzfQ.axMt7-BS6d99QVFzcvpNxDwZ7wLq1ub5saRlgZIZXIs';

const shouldSendMessage = process.argv[2] === 'send';
const shouldEndChat = process.argv[2] === 'end';
const shouldSkipPartner = process.argv[2] === 'skip';
const shouldType = process.argv[2] === 'type';
const shouldSpamMessages = process.argv[2] === 'spam';

const socket = io('http://localhost:3000', {
    auth: {
        token: token
    }
});

socket.on('connect', () => {
    console.log('Connected successfully');

    socket.emit('find_partner');
});

socket.on('waiting_for_partner', data => {
    console.log('\nWAITING FOR PARTNER!');
    console.log(data.message);
});

socket.on('match_found', data => {
    console.log('\nPARTNER FOUND!');
    console.log('Room ID:', data.roomId);
    console.log('Chat ID:', data.chatId);
    console.log('Partner:', data.partner);

    if(shouldSendMessage) {
        socket.emit('send_message', {
            message: 'Hey! How are you?'
        });
    }

    if(shouldEndChat) {
        socket.emit('end_chat');
    }

    if(shouldSkipPartner) {
        console.log('\nSKIPPING CURRENT PARTNER...');
        socket.emit('skip_partner');
    }

    // Test typing indicator
    if(shouldType) {
        console.log('\nSENDING TYPING EVENT...');

        socket.emit('typing');

        setTimeout(() => {
            console.log('\nSENDING STOP TYPING EVENT...');

            socket.emit('stop_typing');
        }, 3000);
    }
    
    if(shouldSpamMessages) {
    console.log('\nSENDING 12 MESSAGES...');

    for(let i = 1; i <= 12; i++) {
        socket.emit('send_message', {
            message: `Test spam message ${i}`
        });
    }
}

});

// Receive typing indicator
socket.on('partner_typing', data => {
    console.log('\nTYPING INDICATOR!');
    console.log(data.message);
});

// Receive stop typing indicator
socket.on('partner_stop_typing', () => {
    console.log('\nPARTNER STOPPED TYPING!');
});

socket.on('receive_message', data => {
    console.log('\nNEW MESSAGE RECEIVED!');
    console.log('Sender:', data.senderId);
    console.log('Message:', data.message);
});

socket.on('message_sent', data => {
    console.log('\nMESSAGE SENT SUCCESSFULLY!');
    console.log(data.message);
});

socket.on('message_error', data => {
    console.log('\nMESSAGE ERROR!');
    console.log(data.message);
});

socket.on('partner_disconnected', data => {
    console.log('\nPARTNER DISCONNECTED!');
    console.log(data.message);
});

socket.on('partner_skipped', data => {
    console.log('\nPARTNER SKIPPED!');
    console.log(data.message);
});

socket.on('chat_ended', data => {
    console.log('\nCHAT ENDED!');
    console.log(data.message);
});

socket.on('chat_end_error', data => {
    console.log('\nCHAT END ERROR!');
    console.log(data.message);
});

socket.on('skip_error', data => {
    console.log('\nSKIP ERROR!');
    console.log(data.message);
});

socket.on('match_error', data => {
    console.log('\nMATCH ERROR!');
    console.log(data.message);
});

socket.on('connect_error', error => {
    console.log('\nCONNECTION ERROR!');
    console.log(error.message);
});

socket.on('rate_limit_error', data => {
    console.log('\nSOCKET RATE LIMIT EXCEEDED!');
    console.log('Event:', data.event);
    console.log(data.message);
});