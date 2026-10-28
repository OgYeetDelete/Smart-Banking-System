const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

router.post("/register", customerController.registerCustomer);
router.post("/login", customerController.loginCustomer);
router.get("/all", verifyToken, customerController.getAllCustomers);
router.get("/security-logs", verifyToken, requireAdmin, customerController.getSecurityLogs);

// ── NEW: Update Profile (User Functionality #1) ──
router.put("/profile", verifyToken, customerController.updateProfile);

// ── NEW: Text Search (MongoDB Functionality #2) ──
router.get("/search", verifyToken, requireAdmin, customerController.searchCustomers);

module.exports = router;
