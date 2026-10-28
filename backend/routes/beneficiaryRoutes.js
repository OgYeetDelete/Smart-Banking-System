const express = require("express");
const router = express.Router();
const beneficiaryController = require("../controllers/beneficiaryController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/add", verifyToken, beneficiaryController.addBeneficiary);
router.get("/customer/:customerId", verifyToken, beneficiaryController.getBeneficiariesByCustomer);

// ── NEW: Delete Beneficiary (User Functionality #2) ──
router.delete("/:id", verifyToken, beneficiaryController.deleteBeneficiary);

module.exports = router;
