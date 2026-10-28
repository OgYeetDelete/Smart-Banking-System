const mongoose = require("mongoose");

const fraudAlertSchema = new mongoose.Schema({
  transferId: { type: mongoose.Schema.Types.ObjectId, ref: "Transfer" },
  fromAccount: { type: String, required: true },
  toAccount: { type: String, required: true },
  amount: { type: Number, required: true },
  riskScore: { type: Number, required: true, min: 0, max: 100 },
  severity: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], required: true },
  rulesTriggered: [{ type: String }],
  status: { type: String, enum: ["Open", "Investigating", "Resolved", "Dismissed"], default: "Open" },
  detectedAt: { type: Date, default: Date.now }
});

// Compound index for filtered alert queries
fraudAlertSchema.index({ status: 1, detectedAt: -1 });

module.exports = mongoose.model("FraudAlert", fraudAlertSchema);
