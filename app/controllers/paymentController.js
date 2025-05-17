const {
  Payments,
  Users,
  Progresses,
  Submissions,
  UserSubmissions,
} = require("../models");

const logActivity = require("../helpers/activityLogs");
const sendNotification = require("../helpers/notifications");
const SendEmail = require("../../emails/services/sendMail");
const paymentConfirmationMail = require("../../emails/templates/PaymentConfirmationMail");
const ApiError = require("../../utils/apiError");
const { where, or } = require("sequelize");
const submissions = require("../models/submissions");

const getAllPayments = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    const offset = (page - 1) * limit;
    const { count, rows: payments } = await Payments.findAndCountAll({
      distinct: true,
      limit,
      offset,
    });
    return res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalPayments: count,
      limit: limit,
      payments,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await Payments.findByPk(id);

    if (!payment) {
      return next(new ApiError("Pembayaran tidak ditemukan", 404));
    }

    res.status(200).json({
      status: "success",
      payment,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getPaymentByUserId = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    const offset = (page - 1) * limit;
    const { count, rows: payments } = await Payments.findAndCountAll({
      where: { userId: req.user.id },
      distinct: true,
      limit,
      offset,
    });

    res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalPayments: count,
      limit: limit,
      payments,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updatePayment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await Payments.findByPk(id);

    if (!payment) {
      return next(new ApiError("Pembayaran tidak ditemukan", 404));
    }

    const submission = await Submissions.findOne({
      where: { id: payment.submissionId },
    });
    if (!submission) {
      return next(new ApiError("Submission tidak ditemukan", 404));
    }

    const userSubmission = await UserSubmissions.findOne({
      where: { submissionId: submission.id },
    });
    if (!userSubmission) {
      return next(new ApiError("UserSubmission tidak ditemukan", 404));
    }

    const progress = await Progresses.findOne({
      where: { userSubmissionId: userSubmission.id },
      order: [["id", "DESC"]],
    });
    if (!progress) {
      return next(new ApiError("Progress tidak ditemukan", 404));
    }

    const proofPayment = req.file;

    const updateData = {};

    if (proofPayment) {
      updateData.proofPayment = proofPayment.filename;
    }

    if (req.body.paymentStatus !== undefined) {
      updateData.paymentStatus = req.body.paymentStatus === "true";
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Tidak ada data yang diberikan untuk update.",
      });
    }

    const [updatedCount] = await Payments.update(updateData, {
      where: { id },
    });

    if (updatedCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Data pembayaran tidak ditemukan.",
      });
    }

    await Progresses.update({ isStatus: true }, { where: { id: progress.id } });

    const admins = await Users.findAll({ where: { role: "admin" } });
    const adminEmails = admins.map((admin) => admin.email);

    await SendEmail({
      to: adminEmails,
      subject: "Konfirmasi Pembayaran",
      html: paymentConfirmationMail({
        fullname: req.user.fullname,
        email: req.user.email,
        billCode: payment.billingCode,
      }),
    });

    await logActivity({
      userId: req.user.id,
      action: "Memperbarui Data Pembayaran",
      description: `${req.user.fullname} berhasil memperbarui data pembayaran.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Data pembayaran berhasil diupdate.",
      updatedFields: updateData,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  getPaymentByUserId,
  updatePayment,
};
