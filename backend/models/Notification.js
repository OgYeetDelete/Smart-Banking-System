const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({

    message: {
        type: String,
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60
    }

});

module.exports =
    mongoose.model(
        "Notification",
        notificationSchema
    );