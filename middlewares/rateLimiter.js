
const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Maximum 100 requests
    standardHeaders: 'draft-8',
    legacyHeaders: false,

    message: {
        success: false,
        message: 'Too many requests. Please try again after 15 minutes.'
    }
});

// Authentication rate limiter
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5, // Maximum 5 requests
    standardHeaders: 'draft-8',
    legacyHeaders: false,

    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again after 15 minutes.'
    }
});

module.exports = {
    apiLimiter,
    authLimiter
};
