jest.mock("firebase-admin");
jest.mock("nodemailer");
jest.mock("jsonwebtoken");
jest.mock("../app/helpers/activityLogs", () => jest.fn());
jest.mock("../emails/services/sendMail");
jest.mock("../app/models");

const { Users } = require("../app/models");
const app = require("../app/index");
const sendEmail = require("../emails/services/sendMail");
const request = require("supertest");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { loginGoogle } = require("../app/controllers/authController");
const admin = require("firebase-admin");
const logActivity = require("../app/helpers/activityLogs");

describe("GET /api/v1/auth/me", () => {
  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash("Kiadmin123", 10);
    const mockUser = {
      id: 1,
      email: "user@superadmin.com",
      fullname: "User",
      image: "image.jpg",
      phoneNumber: "08123456789",
      faculty: "Engineering",
      studyProgram: "Computer Science",
      role: "user",
      isVerified: true,
      password: hashedPassword,
    };

    Users.create = jest.fn().mockResolvedValue(mockUser);
    Users.findOne = jest.fn().mockImplementation(({ where }) => {
      if (where.email === "user@superadmin.com") {
        return Promise.resolve(mockUser);
      }
      return Promise.resolve(null);
    });
    Users.findByPk = jest.fn().mockResolvedValue(mockUser);
    jwt.sign = jest.fn(() => "dummy-token");
    jwt.verify = jest.fn(() => ({
      id: 1,
      email: "user@superadmin.com",
      role: "user",
    }));
  });

  it("should login first, then return user profile data successfully", async () => {
    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: "user@superadmin.com",
      password: "Kiadmin123",
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toHaveProperty("token");
    const token = loginResponse.body.token;

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      data: {
        id: expect.any(Number),
        email: "user@superadmin.com",
        fullname: "User",
        image: "image.jpg",
        phoneNumber: "08123456789",
        faculty: "Engineering",
        studyProgram: "Computer Science",
        role: "user",
      },
    });
  });
});

describe("POST /api/v1/auth/register", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should register a new user and send a verification email", async () => {
    const newUser = {
      email: "123user@example.com",
      fullname: "example User",
      password: "Password123!",
      phoneNumber: "1234567890",
      faculty: "Engineering",
      studyProgram: "Computer Science",
      institution: "University XYZ",
    };

    Users.create.mockResolvedValue({
      id: 1,
      email: newUser.email,
      fullname: newUser.fullname,
      isVerified: false,
      ...newUser,
    });

    Users.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 1,
      email: newUser.email,
      fullname: newUser.fullname,
      isVerified: false,
      ...newUser,
    });

    sendEmail.mockResolvedValue(true);

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(newUser);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe(
      "Pendaftaran berhasil. Email verifikasi terkirim."
    );

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: newUser.email,
        subject: "Verifikasi Email Anda",
        html: expect.stringContaining("/verify-email/"),
      })
    );
  });

  it("should return an error if the email is already registered", async () => {
    const existingUser = {
      email: "user@example.com",
      fullname: "exampel User",
      password: "Password123!",
      phoneNumber: "1234567890",
      faculty: "Engineering",
      studyProgram: "Computer Science",
      institution: "University XYZ",
      isVerified: false,
      role: "user",
    };

    Users.findOne.mockResolvedValue(existingUser);

    const response = await request(app).post("/api/v1/auth/register").send({
      email: "user@example.com",
      fullname: "exampel User",
      password: "Password123!",
      phoneNumber: "1234567890",
      faculty: "Engineering",
      studyProgram: "Computer Science",
      institution: "University XYZ",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Email sudah terdaftar.");
  });

  it("should return an error if there is profanity in the fields", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({
      email: "user@example.com",
      fullname: "Test BadWord",
      password: "Password123!",
      phoneNumber: "1234567890",
      faculty: "Engineering",
      studyProgram: "Computer Science",
      institution: "University XYZ",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Field fullname mengandung kata yang tidak pantas."
    );
  });
});

describe("POST /api/v1/auth/login", () => {
  let user;

  beforeEach(() => {
    user = {
      id: 1,
      email: "testuser@example.com",
      password: "$2a$10$V3W.e5H71/hfs0c3NRpaOCOATfGzQYFJhOXxk19id81FuIqZC3OLu", // Hash for 'password123'
      role: "user",
      isVerified: true,
      fullname: "Test User",
    };

    Users.findOne = jest.fn();
    bcrypt.compare = jest.fn();
    jwt.sign = jest.fn();
    logActivity.mockResolvedValue();
  });

  it("should return 401 if user not found", async () => {
    Users.findOne.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "notfound@example.com", password: "password123" });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe(
      "Email dan password yang anda masukkan salah"
    );
  });

  it("should return 401 if password is incorrect", async () => {
    Users.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(false);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: "wrongpassword" });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe(
      "Email dan password yang anda masukkan salah"
    );
  });

  it("should return 401 if email is not verified", async () => {
    Users.findOne.mockResolvedValue({ ...user, isVerified: false });
    bcrypt.compare.mockResolvedValue(true);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: "password123" });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe(
      "Email belum diverifikasi. Link verifikasi telah dikirim ulang ke email Anda."
    );
  });

  it("should return 200 and a token if login is successful", async () => {
    Users.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue("mock-jwt-token");

    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("User-Agent", "jest-agent")
      .send({ email: user.email, password: "password123" });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Login berhasil");
    expect(response.body.token).toBe("mock-jwt-token");
    expect(response.body.role).toBe("user");

    expect(logActivity).toHaveBeenCalledWith({
      userId: user.id,
      action: "Login",
      description: `${user.fullname} berhasil login.`,
      device: "jest-agent",
      ipAddress: expect.any(String),
    });
  });
});

