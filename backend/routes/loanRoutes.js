const express = require("express");
const router = express.Router();

const {
    applyLoan,
    loanStatistics,
    getCustomerLoans,
    getAllLoans,
    updateLoanStatus
} = require("../controllers/loanController");

const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

// Loan Endpoints
router.post("/apply", verifyToken, applyLoan);
router.get("/stats", verifyToken, loanStatistics);
router.get("/all", verifyToken, requireAdmin, getAllLoans);
router.get("/customer/:customerId", verifyToken, getCustomerLoans);
router.patch("/:id/status", verifyToken, requireAdmin, updateLoanStatus);

module.exports = router;
