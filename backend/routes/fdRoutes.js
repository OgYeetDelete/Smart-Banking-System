const express = require("express");
const router = express.Router();
const fdController = require("../controllers/fdController");
const { verifyToken } = require("../middleware/authMiddleware");

// ── NEW: Fixed Deposit Routes (User Functionality #3) ──
router.post("/create", verifyToken, fdController.createFD);
router.post("/:id/withdraw", verifyToken, fdController.withdrawFD);
router.get("/customer/:customerId", verifyToken, fdController.getCustomerFDs);

module.exports = router;
