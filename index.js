const express = require('express');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

const connectDB = require('./config/db.config');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');

const initializeSocket = require('./sockets/socket');

dotenv.config();

const app = express();

app.use(express.json());

authRoutes(app);
userRoutes(app);

app.get('/home', (req, res) => {
    res.status(200).send('College Chat Backend is running!');
});

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*'
    }
});

initializeSocket(io);

const PORT = process.env.PORT || 3000;

const startServer = async () => {

    await connectDB();

    server.listen(PORT, () => {
        console.log(`Server started on port ${PORT}`);
    });

};

startServer();