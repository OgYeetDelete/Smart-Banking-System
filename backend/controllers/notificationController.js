const Notification = require("../models/Notification");

// ── Existing: Get Notifications (TTL backed — auto-expire in 5 min) ──
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Existing: Create Notification ──
exports.createNotification = async (req, res) => {
  try {
    const { message, type, metadata } = req.body;
    const notification = await Notification.create({ message, type, metadata });
    res.status(201).json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