describe("POST /api/v1/auth/login-google", () => {
  it("should return 200 and a token if login is successful", async () => {
    const idToken = "mock-id-token";
    const decodedToken = { uid: "mock-uid" };
    const userRecord = {
      email: "testuser@example.com",
      displayName: "Test User",
      photoURL: "http://example.com/photo.jpg",
      phoneNumber: "1234567890",
    };

    const user = {
      id: 1,
      firebase_uid: "mock-uid",
      email: "testuser@example.com",
      fullname: "Test User",
      image: "http://example.com/photo.jpg",
      phoneNumber: "1234567890",
      isVerified: true,
      role: "user",
    };

    admin.auth = jest.fn().mockReturnValue({
      verifyIdToken: jest.fn().mockResolvedValue(decodedToken),
      getUser: jest.fn().mockResolvedValue(userRecord),
    });

    Users.findOne.mockResolvedValue(null);
    Users.create.mockResolvedValue(user);
    jwt.sign.mockReturnValue("mock-jwt-token");

    logActivity.mockResolvedValue();

    const response = await request(app)
      .post("/api/v1/auth/login-google")
      .send({ idToken })
      .expect(200);

    expect(response.body.message).toBe("Login berhasil");
    expect(response.body.token).toBe("mock-jwt-token");

    expect(Users.findOne).toHaveBeenCalledWith({
      where: { firebase_uid: "mock-uid" },
    });

    expect(Users.create).toHaveBeenCalledWith({
      firebase_uid: "mock-uid",
      email: "testuser@example.com",
      fullname: "Test User",
      image: "http://example.com/photo.jpg",
      phoneNumber: "1234567890",
      isVerified: true,
      role: "user",
    });

    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        image: user.image,
        phoneNumber: user.phoneNumber,
        role: user.role,
      }),
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const device = "mock-device";
    const ipAddress = "::ffff:127.0.0.1";

    const mockReq = {
      body: { idToken },
      headers: { "user-agent": device },
      ip: ipAddress,
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    await loginGoogle(mockReq, mockRes);

    expect(logActivity).toHaveBeenCalledWith({
      userId: user.id,
      action: "Login Google",
      description: `${user.fullname} berhasil login.`,
      device: device,
      ipAddress: ipAddress,
    });
  });

  it("should return 400 if idToken is not provided", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login-google")
      .send({})
      .expect(400);

    expect(response.body.message).toBe("ID Token is required");
  });

  it("should return 500 if there is an error during login", async () => {
    admin.auth().verifyIdToken.mockRejectedValue(new Error("Firebase error"));

    const response = await request(app)
      .post("/api/v1/auth/login-google")
      .send({ idToken: "mock-id-token" })
      .expect(500);

    expect(response.body.message).toBe("Firebase error");
  });
});

describe("GET /api/v1/auth/verify-email/:emailToken", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it("should verify email successfully with valid token", async () => {
    const mockEmail = "test@example.com";
    const mockUser = {
      email: mockEmail,
      isVerified: false,
      save: jest.fn(),
    };

    jwt.verify.mockReturnValue({ email: mockEmail });
    Users.findOne.mockResolvedValue(mockUser);

    const response = await request(app)
      .get("/api/v1/auth/verify-email/valid-token")
      .expect(200);

    expect(response.body.message).toBe(
      "Email berhasil diverifikasi. Akun Anda kini aktif."
    );
    expect(mockUser.save).toHaveBeenCalled();
  });

  it("should return 400 if token is invalid or expired", async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error("invalid token");
    });

    const response = await request(app)
      .get("/api/v1/auth/verify-email/invalid-token")
      .expect(400);

    expect(response.body.message).toBe(
      "Token tidak valid atau telah kedaluwarsa."
    );
  });

  it("should return 404 if user is not found", async () => {
    const mockEmail = "notfound@example.com";

    jwt.verify.mockReturnValue({ email: mockEmail });
    Users.findOne.mockResolvedValue(null);

    const response = await request(app)
      .get("/api/v1/auth/verify-email/valid-token")
      .expect(404);

    expect(response.body.message).toBe("Pengguna tidak ditemukan.");
  });

  it("should return 400 if user is already verified", async () => {
    const mockEmail = "verified@example.com";
    const mockUser = {
      email: mockEmail,
      isVerified: true,
    };

    jwt.verify.mockReturnValue({ email: mockEmail });
    Users.findOne.mockResolvedValue(mockUser);

    const response = await request(app)
      .get("/api/v1/auth/verify-email/valid-token")
      .expect(400);

    expect(response.body.message).toBe("Email sudah diverifikasi sebelumnya.");
  });

  it("should return 400 if emailToken param is missing", async () => {
    const { verifyEmail } = require("../app/controllers/authController");

    const req = { params: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await verifyEmail(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Token verifikasi tidak ditemukan.",
    });
  });
});

