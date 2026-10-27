const express = require("express");
const router = express.Router();

const {
    transferFunds,
    getTransferHistory,
    spendingAnalytics
} = require("../controllers/transferController");

const { verifyToken } = require("../middleware/authMiddleware");

// Protected Transfer Endpoints
router.post("/transfer", verifyToken, transferFunds);
router.get("/history/:accountNumber", verifyToken, getTransferHistory);
router.get("/analytics/spending", verifyToken, spendingAnalytics);

module.exports = router;
