const mongoose = require("mongoose");

const beneficiarySchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
  beneficiaryName: { type: String, required: true },
  accountNumber: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("Beneficiary", beneficiarySchema);
