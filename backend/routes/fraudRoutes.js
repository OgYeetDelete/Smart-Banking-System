const express = require("express");
const router = express.Router();
const fraudController = require("../controllers/fraudController");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

router.get("/", verifyToken, requireAdmin, fraudController.getAllFraudAlerts);
router.get("/stats", verifyToken, requireAdmin, fraudController.getFraudStats);
router.patch("/:id/status", verifyToken, requireAdmin, fraudController.updateAlertStatus);

module.exports = router;
