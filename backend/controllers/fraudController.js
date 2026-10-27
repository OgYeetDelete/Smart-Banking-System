const FraudAlert = require("../models/FraudAlert");

/**
 * Get all fraud alerts with optional filtering
 */
exports.getAllFraudAlerts = async (req, res) => {
    try {
        const { severity, status, limit = 50 } = req.query;
        const filter = {};

        if (severity) filter.severity = severity;
        if (status) filter.status = status;

        const alerts = await FraudAlert.find(filter)
            .sort({ detectedAt: -1 })
            .limit(Number(limit));

        res.status(200).json(alerts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Aggregation Pipeline: Real-Time Fraud Analytics
 * Summarizes alerts by severity, rules, and total flagged volume
 */
exports.getFraudStats = async (req, res) => {
    try {
        const severityStats = await FraudAlert.aggregate([
            {
                $group: {
                    _id: "$severity",
                    count: { $sum: 1 },
                    totalFlaggedAmount: { $sum: "$amount" },
                    avgRiskScore: { $avg: "$riskScore" }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        const totalAlerts = await FraudAlert.countDocuments();
        const pendingAlerts = await FraudAlert.countDocuments({ status: "FLAGGED" });

        res.status(200).json({
            totalAlerts,
            pendingAlerts,
            bySeverity: severityStats
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update fraud alert status (Admin resolution workflow)
 */
exports.updateAlertStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const alert = await FraudAlert.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!alert) {
            return res.status(404).json({ message: "Fraud alert not found" });
        }

        res.status(200).json({
            message: `Alert marked as ${status}`,
            alert
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
