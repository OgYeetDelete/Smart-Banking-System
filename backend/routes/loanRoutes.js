const express = require("express");
const router = express.Router();

const {
    applyLoan,
    loanStatistics
} = require("../controllers/loanController");

router.post("/apply", applyLoan);
router.get("/stats", loanStatistics);

module.exports = router;