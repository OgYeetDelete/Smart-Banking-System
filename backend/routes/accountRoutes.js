const express = require("express");
const router = express.Router();
const accountController = require("../controllers/accountController");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

router.post("/create", verifyToken, accountController.createAccount);
router.post("/deposit", verifyToken, accountController.depositFunds);
router.get("/report", verifyToken, accountController.accountReport);
router.get("/customer/:customerId", verifyToken, accountController.getCustomerAccounts);
router.get("/details/:accountNumber", verifyToken, accountController.getAccountByNumber);
router.get("/all", verifyToken, requireAdmin, accountController.getAllAccounts);

// ── NEW: Freeze / Unfreeze (User Functionality #4) ──
router.patch("/:accountNumber/freeze", verifyToken, requireAdmin, accountController.freezeAccount);
router.patch("/:accountNumber/unfreeze", verifyToken, requireAdmin, accountController.unfreezeAccount);

module.exports = router;
