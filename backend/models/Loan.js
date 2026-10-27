const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema({

    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer"
    },

    loanType: String,

    amount: Number,

    status: {
        type: String,
        default: "Pending"
    },

    createdAt: {
        type: Date,
        default: Date.now,
        expires: 31536000
    }

});

module.exports = mongoose.model(
    "Loan",
    loanSchema
);
