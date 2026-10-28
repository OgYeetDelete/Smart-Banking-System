const FraudAlert = require("../models/FraudAlert");

// ── Existing: Get All Fraud Alerts (with optional filters) ──
exports.getAllFraudAlerts = async (req, res) => {
  try {
    const { status, severity } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;

    const alerts = await FraudAlert.find(filter).sort({ detectedAt: -1 }).limit(100);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Fraud Stats — KPI summary for the Admin Fraud Center ──
// Uses $facet to compute total, status-based counts, severity breakdown,
// and overall average risk score in a SINGLE aggregation query.
exports.getFraudStats = async (req, res) => {
  try {
    const [result] = await FraudAlert.aggregate([
      { $facet: {
          // Total count + average risk across ALL alerts
          overall: [
            { $group: {
                _id: null,
                total: { $sum: 1 },
                avgRisk: { $avg: "$riskScore" }
            }}
          ],
          // Count by status (Open / Pending / Confirmed / Cleared)
          byStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ],
          // Keep the original severity breakdown too
          bySeverity: [
            { $group: {
                _id: "$severity",
                count: { $sum: 1 },
                avgRiskScore: { $avg: "$riskScore" },
                totalAmount: { $sum: "$amount" }
            }},
            { $sort: { avgRiskScore: -1 } }
          ]
      }}
    ]);

    const overall = result.overall[0] || { total: 0, avgRisk: 0 };
    const statusMap = {};
    (result.byStatus || []).forEach(s => { statusMap[s._id] = s.count; });

    // "Pending" = alerts with status Open OR Pending (the fraud engine sets "Open" initially)
    const pending = (statusMap["Open"] || 0) + (statusMap["Pending"] || 0);
    const confirmed = statusMap["Confirmed"] || 0;

    res.json({
      total: overall.total,
      pending,
      confirmed,
      avgRisk: overall.avgRisk || 0,
      bySeverity: result.bySeverity || [],
      byStatus: result.byStatus || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Existing: Update Alert Status ──
exports.updateAlertStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const alert = await FraudAlert.findByIdAndUpdate(id, { status }, { new: true });
    if (!alert) return res.status(404).json({ error: "Fraud alert not found" });

    res.json({ message: `Alert status updated to ${status}`, alert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
