const mongoose = require("mongoose");

const beneficiarySchema = new mongoose.Schema({

    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer"
    },

    beneficiaryName: String,

    accountNumber: String

});

module.exports = mongoose.model(
    "Beneficiary",
    beneficiarySchema
);