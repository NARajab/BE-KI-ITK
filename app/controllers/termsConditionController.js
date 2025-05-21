const { TermsConditions } = require("../models");

const logActivity = require("../helpers/activityLogs");
const ApiError = require("../../utils/apiError");

const createTerms = async (req, res, next) => {
  try {
    const terms = await TermsConditions.create(req.body);

    await logActivity({
      userId: req.user.id,
      action: "Menambah Syarat dan Ketentuan",
      description: `${req.user.fullname} berhasil menambah syarat dan ketentuan.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Terms and conditions berhasil dibuat",
    });
  } catch (error) {
    next(new ApiError(error.message, 400));
  }
};

const updateTerms = async (req, res, next) => {
  try {
    const { id } = req.params;
    const terms = await TermsConditions.findByPk(id);
    if (!terms) {
      return next(new ApiError("Terms and conditions tidak ditemukan", 404));
    }
    await terms.update(req.body);

    await logActivity({
      userId: req.user.id,
      action: "Mengubah Syarat dan Ketentuan",
      description: `${req.user.fullname} berhasil memperbaharui syarat dan ketentuan.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Terms and conditions berhasil diperbarui",
      terms,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllTerms = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    const offset = (page - 1) * limit;

    const { count, rows: terms } = await TermsConditions.findAndCountAll({
      limit,
      offset,
      order: [["id", "ASC"]],
    });

    res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalTerms: count,
      limit: limit,
      terms,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllTermsWTPagination = async (req, res, next) => {
  try {
    const terms = await TermsConditions.findAll();
    res.status(200).json({
      status: "success",
      terms,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getTermsById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const terms = await TermsConditions.findByPk(id);
    if (!terms) {
      return next(new ApiError("Terms and conditions tidak ditemukan", 404));
    }
    res.status(200).json({
      status: "success",
      terms,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const restoreTerms = async (req, res, next) => {
  try {
    const terms = await TermsConditions.findOne({
      where: { id: req.params.id },
      paranoid: false,
    });

    if (!terms) {
      return next(new ApiError("Terms and conditions tidak ditemukan", 404));
    }

    if (!terms.deletedAt) {
      return res.status(400).json({ message: "Terms belum dihapus" });
    }

    await terms.restore();

    await logActivity({
      userId: req.user.id,
      action: "Restore Syarat dan Ketentuan",
      description: `${req.user.fullname} berhasil merestore syarat dan ketentuan.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Terms and conditions berhasil direstore",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const deleteTerms = async (req, res, next) => {
  try {
    const { id } = req.params;
    const terms = await TermsConditions.findByPk(id);
    if (!terms) {
      return next(new ApiError("Terms and conditions tidak ditemukan", 404));
    }
    await terms.destroy();

    await logActivity({
      userId: req.user.id,
      action: "Menghapus Syarat dan Ketentuan",
      description: `${req.user.fullname} berhasil menghapus syarat dan ketentuan.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Terms and conditions berhasil dihapus",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  createTerms,
  updateTerms,
  getAllTerms,
  getAllTermsWTPagination,
  getTermsById,
  restoreTerms,
  deleteTerms,
};
