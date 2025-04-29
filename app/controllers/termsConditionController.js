const { TermsConditions } = require("../models");

const ApiError = require("../../utils/apiError");

const createTerms = async (req, res, next) => {
  try {
    const terms = await TermsConditions.create(req.body);
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

    if (limit <= 0) {
      const terms = await TermsConditions.findAll();
      res.status(200).json({
        status: "success",
        terms,
      });
    }

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

const deleteTerms = async (req, res, next) => {
  try {
    const { id } = req.params;
    const terms = await TermsConditions.findByPk(id);
    if (!terms) {
      return next(new ApiError("Terms and conditions tidak ditemukan", 404));
    }
    await terms.destroy();
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
  getTermsById,
  deleteTerms,
};
