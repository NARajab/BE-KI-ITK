const { TermsConditions } = require("../models");

const ApiError = require("../../utils/apiError");

const createTerms = async (req, res, next) => {
  try {
    const terms = await TermsConditions.create(req.body);
    res.status(200).json({
      status: "success",
      message: "Terms and conditions berhasil dibuat",
      terms,
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

module.exports = { createTerms, updateTerms, getAllTerms, getTermsById };
