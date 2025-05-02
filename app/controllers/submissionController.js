const { Submissions, SubmissionTypes } = require("../models");

const ApiError = require("../../utils/apiError");
const { where } = require("sequelize");

const getSubmissionType = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    if (limit <= 0) {
      const submissionsType = await SubmissionTypes.findAll();

      res.status(200).json({
        status: "success",
        submissionsType,
      });
    }

    const offset = (page - 1) * limit;

    const { count, rows: submissionsType } =
      await SubmissionTypes.findAndCountAll({
        limit,
        offset,
      });

    res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalTypes: count,
      limit: limit,
      submissionsType,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getSubmissionTypeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const type = await SubmissionTypes.findByPk(id);

    if (!type) {
      return next(new ApiError("Jenis pengajuan tidak ditemukan", 404));
    }

    res.status(200).json({
      status: "success",
      type,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const createSubmissionType = async (req, res, next) => {
  try {
    const { title, isPublish } = req.body;

    await SubmissionTypes.create({
      title,
      isPublish,
    });

    res.status(201).json({
      status: "success",
      message: "Jenis pengajuan berhasil ditambahkan",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updateSubmissionType = async (req, res, next) => {
  try {
    const { id } = req.params;

    const type = await SubmissionTypes.findByPk(id);

    if (!type) {
      return next(new ApiError("Jenis pengajuan tidak ditemukan", 404));
    }

    await SubmissionTypes.update(req.body, {
      where: { id },
    });

    res.status(200).json({
      status: "success",
      message: "Jenis pengajuan berhasil diperbaharui",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const deleteSubmissionType = async (req, res, next) => {
  try {
    const { id } = req.params;

    const type = await SubmissionTypes.findByPk(id);

    if (!type) {
      return next(new ApiError("Jenis pengajuan tidak ditemukan", 404));
    }

    await SubmissionTypes.destroy({ where: { id } });

    res.status(200).json({
      status: "success",
      message: "Jenis pengajuan berhasil dihapus",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  getSubmissionType,
  getSubmissionTypeById,
  createSubmissionType,
  updateSubmissionType,
  deleteSubmissionType,
};
