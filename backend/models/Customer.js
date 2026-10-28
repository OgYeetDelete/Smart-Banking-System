const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  phone: { type: String },
  role: { type: String, enum: ["customer", "admin"], default: "customer" }
}, { timestamps: true });

// ── NEW: Text Index for $text search (MongoDB Functionality #2) ──
customerSchema.index({ name: "text", email: "text" });

module.exports = mongoose.model("Customer", customerSchema);
