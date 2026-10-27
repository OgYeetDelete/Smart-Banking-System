const Notification = require("../models/Notification");

/**
 * Get active unexpired notifications (TTL backed)
 */
exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find()
            .sort({ createdAt: -1 })
            .limit(20);

        res.status(200).json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Create a notification manually (or via system alert)
 */
exports.createNotification = async (req, res) => {
    try {
        const { message, type = "INFO", metadata = {} } = req.body;

        const notification = new Notification({
            message,
            type,
            metadata
        });

        await notification.save();

        res.status(201).json({
            message: "Notification Created",
            notification
        });
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
};
