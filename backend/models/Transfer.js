const mongoose = require("mongoose");

const transferSchema = new mongoose.Schema({

    fromAccount: {
        type: String,
        required: [true, "Sender account number is required"],
        index: true
    },

    toAccount: {
        type: String,
        required: [true, "Receiver account number is required"],
        index: true
    },

    amount: {
        type: Number,
        required: [true, "Transfer amount is required"],
        min: [1, "Transfer amount must be at least 1"]
    },

    transferredAt: {
        type: Date,
        default: Date.now
    }

});

// Compound Index: Optimizes velocity checks (time window queries) and statement lookups
transferSchema.index({ fromAccount: 1, transferredAt: -1 });

module.exports = mongoose.model(
    "Transfer",
    transferSchema
);
