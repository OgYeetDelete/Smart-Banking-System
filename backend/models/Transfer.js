const mongoose = require("mongoose");

const transferSchema = new mongoose.Schema({
  fromAccount: { type: String, required: true },
  toAccount: { type: String, required: true },
  amount: { type: Number, required: true, min: 1 },
  transferredAt: { type: Date, default: Date.now }
});

// Compound index for fast history lookups + fraud engine velocity checks
transferSchema.index({ fromAccount: 1, transferredAt: -1 });

module.exports = mongoose.model("Transfer", transferSchema);
