const router = require("express").Router();

const Notification = require("../controllers/notificationController");
const authenticat = require("../middlewares/authenticat");

router.get("/", Notification.getAllNotifications);

router.get("/by-user-id/:id", Notification.getNotificationByUserId);

router.get("/by-id/:id", Notification.getNotificationById);

router.patch("/:id", Notification.updateNotification);

module.exports = router;
