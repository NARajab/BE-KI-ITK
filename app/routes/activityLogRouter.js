const router = require("express").Router();

const ActivityLog = require("../controllers/activityLogController");
const authenticat = require("../middlewares/authenticat");
const checkRole = require("../middlewares/checkRole");

router.get(
  "/",
  authenticat,
  checkRole(["superAdmin"]),
  ActivityLog.getActivityLogs
);

module.exports = router;
