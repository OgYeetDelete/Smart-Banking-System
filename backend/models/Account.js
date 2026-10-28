const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
  accountNumber: { type: String, unique: true, required: true },
  accountType: { type: String, enum: ["Savings", "Current", "Salary"], required: true },
  balance: { type: Number, default: 5000, min: 0 },
  // ── NEW: Freeze flag for Account Freeze/Unfreeze (User Functionality #4) ──
  isFrozen: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Account", accountSchema);
