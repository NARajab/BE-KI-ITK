const { Documents } = require("../models");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");

const logActivity = require("../helpers/activityLogs");
const ApiError = require("../../utils/apiError");

const createDocumentType = async (req, res, next) => {
  try {
    const { type } = req.body;
    await Documents.create({
      type,
    });

    await logActivity({
      userId: req.user.id,
      action: "Menambah Kategori Unduhan",
      description: `${req.user.fullname} berhasil menambahkan kategori unduhan: ${type}.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(201).json({
      status: "success",
      message: "Dokumen berhasil ditambahkan",
    });
  } catch (error) {
    next(error);
  }
};

const updateDocumentType = async (req, res, next) => {
  try {
    const { oldType, newType } = req.body;

    const affectedDocs = await Documents.findAll({
      where: { type: oldType },
    });

    if (affectedDocs.length === 0) {
      return next(new ApiError("Tidak ada dokumen dengan tipe tersebut", 404));
    }

    await Documents.update({ type: newType }, { where: { type: oldType } });

    await logActivity({
      userId: req.user.id,
      action: "Mengubah Kategori Unduhan",
      description: `${req.user.fullname} berhasil memperbaharui kategori unduhan.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: `Semua dokumen dengan type '${oldType}' berhasil diubah menjadi '${newType}'`,
    });
  } catch (error) {
    next(new ApiError(error.message, 500));
  }
};

const createDocByType = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { title } = req.body;

    const doc = await Documents.findOne({
      where: {
        type: type,
      },
    });

    const document = req.file || null;

    if (!doc) {
      return next(new ApiError("Kategori faq tidak ditemukan", 404));
    }

    const newDoc = await Documents.create({
      type: type,
      title,
      document: document ? document.filename : null,
    });

    await logActivity({
      userId: req.user.id,
      action: "Menambah Unduhan",
      description: `${req.user.fullname} berhasil menambahkan unduhan.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Faq berhasil ditambahkan",
      newDoc,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updateDoc = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const document = req.file || null;

    const doc = await Documents.findOne({
      where: { id },
    });

    if (!doc) {
      return next(new ApiError("Kategori faq tidak ditemukan", 404));
    }

    if (document && doc.document) {
      const oldFilePath = path.join(
        __dirname,
        "../../",
        "uploads/documents/",
        doc.document
      );
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    doc.title = title || doc.title;
    if (document) {
      doc.document = document.filename;
    }

    await doc.save();

    await logActivity({
      userId: req.user.id,
      action: "Mengubah Unduhan",
      description: `${req.user.fullname} berhasil memperbaharui unduhan.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Dokumen berhasil diperbarui",
      updatedDoc: doc,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllDoc = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    if (limit <= 0) {
      const docs = await Documents.findAll({
        where: {
          title: {
            [Op.ne]: null,
          },
        },
      });
      return res.status(200).json({
        status: "success",
        totalDocs: docs.length,
        docs,
      });
    }
    const offset = (page - 1) * limit;

    const { count, rows: docs } = await Documents.findAndCountAll({
      limit,
      offset,
      where: {
        title: {
          [Op.ne]: null,
        },
      },
    });
    return res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalDocs: count,
      limit: limit,
      docs,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllDocType = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    const whereCondition = {
      title: {
        [Op.eq]: null,
      },
    };

    if (limit <= 0) {
      const docs = await Documents.findAll({
        attributes: ["id", "type", "createdAt", "updatedAt"],
        where: whereCondition,
      });

      const enrichedDocs = await Promise.all(
        docs.map(async (doc) => {
          const count = await Documents.count({
            where: { type: doc.type },
          });
          return {
            ...doc.toJSON(),
            totalTypeDigunakan: count - 1,
          };
        })
      );

      return res.status(200).json({
        status: "success",
        totalDocs: docs.length,
        docs: enrichedDocs,
      });
    }

    const offset = (page - 1) * limit;

    const { count, rows: docs } = await Documents.findAndCountAll({
      limit,
      offset,
      attributes: ["id", "type", "createdAt", "updatedAt"],
      where: whereCondition,
    });

    const enrichedDocs = await Promise.all(
      docs.map(async (doc) => {
        const count = await Documents.count({
          where: { type: doc.type },
        });
        return {
          ...doc.toJSON(),
          totalTypeDigunakan: count - 1,
        };
      })
    );

    return res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalDocs: count,
      limit: limit,
      docs: enrichedDocs,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getDocByType = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    if (limit <= 0) {
      const docs = await Documents.findAll({
        where: {
          type: req.params.type,
          title: {
            [Op.ne]: null,
          },
        },
      });
      res.status(200).json({
        status: "success",
        docs,
      });
    }
    const offset = (page - 1) * limit;

    const { count, rows: docs } = await Documents.findAndCountAll({
      limit,
      offset,
      where: {
        type: req.params.type,
        title: {
          [Op.ne]: null,
        },
      },
    });
    res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalDocs: count,
      limit: limit,
      docs,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await Documents.findByPk(id);
    if (!doc) {
      return next(new ApiError("Document tidak ditemukan", 404));
    }
    res.status(200).json({
      status: "success",
      doc,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const deleteDoc = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await Documents.findByPk(id);

    if (!doc) {
      return next(new ApiError("Document tidak ditemukan", 404));
    }

    if (doc.document) {
      const filePath = path.join(
        __dirname,
        "../../uploads/documents",
        doc.document
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await doc.destroy();

    await logActivity({
      userId: req.user.id,
      action: "Menghapus Unduhan",
      description: `${req.user.fullname} berhasil menghapus unduhan.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Document berhasil dihapus",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const deleteTypeDoc = async (req, res, next) => {
  try {
    const { type } = req.params;

    const docs = await Documents.findAll({ where: { type } });

    if (docs.length === 0) {
      return next(new ApiError("Tidak ada document dengan type tersebut", 404));
    }

    if (docs.document) {
      const filePath = path.join(
        __dirname,
        "../../uploads/documents",
        docs.document
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Documents.destroy({ where: { type } });

    await logActivity({
      userId: req.user.id,
      action: "Menghapus Kategori Unduhan",
      description: `${req.user.fullname} berhasil menghapus kategori unduhan.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: `Semua document dengan type '${type}' berhasil dihapus`,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  createDocumentType,
  createDocByType,
  updateDocumentType,
  updateDoc,
  getAllDoc,
  getAllDocType,
  getDocByType,
  getById,
  deleteDoc,
  deleteTypeDoc,
};
