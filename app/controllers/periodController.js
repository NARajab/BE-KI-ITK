const { Periods, Groups, Quotas } = require("../models");
const { Op } = require("sequelize");

const logActivity = require("../helpers/activityLogs");
const ApiError = require("../../utils/apiError");

const createPeriod = async (req, res, next) => {
  try {
    const { year } = req.body;

    const existingPeriod = await Periods.findOne({ where: { year } });
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

    const titles = ["Hak Cipta", "Patent", "Merek", "Desain Industri"];

    const quotaData = [];
    createdGroups.forEach((group) => {
      titles.forEach((title) => {
        quotaData.push({
          groupId: group.id,
          title,
          quota: 0,
          remainingQuota: 0,
        });
      });
    });

    await Quotas.bulkCreate(quotaData);

    await logActivity({
      userId: req.user.id,
      action: "Menambah Periode",
      description: `${req.user.fullname} berhasil menambah periode.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(201).json({
      status: "success",
      message:
        "Periode berhasil ditambahkan beserta 4 Gelombang dan masing-masing dengan 4 entri quota.",
      newPeriod,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updatePeriod = async (req, res, next) => {
  try {
    const { oldYear, newYear } = req.body;

    const period = await Periods.findOne({
      where: { year: oldYear },
    });

    if (!period) {
      return next(new ApiError("Periode tidak ditemukan.", 404));
    }

    const duplicate = await Periods.findOne({
      where: {
        year: newYear,
        id: { [Op.ne]: period.id },
      },
    });

    if (duplicate) {
      return next(new ApiError("Periode dengan tahun ini sudah ada.", 400));
    }

    await Periods.update({ year: newYear }, { where: { year: oldYear } });

    await logActivity({
      userId: req.user.id,
      action: "Mengubah Periode",
      description: `${req.user.fullname} berhasil memperbaharui periode.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

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

    await logActivity({
      userId: req.user.id,
      action: "Menambah Gelombang",
      description: `${req.user.fullname} berhasil menambah gelombang.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
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

    await logActivity({
      userId: req.user.id,
      action: "Mengubah Periode",
      description: `${req.user.fullname} berhasil memperbaharui periode.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

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
    const { quota, remainingQuota } = req.body;

    const kuota = await Quotas.findByPk(id);

    if (!kuota) {
      return next(new ApiError("Quota tidak ditemukan.", 404));
    }

    await kuota.update({
      quota,
      remainingQuota,
    });

    await logActivity({
      userId: req.user.id,
      action: "Mengubah Kuota",
      description: `${req.user.fullname} berhasil memperbaharui kuota.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Kuota berhasil diperbarui",
      kuota,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllGroupByYear = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    const offset = (page - 1) * limit;

    const { count, rows: groups } = await Groups.findAndCountAll({
      limit,
      offset,
      order: [["id", "ASC"]],
      where: {
        periodId: req.params.id,
      },
    });

    res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalPeriods: count,
      limit: limit,
      groups,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};
const getAllGroupByYearwtoPagination = async (req, res, next) => {
  try {
    const currentYear = new Date().getFullYear().toString(); // ubah ke string

    const groups = await Groups.findAll({
      include: [
        {
          model: Periods,
          as: "period",
          where: {
            year: currentYear,
          },
        },
      ],
      order: [["id", "ASC"]],
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

    const offset = (page - 1) * limit;

    const { count, rows: periods } = await Periods.findAndCountAll({
      limit,
      offset,
      order: [["year", "DESC"]],
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

const getGroup = async (req, res, next) => {
  try {
    const { id } = req.params;

    const group = await Groups.findOne({ where: { id } });

    if (!group) {
      return next(new ApiError("Gelombang tidak ditemukan.", 404));
    }

    res.status(200).json({
      status: "success",
      group,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getGroupById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    const group = await Groups.findOne({ where: { id } });
    if (!group) {
      return next(new ApiError("Gelombang tidak ditemukan.", 404));
    }

    const totalQuota = await Quotas.count({
      where: { groupId: id },
    });

    const offset = (page - 1) * limit;

    const quotas = await Quotas.findAll({
      where: { groupId: id },
      limit,
      offset,
      order: [["id", "ASC"]],
    });

    res.status(200).json({
      status: "success",
      group,
      quota: quotas,
      currentPage: page,
      totalPages: Math.ceil(totalQuota / limit),
      totalQuota,
      limit,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllQuotas = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    const offset = (page - 1) * limit;

    const { count, rows: quotas } = await Quotas.findAndCountAll({
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
const getQuotaByIdGroup = async (req, res, next) => {
  try {
    const { id } = req.params;

    const quotas = await Quotas.findAll({
      where: { groupId: id },
    });

    if (!quotas || quotas.length === 0) {
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

const getAll = async (req, res, next) => {
  try {
    const periods = await Periods.findAll({
      order: [["id", "ASC"]],
      include: [
        {
          model: Groups,
          as: "group",
          separate: true,
          order: [["id", "ASC"]],
          include: [
            {
              model: Quotas,
              as: "quota",
            },
          ],
        },
      ],
    });

    res.status(200).json({
      status: "success",
      periods,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllByThisYear = async (req, res, next) => {
  try {
    const currentYear = new Date().getFullYear().toString();
    const periods = await Periods.findAll({
      where: { year: currentYear },
      order: [["id", "ASC"]],
      include: [
        {
          model: Groups,
          as: "group",
          separate: true,
          order: [["id", "ASC"]],
          include: [
            {
              model: Quotas,
              as: "quota",
            },
          ],
        },
      ],
    });

    res.status(200).json({
      status: "success",
      periods,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const restoreGroup = async (req, res, next) => {
  try {
    const { id } = req.params;

    const group = await Groups.findOne({
      where: { id },
      paranoid: false,
    });

    if (!group) {
      return next(new ApiError("Gelombang tidak ditemukan.", 404));
    }

    const quotas = await Quotas.findAll({
      where: { groupId: id },
      paranoid: false,
    });

    for (const quota of quotas) {
      await quota.restore();
    }

    await group.restore();

    await logActivity({
      userId: req.user.id,
      action: "Mengembalikan Gelombang",
      description: `${req.user.fullname} berhasil mengembalikan gelombang.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Gelombang dan quota terkait berhasil dikembalikan",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const restorePeriod = async (req, res, next) => {
  try {
    const { id } = req.params;

    const period = await Periods.findOne({
      where: { id },
      paranoid: false,
    });

    if (!period) {
      return next(
        new ApiError("Periode dengan ID tersebut tidak ditemukan.", 404)
      );
    }

    const groups = await Groups.findAll({
      where: { periodId: id },
      paranoid: false,
    });

    for (const group of groups) {
      const quotas = await Quotas.findAll({
        where: { groupId: group.id },
        paranoid: false,
      });
      for (const quota of quotas) {
        await quota.restore();
      }
    }

    for (const group of groups) {
      await group.restore();
    }

    await period.restore();

    await logActivity({
      userId: req.user.id,
      action: "Mengembalikan Periode",
      description: `${req.user.fullname} berhasil mengembalikan periode.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Periode dan semua data terkait berhasil dikembalikan.",
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

    await logActivity({
      userId: req.user.id,
      action: "Menghapus Gelombang",
      description: `${req.user.fullname} berhasil menghapus gelombang.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

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

    for (const group of groups) {
      const quotas = await Quotas.findAll({ where: { groupId: group.id } });
      for (const quota of quotas) {
        await quota.destroy();
      }
    }

    for (const group of groups) {
      await group.destroy();
    }

    await period.destroy();

    await logActivity({
      userId: req.user.id,
      action: "Menghapus Periode",
      description: `${req.user.fullname} berhasil menghapus periode.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

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
  getAllGroupByYearwtoPagination,
  getGroup,
  getGroupById,
  getAllQuotas,
  getQuotaById,
  getQuotaByIdGroup,
  getAll,
  getAllByThisYear,
  restorePeriod,
  restoreGroup,
  deleteGroup,
  deletePeriod,
};
