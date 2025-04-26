const { Documents } = require("../models");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");

const ApiError = require("../../utils/apiError");

const createDocumentType = async (req, res, next) => {
  try {
    const { type } = req.body;
    const document = await Documents.create({
      type,
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
    const docs = await Documents.findAll({
      where: {
        title: {
          [Op.ne]: null,
        },
      },
    });
    res.status(200).json({
      status: "success",
      docs,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getDocByType = async (req, res, next) => {
  try {
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

    res.status(200).json({
      status: "success",
      message: "Document berhasil dihapus",
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
  getDocByType,
  deleteDoc,
};
