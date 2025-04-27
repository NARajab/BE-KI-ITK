const { Users } = require("../models");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

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

    if (limit <= 0) {
      const users = await Users.findAll();
      return res.status(200).json({
        status: "success",
        totalUsers: users.length,
        users,
      });
    }

    const offset = (page - 1) * limit;

    const { count, rows: users } = await Users.findAndCountAll({
      limit,
      offset,
    });

    return res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalUsers: count,
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
    return res.status(200).json({ message: "Pengguna berhasil diperbaharui" });
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
    return res.status(200).json({ message: "Penggunas berhasil dihapus" });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
