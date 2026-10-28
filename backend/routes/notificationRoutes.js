const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, notificationController.getNotifications);
router.post("/create", verifyToken, notificationController.createNotification);

module.exports = router;
