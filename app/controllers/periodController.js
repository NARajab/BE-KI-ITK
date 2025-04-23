const { Periods, SubmissionTypes } = require("../models");
const { Op } = require("sequelize");

const ApiError = require("../../utils/apiError");

const createPeriod = async (req, res, next) => {
  try {
    const {
      group,
      startDate,
      endDate,
      year,
      copyrightQuota,
      patentQuota,
      brandQuota,
      industrialDesignQuota,
    } = req.body;

    const existingPeriod = await Periods.findOne({
      where: {
        group,
        year,
      },
    });

    if (existingPeriod) {
      return next(
        new ApiError(
          "Periode dengan gelombang dan tahun yang sama sudah ada.",
          400
        )
      );
    }

    const sameDatePeriod = await Periods.findOne({
      where: {
        startDate,
        endDate,
      },
    });

    if (sameDatePeriod) {
      return next(
        new ApiError(
          "Periode dengan tanggal mulai dan akhir yang sama sudah ada.",
          400
        )
      );
    }

    const newPeriod = await Periods.create({
      group,
      startDate,
      endDate,
      year,
      copyrightQuota,
      patentQuota,
      brandQuota,
      industrialDesignQuota,
    });

    res.status(201).json({
      status: "success",
      message: "Periode berhasil ditambahkan",
      newPeriod,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updatePeriod = async (req, res, next) => {
  try {
    const { id } = req.params;

    const period = await Periods.findByPk(id);

    if (!period) {
      return next(new ApiError("Periode tidak ditemukan.", 404));
    }

    const updateData = req.body;

    if (updateData.group && updateData.year) {
      const duplicate = await Periods.findOne({
        where: {
          group: updateData.group,
          year: updateData.year,
          id: { [Op.ne]: id },
        },
      });

      if (duplicate) {
        return next(
          new ApiError("Periode dengan group dan tahun ini sudah ada.", 400)
        );
      }
    }

    if (updateData.startDate && updateData.endDate) {
      const sameDate = await Periods.findOne({
        where: {
          startDate: updateData.startDate,
          endDate: updateData.endDate,
          id: { [Op.ne]: id },
        },
      });

      if (sameDate) {
        return next(
          new ApiError(
            "Tanggal mulai dan akhir sudah digunakan oleh periode lain.",
            400
          )
        );
      }
    }

    await period.update(updateData);

    res.status(200).json({
      status: "success",
      message: "Periode berhasil diperbarui",
      period,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllPeriod = async (req, res, next) => {
  try {
    const periods = await Periods.findAll();
    return res.status(200).json({
      status: "success",
      periods,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getByYear = async (req, res, next) => {
  try {
    const { year } = req.query;

    if (!year) {
      return next(new ApiError("Parameter 'year' wajib diisi.", 400));
    }

    const periods = await Periods.findAll({
      where: { year },
      order: [["group", "ASC"]],
    });

    if (periods.length === 0) {
      return next(new ApiError("Periode ditahun itu tidak ditemukan"));
    }

    res.status(200).json({
      status: "success",
      message: "Data periode berhasil diambil",
      periods,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getByGroup = async (req, res, next) => {
  try {
    const { group } = req.query;

    if (!group) {
      return next(new ApiError("Parameter 'group' wajib diisi.", 400));
    }

    const periods = await Periods.findAll({
      where: { group },
      order: [["year", "ASC"]],
    });

    if (periods.length === 0) {
      return next(
        new ApiError("Periode dengan gelombang tersebut tidak ditemukan.", 404)
      );
    }

    res.status(200).json({
      status: "success",
      message: "Data periode berdasarkan gelombang berhasil diambil",
      periods,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const deletePeriod = async (req, res, next) => {
  try {
    const { id } = req.params;

    const period = await Periods.findByPk(id);

    if (!period) {
      return next(new ApiError("Periode tidak ditemukan.", 404));
    }

    await period.destroy();

    res.status(200).json({
      status: "success",
      message: "Periode berhasil dihapus",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getSubmissionType = async (req, res, next) => {
  try {
    const submissionsType = await SubmissionTypes.findAll();

    res.status(200).json({
      status: "success",
      submissionsType,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  createPeriod,
  updatePeriod,
  getAllPeriod,
  getByYear,
  getByGroup,
  deletePeriod,
  getSubmissionType,
};
