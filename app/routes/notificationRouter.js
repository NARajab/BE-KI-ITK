const router = require("express").Router();

const Notification = require("../controllers/notificationController");
const authenticat = require("../middlewares/authenticat");

router.get("/", Notification.getAllNotifications);

module.exports = router;
