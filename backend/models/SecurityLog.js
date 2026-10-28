const mongoose = require("mongoose");

const securityLogSchema = new mongoose.Schema({
  email: { type: String, required: true },
  action: { type: String, enum: ["LOGIN_SUCCESS", "LOGIN_FAILED", "REGISTER", "PASSWORD_CHANGE", "PROFILE_UPDATE"], required: true },
  status: { type: String, default: "success" },
  details: { type: String },
  ipAddress: { type: String },
  createdAt: { type: Date, default: Date.now, expires: 300 } // TTL: 5 minutes
});

module.exports = mongoose.model("SecurityLog", securityLogSchema);
