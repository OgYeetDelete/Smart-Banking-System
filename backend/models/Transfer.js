const mongoose = require("mongoose");

const transferSchema = new mongoose.Schema({

    fromAccount: String,

    toAccount: String,

    amount: Number,

    transferredAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model(
    "Transfer",
    transferSchema
);
