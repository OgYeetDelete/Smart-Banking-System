const mongoose = require("mongoose");

// ── NEW MODEL: Fixed Deposit (User Functionality #3) ──
const fixedDepositSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
  principal: { type: Number, required: true, min: 1000 },
  interestRate: { type: Number, required: true },       // Annual % (e.g. 6.5)
  tenureMonths: { type: Number, required: true, min: 1 },
  maturityAmount: { type: Number, required: true },
  maturityDate: { type: Date, required: true },
  status: { type: String, enum: ["Active", "Matured", "Withdrawn"], default: "Active" },
  withdrawnAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model("FixedDeposit", fixedDepositSchema);
