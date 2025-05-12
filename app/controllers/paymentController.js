const { Payments } = require("../models");

const logActivity = require("../helpers/activityLogs");
const ApiError = require("../../utils/apiError");

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
