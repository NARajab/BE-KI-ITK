const { Periods, SubmissionTypes } = require("../models");
const { Op, where } = require("sequelize");

const ApiError = require("../../utils/apiError");

const createPeriod = async (req, res, next) => {
  try {
    const { year } = req.body;

    const existingPeriod = await Periods.findOne({
      where: {
        year,
      },
    });

    if (existingPeriod) {
      return next(
        new ApiError("Periode dengan tahun yang sama sudah ada.", 400)
      );
    }

    const newPeriod = await Periods.create({
      year,
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

const createGroup = async (req, res, next) => {
  try {
    const { year } = req.params;
    const { group, startDate, endDate } = req.body;

    const formatDate = (date) => new Date(date).toISOString();

    const existingGroup = await Periods.findOne({
      where: {
        year,
        group,
      },
    });

    if (existingGroup) {
      return next(
        new ApiError(
          "Periode dengan gelombang dan tahun yang sama sudah ada.",
          400
        )
      );
    }

    if (group) {
      const duplicate = await Periods.findOne({
        where: {
          group: group,
          id: { [Op.ne]: year },
        },
      });

      if (duplicate) {
        return next(
          new ApiError("Periode dengan gelombang dan tahun ini sudah ada.", 400)
        );
      }
    }

    if (startDate && endDate) {
      const formattedStart = formatDate(startDate);
      const formattedEnd = formatDate(endDate);

      const sameDate = await Periods.findOne({
        where: {
          startDate: formattedStart,
          endDate: formattedEnd,
          id: { [Op.ne]: year },
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

    const newGroup = await Periods.create(
      { year: year, group, startDate, endDate },
      {
        where: { year },
      }
    );

    res.status(201).json({
      status: "success",
      message: "Periode berhasil ditambahkan",
      newGroup,
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

    if (updateData.year) {
      const duplicate = await Periods.findOne({
        where: {
          year: updateData.year,
          id: { [Op.ne]: id },
        },
      });

      if (duplicate) {
        return next(new ApiError("Periode dengan tahun ini sudah ada.", 400));
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

const updateGroup = async (req, res, next) => {
  try {
    const { id } = req.params;

    const group = await Periods.findByPk(id);

    if (!group) {
      return next(new ApiError("Gelombang tidak ditemukan.", 404));
    }

    const updateData = req.body;

    const formatDate = (date) => new Date(date).toISOString();

    if (updateData.group) {
      const duplicate = await Periods.findOne({
        where: {
          group: updateData.group,
          id: { [Op.ne]: id },
        },
      });

      if (duplicate) {
        return next(
          new ApiError("Periode dengan gelombang dan tahun ini sudah ada.", 400)
        );
      }
    }

    if (updateData.startDate && updateData.endDate) {
      const formattedStart = formatDate(updateData.startDate);
      const formattedEnd = formatDate(updateData.endDate);

      const sameDate = await Periods.findOne({
        where: {
          startDate: formattedStart,
          endDate: formattedEnd,
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

    await group.update(updateData);

    res.status(200).json({
      status: "success",
      message: "Gelombang berhasil diperbarui",
      group,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updateQuota = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { copyrightQuota, patentQuota, brandQuota, industrialDesignQuota } =
      req.body;

    const period = await Periods.findByPk(id);

    if (!period) {
      return next(new ApiError("Periode tidak ditemukan.", 404));
    }

    await period.update({
      copyrightQuota,
      patentQuota,
      brandQuota,
      industrialDesignQuota,
    });

    res.status(200).json({
      status: "success",
      message: "Kuota berhasil diperbarui",
      period,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllGroupByYear = async (req, res, next) => {
  try {
    const groups = await Periods.findAll({
      where: {
        year: req.params.year,
        group: {
          [Op.ne]: null,
        },
      },
    });
    return res.status(200).json({
      status: "success",
      groups,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllPeriod = async (req, res, next) => {
  try {
    const periods = await Periods.findAll({
      where: {
        group: {
          [Op.ne]: null,
        },
      },
    });

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
      where: { year, group: { [Op.ne]: null } },
      order: [["group", "ASC"]],
    });

    if (periods.length === 0) {
      return next(new ApiError("Periode ditahun itu tidak ditemukan", 404));
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
  createGroup,
  updatePeriod,
  updateGroup,
  updateQuota,
  getAllPeriod,
  getAllGroupByYear,
  getByYear,
  getByGroup,
  deletePeriod,
  getSubmissionType,
};
