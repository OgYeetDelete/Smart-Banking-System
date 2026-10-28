const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  type: { type: String, enum: ["INFO", "ALERT", "FRAUD_WARNING", "TRANSACTION"], default: "INFO" },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, expires: 300 } // TTL: 5 minutes
});

module.exports = mongoose.model("Notification", notificationSchema);
