const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
  loanType: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["Pending", "Approved", "Rejected", "Disbursed"], default: "Pending" },
  expires: { type: Date, default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), index: { expireAfterSeconds: 0 } }
}, { timestamps: true });

module.exports = mongoose.model("Loan", loanSchema);
