const express = require("express");
const router = express.Router();

const {
    createAccount,
    accountReport
} = require("../controllers/accountController");

router.post(
    "/create",
    createAccount
);

router.get(
    "/report",
    accountReport
);

module.exports = router;