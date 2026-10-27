const express = require("express");
const router = express.Router();

const {
    addBeneficiary,
    getBeneficiariesByCustomer
} = require("../controllers/beneficiaryController");

const { verifyToken } = require("../middleware/authMiddleware");

// Beneficiary Endpoints
router.post("/add", verifyToken, addBeneficiary);
router.get("/customer/:customerId", verifyToken, getBeneficiariesByCustomer);

module.exports = router;
