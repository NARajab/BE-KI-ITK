const { Faqs } = require("../models");

const ApiError = require("../../utils/apiError");
const { Op } = require("sequelize");

const createTypeFaq = async (req, res, next) => {
  try {
    const { type } = req.body;
    await Faqs.create({ type: type });
    res.status(200).json({
      status: "success",
      message: "Kategori Faq berhasil ditambahkan",
    });
  } catch (err) {
    next(new ApiError(err.message, 400));
  }
};

const updateFaqType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newType } = req.body;

    const affectedFaqs = await Faqs.findOne({
      where: { id },
    });

    if (affectedFaqs.length === 0) {
      return next(new ApiError("Tidak ada dokumen dengan id tersebut", 404));
    }

    await Faqs.update({ type: newType }, { where: { id } });

    res.status(200).json({
      status: "success",
      message: `Faqs berhasil diperbaharui menjadi ${newType}`,
    });
  } catch (error) {
    next(new ApiError(error.message, 500));
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
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    if (limit <= 0) {
      const faqs = await Faqs.findAll({
        order: [["id", "ASC"]],
        where: {
          question: {
            [Op.ne]: null,
          },
        },
      });
      res.status(200).json({
        status: "success",
        faqs,
      });
    }

    const offset = (page - 1) * limit;

    const { count, rows: faqs } = await Faqs.findAndCountAll({
      limit,
      offset,
      order: [["id", "ASC"]],
      where: {
        question: {
          [Op.ne]: null,
        },
      },
    });

    res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalFaqs: count,
      limit: limit,
      faqs,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllTypeFaq = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    const offset = (page - 1) * limit;

    const { count, rows: faqs } = await Faqs.findAndCountAll({
      limit,
      offset,
      attributes: ["id", "type", "createdAt", "updatedAt"],
      order: [["id", "ASC"]],
      where: {
        question: {
          [Op.eq]: null,
        },
      },
    });

    const typeCountsRaw = await Faqs.findAll({
      attributes: [
        "type",
        [
          Faqs.sequelize.fn("COUNT", Faqs.sequelize.col("type")),
          "totalTypeDigunakan",
        ],
      ],
      group: ["type"],
    });

    const typeCountMap = {};
    typeCountsRaw.forEach((item) => {
      typeCountMap[item.type] = parseInt(item.dataValues.totalTypeDigunakan);
    });

    const faqsWithTotal = faqs.map((faq) => ({
      ...faq.dataValues,
      totalTypeDigunakan: (typeCountMap[faq.type] || 0) - 1,
    }));

    res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalFaqs: count,
      limit,
      faqs: faqsWithTotal,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};
const getFaqByType = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    if (limit <= 0) {
      const faqs = await Faqs.findAll({
        order: [["id", "ASC"]],
        where: {
          type: req.params.type,
          question: {
            [Op.ne]: null,
          },
        },
      });
      res.status(200).json({
        status: "success",
        faqs,
      });
    }

    const offset = (page - 1) * limit;

    const { count, rows: faqs } = await Faqs.findAndCountAll({
      limit,
      offset,
      order: [["id", "ASC"]],
      where: {
        type: req.params.type,
        question: {
          [Op.ne]: null,
        },
      },
    });

    res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalFaqs: count,
      limit: limit,
      faqs,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updateFaq = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { question, answer } = req.body;
    const faq = await Faqs.findByPk(id);
    if (!faq) {
      return next(new ApiError("Faq tidak ditemukan", 404));
    }
    await faq.update({ question, answer });
    res.status(200).json({
      status: "success",
      message: "Faq berhasil diperbarui",
      faq,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const deleteFaq = async (req, res, next) => {
  try {
    const { id } = req.params;
    const faq = await Faqs.findByPk(id);
    if (!faq) {
      return next(new ApiError("Faq tidak ditemukan", 404));
    }
    await faq.destroy();
    res.status(200).json({
      status: "success",
      message: "Faq berhasil dihapus",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  createTypeFaq,
  createFaqByType,
  getAllFaq,
  getAllTypeFaq,
  getFaqByType,
  updateFaq,
  updateFaqType,
  deleteFaq,
};
