const { Periods, Groups, Quotas } = require("../models");
const { Op } = require("sequelize");

const ApiError = require("../../utils/apiError");

const createPeriod = async (req, res, next) => {
  try {
    const { year } = req.body;

    const existingPeriod = await Periods.findOne({
      where: { year },
    });

    if (existingPeriod) {
      return next(
        new ApiError("Periode dengan tahun yang sama sudah ada.", 400)
      );
    }

    const newPeriod = await Periods.create({ year });

    const gelombangs = [
      "Gelombang 1",
      "Gelombang 2",
      "Gelombang 3",
      "Gelombang 4",
    ];
    const groupData = gelombangs.map((group) => ({
      periodId: newPeriod.id,
      group,
    }));

    const createdGroups = await Groups.bulkCreate(groupData, {
      returning: true,
    });

    const quotaData = createdGroups.map((group) => ({
      groupId: group.id,
    }));

    await Quotas.bulkCreate(quotaData);

    res.status(201).json({
      status: "success",
      message: "Periode berhasil ditambahkan beserta 4 Gelombang",
      newPeriod,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updatePeriod = async (req, res, next) => {
  try {
    const { oldYear, newYear } = req.body;

    const period = await Periods.findAll({
      where: {
        year: oldYear,
      },
    });

    if (period.length === 0) {
      return next(new ApiError("Periode tidak ditemukan.", 404));
    }

    const updateData = await Periods.update(
      { year: newYear },
      {
        where: { year: oldYear },
      }
    );

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

    res.status(200).json({
      status: "success",
      message: "Periode berhasil diperbarui",
      period,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const createGroup = async (req, res, next) => {
  try {
    const { id } = req.params;

    const period = await Periods.findByPk(id);
    if (!period) {
      return next(new ApiError("Periode tidak ditemukan.", 404));
    }

    const { group, startDate, endDate } = req.body;

    const duplicate = await Groups.findOne({
      where: {
        group,
        periodId: id,
      },
    });

    if (duplicate) {
      return next(
        new ApiError("Nama gelombang sudah digunakan oleh gelombang lain.", 400)
      );
    }

    const newGroup = await Groups.create({
      periodId: id,
      group,
      startDate,
      endDate,
    });

    const newQuota = await Quotas.create({
      groupId: newGroup.id,
    });

    res.status(201).json({
      status: "success",
      message: "Gelombang berhasil ditambahkan",
      newGroup,
      newQuota,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updateGroup = async (req, res, next) => {
  try {
    const { id } = req.params;

    const group = await Groups.findByPk(id);
    if (!group) {
      return next(new ApiError("Gelombang tidak ditemukan.", 404));
    }

    const { group: newGroup, startDate, endDate } = req.body;

    if (newGroup && newGroup !== group.group) {
      const duplicate = await Groups.findOne({
        where: {
          group: newGroup,
          id: { [Op.ne]: id },
        },
      });

      if (duplicate) {
        return next(
          new ApiError(
            "Nama gelombang sudah digunakan oleh gelombang lain.",
            400
          )
        );
      }
    }

    if (startDate && endDate) {
      const sameDate = await Groups.findOne({
        where: {
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          id: { [Op.ne]: id },
        },
      });

      if (sameDate) {
        return next(
          new ApiError(
            "Tanggal mulai dan akhir sudah digunakan oleh gelombang lain.",
            400
          )
        );
      }
    }

    const updateData = {};
    if (newGroup) updateData.group = newGroup;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);

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

    const quota = await Quotas.findByPk(id);

    if (!quota) {
      return next(new ApiError("Quota tidak ditemukan.", 404));
    }

    await quota.update({
      copyrightQuota,
      remainingCopyrightQuota: copyrightQuota,
      patentQuota,
      remainingPatentQuota: patentQuota,
      brandQuota,
      remainingBrandQuota: brandQuota,
      industrialDesignQuota,
      remainingIndustrialDesignQuota: industrialDesignQuota,
    });

    res.status(200).json({
      status: "success",
      message: "Kuota berhasil diperbarui",
      quota,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllGroupByYear = async (req, res, next) => {
  try {
    const groups = await Groups.findAll({
      order: [["id", "ASC"]],
      where: {
        periodId: req.params.id,
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
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    if (limit <= 0) {
      const periods = await Periods.findAll({
        order: [["id", "ASC"]],
      });

      return res.status(200).json({
        status: "success",
        periods,
      });
    }

    const offset = (page - 1) * limit;

    const { count, rows: periods } = await Periods.findAndCountAll({
      limit,
      offset,
      order: [["id", "ASC"]],
    });

    res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalPeriods: count,
      limit: limit,
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

const getAllQuotas = async (req, res, next) => {
  try {
    const quotas = await Quotas.findAll();

    res.status(200).json({
      status: "success",
      message: "Data quota berhasil diambil",
      quotas,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getQuotaById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const quotas = await Quotas.findByPk(id);

    if (!quotas) {
      return next(new ApiError("Quota tidak ditemukan.", 404));
    }

    res.status(200).json({
      status: "success",
      message: "Data quota berhasil diambil",
      quotas,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const deleteGroup = async (req, res, next) => {
  try {
    const { id } = req.params;

    const group = await Groups.findByPk(id);

    if (!group) {
      return next(new ApiError("Gelombang tidak ditemukan.", 404));
    }

    await Quotas.destroy({
      where: { groupId: id },
    });

    await group.destroy();

    res.status(200).json({
      status: "success",
      message: "Gelombang dan quota terkait berhasil dihapus",
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
      return next(
        new ApiError("Periode dengan ID tersebut tidak ditemukan.", 404)
      );
    }

    const groups = await Groups.findAll({ where: { periodId: id } });

    const groupIds = groups.map((group) => group.id);

    await Quotas.destroy({ where: { groupId: groupIds } });

    await Groups.destroy({ where: { periodId: id } });

    await Periods.destroy({ where: { id } });

    res.status(200).json({
      status: "success",
      message: "Periode dan semua data terkait berhasil dihapus.",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  createPeriod,
  updatePeriod,
  createGroup,
  updateGroup,
  updateQuota,
  getAllPeriod,
  getAllGroupByYear,
  getAllQuotas,
  getQuotaById,
  deleteGroup,
  deletePeriod,
};
