const { admin, client } = require("../../config/firebase");
const { Users } = require("../models");

const ApiError = require("../../utils/apiError");

const registerWithEmail = async (req, res, next) => {
  const { email, password, name } = req.body;

  try {
    // Cek apakah email sudah ada di database lokal kamu
    const existingUser = await Users.findOne({ where: { email } });

    if (existingUser) {
      return res.status(400).json({
        message: "Email sudah terdaftar di sistem.",
      });
    }

    // Buat user di Firebase
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Simpan user ke database lokal
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

const registerWithGoogle = async (req, res, next) => {
  const { idToken } = req.body;

  try {
    // Verifikasi idToken yang datang dari client
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    const { uid, name, email } = decodedToken;

    let user = await Users.findOne({ where: { firebase_uid: uid } });

    if (!user) {
      // Kalau belum ada, simpan user ke DB kamu
      user = await Users.create({ firebase_uid: uid, fullname: name, email });
    }

    res.status(200).json({
      message: "Pengguna telah mendaftar atau login menggunakan akun Google",
      user,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const login = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      throw new ApiError("ID Token is required", 400);
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);

    const { uid } = decodedToken;

    const userRecord = await admin.auth().getUser(uid);

    let user = await Users.findOne({ where: { firebase_uid: uid } });

    // Kalau belum ada, simpan user baru
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

    // Kirim respon dengan data user
    return res.status(200).json({
      message: "Login berhasil",
      user,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = { registerWithEmail, registerWithGoogle, login };
