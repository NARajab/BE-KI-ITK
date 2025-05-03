const { ActivityLogs } = require("../models");

const logActivity = async ({
  userId,
  action,
  description,
  device,
  ipAddress,
}) => {
  try {
    await ActivityLogs.create({
      userId,
      action,
      description,
      device,
      ipAddress,
    });
  } catch (err) {
    console.error("Failed to log activity:", err.message);
  }
};

module.exports = logActivity;
