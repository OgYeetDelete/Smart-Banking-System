const mongoose = require("mongoose");

// ── NEW MODEL: Audit Log — Capped Collection (MongoDB Functionality #5) ──
// Capped collections have a fixed size and automatically remove oldest documents
// when the cap is reached — perfect for a rolling audit trail.
// The capped collection is created in server.js startup if it doesn't exist.

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },   // e.g. "TRANSFER", "ACCOUNT_FREEZE", "LOGIN", "FD_CREATE"
  performedBy: { type: String, required: true }, // email of the user
  targetResource: { type: String },             // e.g. "Account:1793095400123"
  details: { type: String },
  timestamp: { type: Date, default: Date.now }
});

// We'll bind to an existing capped collection at runtime — see server.js
module.exports = mongoose.model("AuditLog", auditLogSchema);
