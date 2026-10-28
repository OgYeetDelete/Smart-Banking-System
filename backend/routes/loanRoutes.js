const express = require("express");
const router = express.Router();
const loanController = require("../controllers/loanController");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

router.post("/apply", verifyToken, loanController.applyLoan);
router.get("/stats", verifyToken, loanController.loanStatistics);
router.get("/customer/:customerId", verifyToken, loanController.getCustomerLoans);
router.get("/all", verifyToken, requireAdmin, loanController.getAllLoans);
router.patch("/:id/status", verifyToken, requireAdmin, loanController.updateLoanStatus);

// ── NEW: $facet — Multi-Dimensional Analytics (MongoDB Functionality #3) ──
router.get("/analytics/facet", verifyToken, loanController.loanFacetAnalytics);

module.exports = router;
