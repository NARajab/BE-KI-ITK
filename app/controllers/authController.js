const axios = require("axios");
const logActivity = require("../helpers/activityLogs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Users } = require("../models");

const sendEmail = require("../../emails/services/sendMail");
const verificationMail = require("../../emails/templates/verificationMail");
const resetPasswordMail = require("../../emails/templates/resetPasswordMail");
const ApiError = require("../../utils/apiError");
const { containsProfanity, censorText } = require("../../utils/profanityFilter");

const register = async (req, res, next) => {
  const { email, fullname, password, phoneNumber, faculty, studyProgram, institution } = req.body;

  try {
    for (let key in req.body) {
      if (req.body.hasOwnProperty(key) && typeof req.body[key] === "string") {
        if (containsProfanity(req.body[key])) {
          return res.status(400).json({
            message: `Field ${key} mengandung kata yang tidak pantas.`,
          });
        }
        req.body[key] = censorText(req.body[key]);
      }
    }

    const existingUser = await Users.findOne({ where: { email } });

    if (existingUser) {
      return res.status(400).json({ message: "Email sudah terdaftar." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const emailToken = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const newUser = await Users.create({
      email,
      fullname,
      password: hashedPassword,
      phoneNumber,
      faculty,
      studyProgram,
      institution,
      emailToken,
      isVerified: false,
      role: "user",
    });

    const verificationLink = `${process.env.BASE_URL}/aktivasi-email/${emailToken}`;

    await sendEmail({
      to: email,
      subject: "Verifikasi Email Anda",
      html: verificationMail({ fullname, verificationLink }),
    });

    res.status(201).json({
      status: "success",
      message: "Pendaftaran berhasil. Email verifikasi terkirim.",
      newUser,
    });
  } catch (err) {
    next(err);
  }
};

// Login Biasa
const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await Users.findOne({ where: { email } });

    const isPasswordValid = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !isPasswordValid) {
      return next(new ApiError("Email dan password yang anda masukkan salah", 401));
    }

    if (!user.isVerified) {
      const emailToken = jwt.sign({ email }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      const verificationLink = `${process.env.BASE_URL}/aktivasi-email/${emailToken}`;

      await sendEmail({
        to: email,
        subject: "Verifikasi Email Anda",
        html: verificationMail({ fullname: user.fullname, verificationLink }),
      });

      return next(new ApiError("Email belum diverifikasi. Link verifikasi telah dikirim ulang ke email Anda.", 401));
    }
    const payload = {
      id: user.id,
      role: user.role,
      email: user.email,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "6h",
    });

    await logActivity({
      userId: user.id,
      action: "Login",
      description: `${user.fullname} berhasil login.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    return res.status(200).json({
      message: "Login berhasil",
      role: user.role,
      token,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const loginGoogle = async (req, res, next) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return next(new ApiError("Access Token is required", 400));
    }

    const response = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userInfo = response.data;
    let user = await Users.findOne({ where: { email: userInfo.email } });

    if (!user) {
      user = await Users.create({
        firebase_uid: userInfo.sub,
        email: userInfo.email,
        fullname: userInfo.name || "Unnamed User",
        image: userInfo.picture,
        phoneNumber: userInfo.phone_number || null,
        isVerified: userInfo.email_verified || true,
        role: "user",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        image: user.image,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    await logActivity({
      userId: user.id,
      action: "Login Google",
      description: `${user.fullname} berhasil login.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    return res.status(200).json({
      message: "Login berhasil",
      role: user.role,
      token,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const verifyEmail = async (req, res, next) => {
  const { emailToken } = req.params;

  if (!emailToken) {
    return res.status(400).json({ message: "Token verifikasi tidak ditemukan." });
  }

  try {
    const decoded = jwt.verify(emailToken, process.env.JWT_SECRET);

    const user = await Users.findOne({
      where: { email: decoded.email },
    });

    if (!user) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan." });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email sudah diverifikasi sebelumnya." });
    }

    user.isVerified = true;
    await user.save();

    return res.status(200).json({
      message: "Email berhasil diverifikasi. Akun Anda kini aktif.",
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: "Token tidak valid atau telah kedaluwarsa." });
  }
};

// Send Email Reset Password
const sendEmailResetPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return next(new ApiError("Email diperlukan", 400));
    }
    const user = await Users.findOne({ where: { email } });
    if (!user) {
      return next(new ApiError("Pengguna tidak ditemukan", 404));
    }

    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    await user.save();

    const resetUrl = `${process.env.BASE_URL}/reset-password/${token}`;

    await sendEmail({
      to: email,
      subject: "Reset Password",
      html: resetPasswordMail({ fullname: user.fullname, resetUrl }),
    });

    return res.status(200).json({
      message: "Link reset password telah dikirim ke email kamu.",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

// Reset Password
const resetPassword = async (req, res, next) => {
  const { token } = req.params;
  const { newPassword, confirmPassword } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Token tidak ditemukan." });
  }

  if (!newPassword) {
    return res.status(400).json({ message: "Password baru wajib diisi." });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Password baru dan konfirmasi password tidak cocok." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { email } = decoded;

    const user = await Users.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    await user.save();

    await logActivity({
      userId: user.id,
      action: "Reset Password",
      description: `${user.fullname} berhasil reset password.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({ message: "Password berhasil diubah." });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

// Get User data
const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      status: "success",
      data: {
        id: req.user.id,
        email: req.user.email,
        fullname: req.user.fullname,
        image: req.user.image,
        phoneNumber: req.user.phoneNumber,
        faculty: req.user.faculty,
        studyProgram: req.user.studyProgram,
        role: req.user.role,
      },
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  register,
  login,
  loginGoogle,
  verifyEmail,
  sendEmailResetPassword,
  resetPassword,
  getMe,
};
