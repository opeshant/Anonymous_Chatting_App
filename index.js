
const express = require('express');
const dotenv = require('dotenv');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

dotenv.config();

const connectDB = require('./config/db.config');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const ChatRoutes = require('./routes/chat.routes');

const { apiLimiter } = require('./middlewares/rateLimiter');

const initializeSocket = require('./sockets/socket');

const app = express();

// Trust Render's reverse proxy
app.set('trust proxy', 1);

// Allow frontend to communicate with backend
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://campusconnect-frontend-black.vercel.app'
    ]
}));

app.use(express.json());

// Apply general API rate limiter
app.use(apiLimiter);

// Register routes
authRoutes(app);
userRoutes(app);
ChatRoutes(app);

app.get('/home', (req, res) => {
    res.status(200).send('College Chat Backend is running!');
});

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: [
            'http://localhost:5173',
            'https://campusconnect-frontend-black.vercel.app'
        ],
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
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
