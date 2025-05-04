const { Notifications } = require("../models");

const sendNotification = async (userId, title, descripton, isRead) => {
  try {
    console.log("Sending notification to userId:", userId); // Pastikan userId adalah angka
    if (typeof userId !== "number") {
      throw new Error("Invalid userId passed to sendNotification");
    }

    await Notifications.create({
      userId,
      title,
      descripton,
      isRead: false,
    });
  } catch (error) {
    console.error("Gagal mengirim notifikasi:", error.message);
  }
};

module.exports = sendNotification;
