const { admin, client } = require("../../config/firebase");
const bcrypt = require("bcrypt");
const sendEmail = require("../../utils/sendMail");
const jwt = require("jsonwebtoken");
const { Users } = require("../models");

const ApiError = require("../../utils/apiError");
const {
  containsProfanity,
  censorText,
} = require("../../utils/profanityFilter");

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

    const verificationLink = `${process.env.BASE_URL}/auth/verify-email/${emailToken}`;

    const emailContent = `
      <html>
        <head>
          <style>
            .email-container {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              padding: 20px;
              border-radius: 10px;
              max-width: 600px;
              margin: 0 auto;
            }
            .email-header {
              text-align: center;
              padding-bottom: 20px;
            }
            .email-content {
              background-color: #fff;
              padding: 20px;
              border-radius: 10px;
            }
            .email-button {
              display: block;
              width: 200px;
              margin: 20px auto;
              padding: 10px 0;
              background-color: #007bff;
              color: #fff;
              text-align: center;
              border-radius: 5px;
              text-decoration: none;
            }
            .email-footer {
              text-align: center;
              font-size: 12px;
              color: #888;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="email-header">
              <h2>Verify Your Account</h2>
            </div>
            <div class="email-content">
              <p>Halo ${fullname},</p>
              <p>Thank you for registering. Please click the button below to verify your account:</p>
              <a href="${verificationLink}" class="email-button">Verify Account</a>
              <p>If you did not register, please ignore this email.</p>
              <p>Thank you,</p>
              <p>Support Team</p>
            </div>
            <div class="email-footer">
              <p>&copy; 2025 KI-ITK. All rights reserved.</p>
            </div>
          </div>
        </body
    `;

    await sendEmail({
      to: email,
      subject: "Verifikasi Email Anda",
      html: emailContent,
    });

    res.status(201).json({
      status: "success",
      message: "Register success. Verification email sent.",
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
    console.log(userRecord);

    let user = await Users.findOne({ where: { firebase_uid: uid } });

    if (!user) {
      user = await Users.create({
        firebase_uid: uid,
        email: userRecord.email,
        fullname: userRecord.displayName || "Unnamed User",
        image: userRecord.photoURL,
        phoneNumber: userRecord.phoneNumber,
        isVerified: true,
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
        faculty: user.faculty,
        studyProgram: user.studyProgram,
        institution: user.institution,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    return res.status(200).json({
      message: "Login berhasil",
      user,
      token,
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
      html: `
        <html>
          <head>
            <style>
              .email-container {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
                padding: 20px;
                border-radius: 10px;
                max-width: 600px;
                margin: 0 auto;
              }
              .email-header {
                text-align: center;
                padding-bottom: 20px;
              }
              .email-content {
                background-color: #fff;
                padding: 20px;
                border-radius: 10px;
              }
              .email-button {
                display: block;
                width: 200px;
                margin: 20px auto;
                padding: 10px 0;
                background-color: #007bff;
                color: #fff;
                text-align: center;
                border-radius: 5px;
                text-decoration: none;
              }
              .email-footer {
                text-align: center;
                font-size: 12px;
                color: #888;
                padding-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="email-header">
                <h2>Reset Password</h2>
              </div>
              <div class="email-content">
                <p>Halo ${user.fullname},</p>
                <p>Anda telah meminta untuk mengatur ulang kata sandi Anda. Klik tombol di bawah ini untuk mengatur ulang kata sandi Anda:</p>
                <a href="${resetUrl}" class="email-button">Atur Ulang Kata Sandi</a>
                <p>Jika Anda tidak meminta pengaturan ulang kata sandi, abaikan email ini.</p>
                <p><b>Catatan:</b> Email ini hanya berlaku selama 1 jam.</p>
                <p>Terima kasih,</p>
                <p>Tim Support</p>
              </div>
              <div class="email-footer">
                <p>&copy; 2025 KI-ITK. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
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
    return res
      .status(400)
      .json({ message: "Password baru dan konfirmasi password tidak cocok." });
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
