const express = require("express");
const router = express.Router();

const {
    registerCustomer,
    loginCustomer,
    getAllCustomers,
    getSecurityLogs
} = require("../controllers/customerController");

const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

router.post("/register", registerCustomer);
router.post("/login", loginCustomer);
router.get("/all", verifyToken, requireAdmin, getAllCustomers);
router.get("/security-logs", verifyToken, requireAdmin, getSecurityLogs);

module.exports = router;
