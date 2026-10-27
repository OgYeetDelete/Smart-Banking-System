const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
{
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
        required: [true, "Customer ID is required"]
    },

    accountNumber: {
        type: String,
        unique: true,
        index: true,
        required: [true, "Account number is required"]
    },

    accountType: {
        type: String,
        enum: ["Savings", "Current", "Salary"],
        default: "Savings",
        required: [true, "Account type is required"]
    },

    balance: {
        type: Number,
        default: 0,
        min: [0, "Account balance cannot be negative"]
    }
},
{
    timestamps: true
});

module.exports = mongoose.model("Account", accountSchema);
