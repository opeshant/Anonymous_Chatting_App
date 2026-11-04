const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DB_URL);

        console.log('Successfully connected to MongoDB');
    }
    catch(error) {
        console.log('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;