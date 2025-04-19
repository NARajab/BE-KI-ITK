const { admin, client } = require("../../config/firebase");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const { Users } = require("../models");

const ApiError = require("../../utils/apiError");

// Regiister Biasa
const register = async (req, res, next) => {
  const {
    email,
    fullname,
    password,
    phoneNumber,
    faculty,
    studyProgram,
    institution,
  } = req.body;

  try {
    const existingUser = await Users.findOne({ where: { email } });

    if (existingUser) {
      return res.status(400).json({ message: "Email sudah terdaftar." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const emailToken = jwt.sign({ email: email }, process.env.JWT_SECRET, {
      expiresIn: "1d",
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
      role: "User",
    });

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const verificationLink = `${process.env.BASE_URL}/auth/verify-email/${emailToken}`;

    const mailOptions = {
      from: `"Admin" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verifikasi Email Anda",
      html: `<p>Halo ${fullname},</p>
             <p>Silakan klik link berikut untuk verifikasi email Anda:</p>
             <a href="${verificationLink}">${verificationLink}</a>`,
    };

    transporter.sendMail(mailOptions, async (error, info) => {
      if (error) {
        console.error(error);
        return res
          .status(500)
          .json({ message: "Failed to send verification email" });
      }

      res.status(201).json({
        status: "success",
        message: "Register success. Verification email sent.",
        newUser,
      });
    });
  } catch (err) {
    next(err);
  }
};

// Register ke firebase
const registerWithEmail = async (req, res, next) => {
  const { email, password, name } = req.body;

  try {
    const existingUser = await Users.findOne({ where: { email } });

    if (existingUser) {
      return res.status(400).json({
        message: "Email sudah terdaftar di sistem.",
      });
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    await Users.create({
      uid: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName,
    });

    res.status(201).json({
      message: "Pendaftaran berhasil",
      user: userRecord,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

// Login Biasa
const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await Users.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: "Email belum diverifikasi" });
    }

    if (user && bcrypt.compareSync(password, user.password)) {
      const payload = {
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        image: user.image,
        phoneNumber: user.phoneNumber,
        faculty: user.faculty,
        studyProgram: user.studyProgram,
        institution: user.institution,
        phoneNumber: user.phoneNumber,
        role: user.role,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET);

      return res.status(200).json({
        message: "Login berhasil",
        payload,
        token,
      });
    } else {
      return next(new ApiError("Password salah", 401));
    }
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

// Login Google
const loginGoogle = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      throw new ApiError("ID Token is required", 400);
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);

    const { uid } = decodedToken;

    const userRecord = await admin.auth().getUser(uid);

    let user = await Users.findOne({ where: { firebase_uid: uid } });

    if (!user) {
      user = await Users.create({
        firebase_uid: uid,
        // email,
        fullname: userRecord.displayName || "Unnamed User",
        image: userRecord.photoURL,
        phoneNumber: userRecord.phoneNumber,
        role: "user",
      });
    }
    return res.status(200).json({
      message: "Login berhasil",
      user,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const verifyEmail = async (req, res, next) => {
  const { emailToken } = req.params;

  if (!emailToken) {
    return res
      .status(400)
      .json({ message: "Token verifikasi tidak ditemukan." });
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
      return res
        .status(400)
        .json({ message: "Email sudah diverifikasi sebelumnya." });
    }

    user.isVerified = true;
    await user.save();

    return res.status(200).json({
      message: "Email berhasil diverifikasi. Akun Anda kini aktif.",
    });
  } catch (err) {
    console.error(err);
    return res
      .status(400)
      .json({ message: "Token tidak valid atau telah kedaluwarsa." });
  }
};

module.exports = {
  registerWithEmail,
  register,
  login,
  loginGoogle,
  verifyEmail,
};
