const { Users } = require("../models");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");

const logActivity = require("../helpers/activityLogs");
const ApiError = require("../../utils/apiError");
const { containsProfanity } = require("../../utils/profanityFilter");

const createUser = async (req, res, next) => {
  try {
    const {
      fullname,
      email,
      faculty,
      studyProgram,
      institution,
      phoneNumber,
      role,
    } = req.body;

    const existingUser = await Users.findOne({ where: { email } });
    if (existingUser) {
      return next(new ApiError("Email sudah terdaftar", 400));
    }

    const defaultPassword = process.env.PASSWORD_HASH_USER;

    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const image = req.file || null;

    const user = await Users.create({
      fullname,
      email,
      password: hashedPassword,
      faculty,
      studyProgram,
      institution,
      image: image ? image.filename : null,
      isVerified: true,
      phoneNumber,
      role,
    });

    await logActivity({
      userId: req.user.id,
      action: "Menambah Pengguna Baru",
      description: `${req.user.fullname} berhasil menambah pengguna baru.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    return res.status(201).json({
      status: "success",
      user,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    const search = req.query.search?.trim() || "";

    const offset = (page - 1) * limit;

    const whereCondition = search
      ? {
          [Op.or]: [
            { email: { [Op.iLike]: `%${search}%` } },
            { fullname: { [Op.iLike]: `%${search}%` } },
            { institution: { [Op.iLike]: `%${search}%` } },
            { role: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : {};

    const { count, rows } = await Users.findAndCountAll({
      limit,
      offset,
      where: whereCondition,
      order: [["id", "ASC"]],
    });

    const users = rows.map((user) => {
      const userData = user.toJSON();
      delete userData.password;
      return userData;
    });

    return res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalUsers: count,
      limit: limit,
      users,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await Users.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }
    return res.status(200).json({
      status: "success",
      user,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllUserReviewer = async (req, res, next) => {
  try {
    const users = await Users.findAll({ where: { role: "reviewer" } });
    return res.status(200).json({
      status: "success",
      users,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await Users.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }

    const fieldsToCheck = [
      "fullname",
      "faculty",
      "studyProgram",
      "institution",
    ];
    for (const field of fieldsToCheck) {
      if (req.body[field] && containsProfanity(req.body[field])) {
        return res.status(400).json({
          message: `Field '${field}' mengandung kata yang tidak pantas.`,
        });
      }
    }

    if (req.file) {
      if (user.image) {
        const oldImagePath = path.join(
          __dirname,
          "../../uploads/image/",
          user.image
        );
        fs.unlink(oldImagePath, (err) => {
          if (err) {
            console.error("Gagal menghapus gambar lama:", err.message);
          }
        });
      }

      req.body.image = req.file.filename;
    }

    await user.update(req.body);

    await logActivity({
      userId: req.user.id,
      action: "Mengubah Data Pengguna",
      description: `${req.user.fullname} berhasil memperbaharui data pengguna.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    return res.status(200).json({ message: "Pengguna berhasil diperbaharui" });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { id } = req.user;
    const user = await Users.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }

    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword) {
      return res.status(400).json({ message: "Password lama wajib diisi." });
    }

    if (!newPassword) {
      return res.status(400).json({ message: "Password baru wajib diisi." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "Password baru dan konfirmasi password tidak cocok.",
      });
    }

    const passwordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: "Password lama salah." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    await logActivity({
      userId: req.user.id,
      action: "Mengubah Password Pengguna",
      description: `${req.user.fullname} berhasil memperbaharui password pengguna.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    return res.status(200).json({ message: "Password berhasil diperbaharui" });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await Users.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }
    await user.destroy();

    await logActivity({
      userId: req.user.id,
      action: "Menghapus Pengguna",
      description: `${req.user.fullname} berhasil menghapus pengguna.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    return res.status(200).json({ message: "Penggunas berhasil dihapus" });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const restoreUser = async (req, res, next) => {
  try {
    const user = await Users.findOne({
      where: {
        id: req.params.id,
      },
      paranoid: false,
    });

    if (!user) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }

    if (!user.deletedAt) {
      return res.status(400).json({ message: "Pengguna belum dihapus" });
    }

    await user.restore();

    await logActivity({
      userId: req.user.id,
      action: "Merestore Pengguna",
      description: `${req.user.fullname} berhasil merestore pengguna dengan nama ${user.fullname}.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    return res.status(200).json({ message: "Pengguna berhasil dipulihkan" });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  getAllUserReviewer,
  updateUser,
  changePassword,
  deleteUser,
  restoreUser,
};
