const express = require("express");
const router = express.Router();

const {
    addBeneficiary
} = require("../controllers/beneficiaryController");

router.post("/add", addBeneficiary);

module.exports = router;