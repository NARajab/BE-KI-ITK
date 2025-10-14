const { CentralStatus } = require("../models");

const logActivity = require("../helpers/activityLogs");
const ApiError = require("../../utils/apiError");

const createCentralStatus = async (req, res, next) => {
  try {
    const { name, type } = req.body;

    await CentralStatus.create({
      name,
      type,
    });

    await logActivity({
      //   userId: req.user.id,
      action: "Membuat Status Pengajuan",
      //   description: `${req.user.fullname} berhasil membuat status pengajuan.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    return res.status(200).json({
      status: "success",
      message: "Status pengajuan berhasil ditambahkan",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updateCentralStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;
    const centralStatus = await CentralStatus.findByPk(id);
    if (!centralStatus) {
      return next(new ApiError("Status pengajuan tidak ditemukan", 404));
    }
    await centralStatus.update({
      name,
      type,
    });
    await logActivity({
      //   userId: req.user.id,
      action: "Mengubah Status Pengajuan",
      //   description: `${req.user.fullname} berhasil membuat status pengajuan.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });
    return res.status(200).json({
      status: "success",
      message: "Status pengajuan berhasil diperbarui",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const deleteCentralStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const centralStatus = await CentralStatus.findByPk(id);
    if (!centralStatus) {
      return next(new ApiError("Status pengajuan tidak ditemukan", 404));
    }
    await centralStatus.destroy();
    await logActivity({
      //   userId: req.user.id,
      action: "Menghapus Status Pengajuan",
      //   description: `${req.user.fullname} berhasil membuat status pengajuan.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });
    return res.status(200).json({
      status: "success",
      message: "Status pengajuan berhasil dihapus",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllCentralStatus = async (req, res, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    let result;

    if (page) {
      const offset = (page - 1) * limit;
      const { count, rows } = await CentralStatus.findAndCountAll({
        limit,
        offset,
        order: [["id", "ASC"]],
      });

      result = {
        status: "success",
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalData: count,
          limit: limit,
        },
        data: rows,
      };
    } else {
      const data = await CentralStatus.findAll({
        order: [["id", "ASC"]],
      });

      result = {
        status: "success",
        totalData: data.length,
        data,
      };
    }

    res.status(200).json(result);
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getCentralStatusById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const centralStatus = await CentralStatus.findByPk(id);
    if (!centralStatus) {
      return next(new ApiError("Status pengajuan tidak ditemukan", 404));
    }
    return res.status(200).json({
      status: "success",
      centralStatus,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getCentralStatusByType = async (req, res, next) => {
  try {
    const { type } = req.params;
    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    if (page) {
      const offset = (page - 1) * limit;

      const { count, rows } = await CentralStatus.findAndCountAll({
        where: { type },
        limit,
        offset,
        order: [["id", "ASC"]],
      });

      if (count === 0) {
        return next(new ApiError("Status pengajuan tidak ditemukan", 404));
      }

      return res.status(200).json({
        status: "success",
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalData: count,
          limit,
        },
        data: rows,
      });
    }

    const data = await CentralStatus.findAll({
      where: { type },
      order: [["id", "ASC"]],
    });

    if (!data || data.length === 0) {
      return next(new ApiError("Status pengajuan tidak ditemukan", 404));
    }

    return res.status(200).json({
      status: "success",
      totalData: data.length,
      data,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  createCentralStatus,
  updateCentralStatus,
  deleteCentralStatus,
  getAllCentralStatus,
  getCentralStatusById,
  getCentralStatusByType,
};
