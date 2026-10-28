const AuditLog = require("../models/AuditLog");

// ══════════════════════════════════════════════════════════════
// NEW: Audit Log Controller — Capped Collection (MongoDB Functionality #5)
// Reads from the auto-rotating fixed-size capped collection.
// ══════════════════════════════════════════════════════════════

// Get recent audit logs (capped collection auto-drops oldest)
exports.getAuditLogs = async (req, res) => {
  try {
    const { action, limit } = req.query;
    const filter = {};
    if (action) filter.action = action;

    const logs = await AuditLog.find(filter)
      .sort({ $natural: -1 }) // $natural sort is optimal on capped collections
      .limit(parseInt(limit) || 50);

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get audit stats
exports.getAuditStats = async (req, res) => {
  try {
    const stats = await AuditLog.aggregate([
      { $group: {
          _id: "$action",
          count: { $sum: 1 },
          lastOccurrence: { $max: "$timestamp" }
      }},
      { $sort: { count: -1 } }
    ]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
