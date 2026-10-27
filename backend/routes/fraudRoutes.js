const express = require("express");
const router = express.Router();

const {
    getAllFraudAlerts,
    getFraudStats,
    updateAlertStatus
} = require("../controllers/fraudController");

const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

// Admin-Only Fraud Alert Endpoints (RBAC Enforced)
router.get("/", verifyToken, requireAdmin, getAllFraudAlerts);
router.get("/stats", verifyToken, requireAdmin, getFraudStats);
router.patch("/:id/status", verifyToken, requireAdmin, updateAlertStatus);

module.exports = router;
