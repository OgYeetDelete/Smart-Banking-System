const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
{
    name: {
        type: String,
        required: [true, "Customer name is required"],
        trim: true
    },

    email: {
        type: String,
        required: [true, "Email address is required"],
        unique: true,
        index: true,
        lowercase: true,
        trim: true
    },

    password: {
        type: String,
        required: [true, "Password is required"]
    },

    phone: {
        type: String,
        required: [true, "Phone number is required"]
    },

    role: {
        type: String,
        enum: ["customer", "admin"],
        default: "customer"
    }
},
{
    timestamps: true
});

module.exports = mongoose.model("Customer", customerSchema);
