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

const getNotificationByUserId = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const notification = await Notifications.findAll({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]],
      limit,
    });

    if (!notification || notification.length === 0) {
      return next(new ApiError("Notifikasi tidak ditemukan", 404));
    }

    const unreadCount = await Notifications.count({
      where: {
        userId: req.user.id,
        isRead: false,
      },
    });

    return res.json({
      status: "success",
      totalUnread: unreadCount,
      notification,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getNotificationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notifications.findByPk(id);
    if (!notification) {
      return next(new ApiError("Notifikasi tidak ditemukan", 404));
    }
    return res.json({
      status: "success",
      notification,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updateNotification = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const updated = await Notifications.update(
      { isRead: true },
      { where: { userId } }
    );

    return res.status(200).json({
      status: "success",
      message: "Semua notifikasi berhasil ditandai sebagai sudah dibaca",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  getAllNotifications,
  getNotificationByUserId,
  getNotificationById,
  updateNotification,
};
