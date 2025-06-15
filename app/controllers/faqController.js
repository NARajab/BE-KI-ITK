const { Faqs } = require("../models");

const logActivity = require("../helpers/activityLogs");
const ApiError = require("../../utils/apiError");
const { Op } = require("sequelize");

const createTypeFaq = async (req, res, next) => {
  try {
    const { type } = req.body;
    const existingType = await Faqs.findOne({ where: { type } });
    if (existingType) {
      return res.status(400).json({
        status: "error",
        message: `Kategori FAQ '${type}' sudah ada.`,
      });
    }
    await Faqs.create({ type: type });

    await logActivity({
      userId: req.user.id,
      action: "Menambah Kategori Faq",
      description: `${req.user.fullname} berhasil menambahkan kategori FAQ: ${type}.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

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
    const { oldType, newType } = req.body;

    const affectedFaqs = await Faqs.findAll({
      where: { type: oldType },
    });

    if (affectedFaqs.length === 0) {
      return next(new ApiError("Tidak ada dokumen dengan id tersebut", 404));
    }

    const duplicateType = await Faqs.findOne({
      where: { type: newType },
    });

    if (duplicateType && oldType !== newType) {
      return res.status(400).json({
        status: "error",
        message: `Kategori FAQ '${newType}' sudah digunakan.`,
      });
    }

    await Faqs.update({ type: newType }, { where: { type: oldType } });

    await logActivity({
      userId: req.user.id,
      action: "Mengubah Kategori Faq",
      description: `${req.user.fullname} berhasil memperbaharui kategori FAQ: ${newType}.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: `Faqs berhasil diperbaharui`,
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

    await logActivity({
      userId: req.user.id,
      action: "Menambah Faq",
      description: `${req.user.fullname} berhasil menambahkan FAQ.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
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

const getAllFaqWoutPagination = async (req, res, next) => {
  try {
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
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllTypeFaq = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search?.trim();

    const whereCondition = {
      question: { [Op.eq]: null },
      ...(search && {
        type: {
          [Op.iLike]: `%${search}%`,
        },
      }),
    };

    const { count, rows } = await Faqs.findAndCountAll({
      limit,
      offset,
      attributes: ["id", "type", "createdAt", "updatedAt"],
      order: [["id", "ASC"]],
      where: whereCondition,
    });

    const counts = await Faqs.findAll({
      attributes: [
        "type",
        [
          Faqs.sequelize.fn("COUNT", Faqs.sequelize.col("type")),
          "totalTypeDigunakan",
        ],
      ],
      group: ["type"],
    });

    const countsMap = {};
    counts.forEach((item) => {
      countsMap[item.type] = parseInt(item.dataValues.totalTypeDigunakan);
    });

    const faqsWithCount = rows.map((faq) => {
      const totalCount = countsMap[faq.dataValues.type] || 0;
      return {
        id: faq.dataValues.id,
        type: faq.dataValues.type,
        createdAt: faq.dataValues.createdAt,
        updatedAt: faq.dataValues.updatedAt,
        totalTypeDigunakan: totalCount > 0 ? totalCount - 1 : 0,
      };
    });

    return res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalFaqs: count,
      limit,
      faqs: faqsWithCount,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};
const getFaqByType = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const offset = (page - 1) * limit;

    const whereCondition = {
      type: req.params.type,
      question: {
        [Op.ne]: null,
        ...(search && {
          [Op.iLike]: `%${search}%`, // Untuk PostgreSQL
          // [Op.like]: `%${search}%`, // Gunakan ini kalau pakai MySQL
        }),
      },
    };

    const { count, rows: faqs } = await Faqs.findAndCountAll({
      limit,
      offset,
      order: [["id", "ASC"]],
      where: whereCondition,
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

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const faq = await Faqs.findByPk(id);
    if (!faq) {
      return next(new ApiError("Faq tidak ditemukan", 404));
    }
    res.status(200).json({
      status: "success",
      faq,
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

    await logActivity({
      userId: req.user.id,
      action: "Mengubah Faq",
      description: `${req.user.fullname} berhasil memperbaharui FAQ.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Faq berhasil diperbarui",
      faq,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const restoreFaq = async (req, res, next) => {
  try {
    const { id } = req.params;

    const faq = await Faqs.findOne({
      where: { id },
      paranoid: false,
    });

    if (!faq) {
      return next(new ApiError("Faq tidak ditemukan", 404));
    }

    if (!faq.deletedAt) {
      return res.status(400).json({
        status: "fail",
        message: "Faq ini belum dihapus",
      });
    }

    await faq.restore();

    await logActivity({
      userId: req.user.id,
      action: "Mengembalikan Faq",
      description: `${req.user.fullname} berhasil mengembalikan FAQ.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Faq berhasil dikembalikan",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const restoreTypeFaq = async (req, res, next) => {
  try {
    const { type } = req.params;

    const faqs = await Faqs.findAll({
      where: { type },
      paranoid: false,
    });

    if (faqs.length === 0) {
      return next(
        new ApiError("Faq dengan type tersebut tidak ditemukan", 404)
      );
    }

    const deletedFaqs = faqs.filter((faq) => faq.deletedAt !== null);

    if (deletedFaqs.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "Tidak ada Faq yang perlu direstore untuk type ini",
      });
    }

    for (const faq of deletedFaqs) {
      await faq.restore();
    }

    await logActivity({
      userId: req.user.id,
      action: "Restore Kategori FAQ",
      description: `${req.user.fullname} berhasil mengembalikan FAQ dengan type '${type}'.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: `Berhasil mengembalikan semua FAQ dengan type '${type}'`,
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

    await logActivity({
      userId: req.user.id,
      action: "Menghapus Faq",
      description: `${req.user.fullname} berhasil menghapus FAQ.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Faq berhasil dihapus",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const deleteTypeFaq = async (req, res, next) => {
  try {
    const { type } = req.params;

    const faqs = await Faqs.findAll({ where: { type } });

    if (faqs.length === 0) {
      return next(new ApiError("Tidak ada Faq dengan type tersebut", 404));
    }

    for (const faq of faqs) {
      await faq.destroy();
    }

    await logActivity({
      userId: req.user.id,
      action: "Menghapus Kategori Faq",
      description: `${req.user.fullname} berhasil menghapus kategori FAQ.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: `Semua Faq dengan type '${type}' berhasil dihapus`,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  createTypeFaq,
  createFaqByType,
  getAllFaq,
  getAllFaqWoutPagination,
  getAllTypeFaq,
  getFaqByType,
  getById,
  updateFaq,
  updateFaqType,
  restoreFaq,
  restoreTypeFaq,
  deleteFaq,
  deleteTypeFaq,
};
