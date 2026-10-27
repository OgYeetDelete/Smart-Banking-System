const express = require("express");
const router = express.Router();

const {
    createNotification,
    getNotifications
} = require("../controllers/notificationController");

router.get("/", getNotifications);
router.post("/create", createNotification);

module.exports = router;
