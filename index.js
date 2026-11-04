const express = require('express');
const dotenv = require('dotenv');

const connectDB = require('./config/db.config');

dotenv.config();

const app = express();

app.use(express.json());

app.get('/home', (req, res) => {
    res.status(200).send('College Chat Backend is running!');
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`Server started on port ${PORT}`);
    });
};

startServer();