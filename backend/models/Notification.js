const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ["INFO", "ALERT", "FRAUD_WARNING", "TRANSACTION"],
        default: "INFO"
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300 // 5-minute TTL for live alerts
    }
});

module.exports = mongoose.model(
    "Notification",
    notificationSchema
);
