const { Faqs } = require("../models");

const ApiError = require("../../utils/apiError");

const createTypeFaq = async (req, res, next) => {
  try {
    const { type } = req.body;
    const faq = await Faqs.create({ type: type });
    res.status(200).json({
      status: "success",
      message: "Kategori Faq berhasil ditambahkan",
      faq,
    });
  } catch (err) {
    next(new ApiError(err.message, 400));
  }
};

const createFaqByType = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { question, answer } = req.body;

    const faq = await Faqs.findOne({
      where: {
        type: type,
      },
    });

    if (!faq) {
      return next(new ApiError("Kategori faq tidak ditemukan", 404));
    }

    const newFaq = await Faqs.create({
      type: type,
      question,
      answer,
    });

    res.status(200).json({
      status: "success",
      message: "Faq berhasil ditambahkan",
      newFaq,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllFaq = async (req, res, next) => {
  try {
    const faqs = await Faqs.findAll();
    res.status(200).json({
      status: "success",
      faqs,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = { createTypeFaq, createFaqByType };
