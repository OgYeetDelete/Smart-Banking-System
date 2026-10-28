const express = require("express");
const router = express.Router();
const transferController = require("../controllers/transferController");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

router.post("/transfer", verifyToken, transferController.transferFunds);
router.get("/history/:accountNumber", verifyToken, transferController.getTransferHistory);
router.get("/analytics/spending", verifyToken, transferController.spendingAnalytics);

// ── NEW: Date-Range Statement (User Functionality #5) ──
router.get("/statement/:accountNumber", verifyToken, transferController.getStatement);

// ── NEW: $lookup — Transfers with Customer Names (MongoDB Functionality #1) ──
router.get("/enriched", verifyToken, requireAdmin, transferController.getTransfersWithCustomerNames);

// ── NEW: $bucket — Transaction Distribution (MongoDB Functionality #4) ──
router.get("/analytics/distribution", verifyToken, transferController.getTransactionDistribution);

module.exports = router;
