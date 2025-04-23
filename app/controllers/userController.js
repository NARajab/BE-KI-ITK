const { Users } = require("../models");
const fs = require("fs");
const path = require("path");

const ApiError = require("../../utils/apiError");
const { containsProfanity } = require("../../utils/profanityFilter");

const getAllUsers = async (req, res, next) => {
  try {
    const users = await Users.findAll();
    return res.status(200).json({
      status: "success",
      users,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await Users.findByPk(req.user.id);
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

const updateRoleUser = async (req, res, next) => {
  const { role } = req.body;
  try {
    const user = await Users.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }

    await user.update(role);

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
  getAllUsers,
  getUserById,
  updateUser,
  updateRoleUser,
  deleteUser,
};
