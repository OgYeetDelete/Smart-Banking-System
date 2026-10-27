const express = require("express");
const router = express.Router();

const {
    createAccount,
    depositFunds,
    accountReport,
    getCustomerAccounts,
    getAccountByNumber,
    getAllAccounts
} = require("../controllers/accountController");

const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

// Account Management Endpoints
router.post("/create", verifyToken, createAccount);
router.post("/deposit", verifyToken, depositFunds);
router.get("/report", verifyToken, accountReport);
router.get("/customer/:customerId", verifyToken, getCustomerAccounts);
router.get("/details/:accountNumber", verifyToken, getAccountByNumber);
router.get("/all", verifyToken, requireAdmin, getAllAccounts);

module.exports = router;
