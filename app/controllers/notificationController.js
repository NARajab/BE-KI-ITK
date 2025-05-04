const { Notifications } = require("../models");

const ApiError = require("../../utils/apiError");

const getAllNotifications = async (req, res, next) => {
  try {
    const notifications = await Notifications.findAll();
    return res.json({
      status: "success",
      notifications,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  getAllNotifications,
};