describe("POST /api/v1/auth/send-email-reset-password", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should send reset email successfully if email exists", async () => {
    const mockEmail = "user@example.com";
    const mockUser = {
      email: mockEmail,
      fullname: "Test User",
      save: jest.fn(),
    };

    Users.findOne.mockResolvedValue(mockUser);
    jwt.sign.mockReturnValue("mock-token");
    sendEmail.mockResolvedValue();

    const response = await request(app)
      .post("/api/v1/auth/send-email-reset-password")
      .send({ email: mockEmail })
      .expect(200);

    expect(response.body.message).toBe(
      "Link reset password telah dikirim ke email kamu."
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: mockEmail,
        subject: "Reset Password",
        html: expect.stringContaining("/reset-password/mock-token"),
      })
    );
  });

  it("should return 400 if email is not provided", async () => {
    const response = await request(app)
      .post("/api/v1/auth/send-email-reset-password")
      .send({})
      .expect(400);

    expect(response.body.message).toBe("Email diperlukan");
  });

  it("should return 404 if user is not found", async () => {
    Users.findOne.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/v1/auth/send-email-reset-password")
      .send({ email: "notfound@example.com" })
      .expect(404);

    expect(response.body.message).toBe("Pengguna tidak ditemukan");
  });

  it("should return 500 if something fails inside try block", async () => {
    Users.findOne.mockImplementation(() => {
      throw new Error("Unexpected error");
    });

    const response = await request(app)
      .post("/api/v1/auth/send-email-reset-password")
      .send({ email: "error@example.com" })
      .expect(500);

    expect(response.body.message).toBe("Unexpected error");
  });
});

describe("POST /api/v1/auth/reset-password/:token", () => {
  const validToken = "valid-token";
  const decodedPayload = { email: "user@example.com" };
  const mockUser = {
    id: 1,
    email: "user@example.com",
    fullname: "Test User",
    password: "oldpasswordhash",
    save: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 if token is missing", async () => {
    const response = await request(app)
      .post("/api/v1/auth/reset-password/")
      .send({ newPassword: "newpass123", confirmPassword: "newpass123" });

    expect(response.status).toBe(404);
  });

  it("should return 400 if newPassword is missing", async () => {
    const response = await request(app)
      .post(`/api/v1/auth/reset-password/${validToken}`)
      .send({ confirmPassword: "newpass123" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Password baru wajib diisi.");
  });

  it("should return 400 if newPassword and confirmPassword do not match", async () => {
    const response = await request(app)
      .post(`/api/v1/auth/reset-password/${validToken}`)
      .send({ newPassword: "newpass123", confirmPassword: "differentpass" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Password baru dan konfirmasi password tidak cocok."
    );
  });

  it("should return 404 if user not found", async () => {
    jwt.verify = jest.fn().mockReturnValue(decodedPayload);
    Users.findOne = jest.fn().mockResolvedValue(null);

    const response = await request(app)
      .post(`/api/v1/auth/reset-password/${validToken}`)
      .send({ newPassword: "newpass123", confirmPassword: "newpass123" });

    expect(jwt.verify).toHaveBeenCalledWith(validToken, process.env.JWT_SECRET);
    expect(Users.findOne).toHaveBeenCalledWith({
      where: { email: decodedPayload.email },
    });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Pengguna tidak ditemukan.");
  });

  it("should reset password successfully and log activity", async () => {
    jwt.verify = jest.fn().mockReturnValue(decodedPayload);
    Users.findOne = jest.fn().mockResolvedValue(mockUser);
    bcrypt.hash = jest.fn().mockResolvedValue("hashedNewPassword");
    mockUser.save = jest.fn().mockResolvedValue();
    logActivity.mockResolvedValue();

    const device = "mock-device";
    const ipAddress = "::ffff:127.0.0.1";

    const response = await request(app)
      .post(`/api/v1/auth/reset-password/${validToken}`)
      .set("user-agent", device) // <- ini penting supaya req.headers['user-agent'] ada
      .send({ newPassword: "newpass123", confirmPassword: "newpass123" });

    expect(jwt.verify).toHaveBeenCalledWith(validToken, process.env.JWT_SECRET);
    expect(Users.findOne).toHaveBeenCalledWith({
      where: { email: decodedPayload.email },
    });
    expect(bcrypt.hash).toHaveBeenCalledWith("newpass123", 10);
    expect(mockUser.password).toBe("hashedNewPassword");
    expect(mockUser.save).toHaveBeenCalled();

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser.id,
        action: "Reset Password",
        description: `${mockUser.fullname} berhasil reset password.`,
        device: device,
        ipAddress: expect.any(String), // ipAddress biasanya dari req.ip yang otomatis set oleh supertest
      })
    );

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Password berhasil diubah.");
  });
});
