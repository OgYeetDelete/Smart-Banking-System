const express = require("express");
const router = express.Router();

const {
    transferFunds
} = require("../controllers/transferController");

router.post("/transfer", transferFunds);

module.exports = router;