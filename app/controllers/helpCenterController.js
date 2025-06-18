const { HelpCenters, Users } = require("../models");
const { Op } = require("sequelize");

const SendEmail = require("../../emails/services/sendMail");
const helpCenterMailUser = require("../../emails/templates/helpCenterMailUser");
const helpCenterMailAdmin = require("../../emails/templates/helpCenterMailAdmin");
const sendNotification = require("../helpers/notifications");
const logActivity = require("../helpers/activityLogs");
const ApiError = require("../../utils/apiError");

const createHelpCenter = async (req, res, next) => {
  try {
    const { email, phoneNumber, problem, message } = req.body;

    const document = req.file || null;

    const user = await Users.findOne({ where: { email } });
    const userId = user ? user.id : null;
    const fullname = user ? user.fullname : email;

    const newHelpCenter = await HelpCenters.create({
      email,
      phoneNumber,
      problem,
      message,
      document: document ? document.filename : null,
      status: false,
    });

    await logActivity({
      userId,
      action: "Mengajukan Pertanyaan di Help Center",
      description: `${fullname} berhasil mengajukan pertanyaan di Help Center.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    const admins = await Users.findAll({ where: { role: "admin" } });
    const adminEmails = admins.map((admin) => admin.email);

    await SendEmail({
      to: adminEmails,
      subject: "Pertanyaan di Pusat Bantuan",
      html: helpCenterMailUser({ fullname, email }),
    });

    res.status(200).json({
      status: "success",
      message: "Help Center berhasil ditambahkan",
      newHelpCenter,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updateHelpCenter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { answer } = req.body;

    const helpCenter = await HelpCenters.findByPk(id);
    if (!helpCenter) {
      return next(new ApiError("Help Center tidak ditemukan", 404));
    }
    await helpCenter.update({ answer, status: true });

    const user = await Users.findOne({ where: { email: helpCenter.email } });

    if (isNaN(user.id)) {
      return next(new ApiError("ID pengguna tidak valid", 400));
    }

    await logActivity({
      userId: req.user.id,
      action: "Menjawab Pertanyaan di Help Center",
      description: `${req.user.fullname} berhasil menjawab pertanyaan di Help Center.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    await SendEmail({
      to: user.email,
      subject: "Pertanyaan di Pusat Bantuan",
      html: helpCenterMailAdmin({ fullname: user.fullname, message: answer }),
    });

    await sendNotification(
      user.id,
      "Pertanyaan di Pusat Bantuan",
      "Pertanyaan di Pusat Bantuan telah dijawab"
    );

    res.status(200).json({
      status: "success",
      message: "Help Center berhasil diperbarui",
      helpCenter,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getHelpCenter = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    const search = req.query.search?.trim();

    const whereCondition = search
      ? {
          [Op.or]: [
            { email: { [Op.iLike]: `%${search}%` } },
            { phoneNumber: { [Op.iLike]: `%${search}%` } },
            { problem: { [Op.iLike]: `%${search}%` } },
            { message: { [Op.iLike]: `%${search}%` } },
            { answer: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : {};
    const offset = (page - 1) * limit;
    const { count, rows: helpCenter } = await HelpCenters.findAndCountAll({
      limit,
      offset,
      where: whereCondition,
      order: [
        ["status", "ASC"],
        ["createdAt", "DESC"],
      ],
    });
    res.status(200).json({
      status: "success",
      message: "Help Center berhasil ditemukan",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      limit: limit,
      helpCenter,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getHelpCenterById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const helpCenter = await HelpCenters.findByPk(id);
    if (!helpCenter) {
      return next(new ApiError("Help Center tidak ditemukan", 404));
    }

    res.status(200).json({
      status: "success",
      message: "Help Center berhasil ditemukan",
      helpCenter,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const restoreHelpCenter = async (req, res, next) => {
  try {
    const { id } = req.params;

    const helpCenter = await HelpCenters.findOne({
      where: { id },
      paranoid: false,
    });

    if (!helpCenter) {
      return next(new ApiError("Help Center tidak ditemukan", 404));
    }

    if (!helpCenter.deletedAt) {
      return next(
        new ApiError(
          "Help Center ini belum dihapus, jadi tidak bisa direstore",
          400
        )
      );
    }

    await helpCenter.restore();

    await logActivity({
      userId: req.user.id,
      action: "Mengembalikan Pertanyaan di Help Center",
      description: `${req.user.fullname} berhasil mengembalikan pertanyaan di Help Center.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Help Center berhasil dikembalikan",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const deleteHelpCenter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const helpCenter = await HelpCenters.findByPk(id);
    if (!helpCenter) {
      return next(new ApiError("Help Center tidak ditemukan", 404));
    }
    await helpCenter.destroy();

    await logActivity({
      userId: req.user.id,
      action: "Menghapus Pertanyaan di Help Center",
      description: `${req.user.fullname} berhasil menghapus pertanyaan di Help Center.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Help Center berhasil dihapus",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  createHelpCenter,
  updateHelpCenter,
  getHelpCenter,
  getHelpCenterById,
  restoreHelpCenter,
  deleteHelpCenter,
};
