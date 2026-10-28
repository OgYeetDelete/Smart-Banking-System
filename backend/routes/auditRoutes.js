const express = require("express");
const router = express.Router();
const auditController = require("../controllers/auditController");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

// ── NEW: Audit Log Routes — Capped Collection (MongoDB Functionality #5) ──
router.get("/", verifyToken, requireAdmin, auditController.getAuditLogs);
router.get("/stats", verifyToken, requireAdmin, auditController.getAuditStats);

module.exports = router;
