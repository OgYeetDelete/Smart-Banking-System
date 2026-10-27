const mongoose = require("mongoose");

/**
 * SecurityLog Schema with MongoDB TTL Index
 * Automatically removes temporary audit and login attempt logs after 5 minutes (300 seconds).
 */
const securityLogSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        index: true
    },
    action: {
        type: String,
        enum: ["LOGIN_ATTEMPT", "LOGIN_SUCCESS", "LOGIN_FAILED", "OTP_REQUEST", "OTP_VERIFIED", "UNAUTHORIZED_ACCESS"],
        required: true
    },
    status: {
        type: String,
        enum: ["SUCCESS", "FAILED", "SUSPICIOUS"],
        default: "SUCCESS"
    },
    details: {
        type: String,
        default: ""
    },
    ipAddress: {
        type: String,
        default: "127.0.0.1"
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300 // Auto-purged by MongoDB TTL background task after 5 minutes
    }
});

module.exports = mongoose.model("SecurityLog", securityLogSchema);
