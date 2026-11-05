
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: /^[A-Z0-9._%+-]+@nitjsr\.ac\.in$/i
    },

    password: {
        type: String,
        required: true,
        minlength: 6
    },

    isOnline: {
        type: Boolean,
        default: false
    },

    interests: {
        type: [String],
        default: []
    }

}, {
    timestamps: true
});

// Password hashing middleware
userSchema.pre('save', async function() {
    if (!this.isModified('password')) {
        return;
    }

    this.password = await bcrypt.hash(this.password, 10);
});

// Password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
