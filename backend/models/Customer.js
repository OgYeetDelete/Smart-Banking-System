const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
{
    name: String,

    email: {
        type: String,
        unique: true,
        index: true
    },

    password: String,

    phone: String
},

{
    timestamps: true
});

module.exports = mongoose.model("Customer", customerSchema);
