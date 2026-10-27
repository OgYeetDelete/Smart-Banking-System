const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema({

    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer"
    },

    accountNumber: {
        type: String,
        unique: true,
        index: true
    },

    accountType: String,

    balance: {
        type: Number,
        default: 0
    }

});

module.exports = mongoose.model("Account", accountSchema);
