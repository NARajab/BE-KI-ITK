jest.mock("firebase-admin");
jest.mock("nodemailer");
jest.mock("jsonwebtoken");
jest.mock("../app/helpers/activityLogs", () => jest.fn());
jest.mock("../app/models");

const { Users } = require("../app/models");
const app = require("../app/index"); // Harus setelah mock
const request = require("supertest");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken"); // Optional: sudah dimock
const { login, loginGoogle } = require("../app/controllers/authController");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const logActivity = require("../app/helpers/activityLogs");

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
      ...newUser, // Include the rest of the user data
    });

    // Mocking the Users.findOne to return the newly created user
    Users.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 1,
      email: newUser.email,
      fullname: newUser.fullname,
      isVerified: false,
      ...newUser,
    });

    // Mocking the email sending function
    nodemailer.createTransport.mockReturnValue({
      sendMail: jest.fn().mockResolvedValue(true),
    });

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(newUser);

    console.log("Response Body:", response.body);

    expect(response.status).toBe(201);

    // Ensure that Users.create was called with the correct data
    expect(Users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: newUser.email,
        fullname: newUser.fullname,
        password: expect.any(String), // Don't expect the actual password for security reasons
        phoneNumber: newUser.phoneNumber,
        faculty: newUser.faculty,
        studyProgram: newUser.studyProgram,
        institution: newUser.institution,
      })
    );

    // Verify that Users.findOne returns the correct user
    console.log("Sending request to find user with email:", newUser.email);
    const user = await Users.findOne({ where: { email: newUser.email } });
    console.log("Fetched User:", user); // Log the user to help debug
    expect(user).not.toBeNull();
    expect(user.email).toBe(newUser.email);
    expect(user.isVerified).toBe(false);

    // Check if the verification email was sent
    expect(nodemailer.createTransport().sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: newUser.email,
        subject: "Verifikasi Email Anda",
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

    // Mock Users.findOne to simulate existing email in the database
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

    // Expect status code 400 (Bad Request)
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

    // Expect status code 400 (Bad Request)
    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Field fullname mengandung kata yang tidak pantas."
    );
  });
});

describe("POST /api/v1/auth/login", () => {
  let user;

  beforeEach(() => {
    // Setup user mock data
    user = {
      id: 1,
      email: "testuser@example.com",
      password: "$2a$10$V3W.e5H71/hfs0c3NRpaOCOATfGzQYFJhOXxk19id81FuIqZC3OLu", // Hash untuk 'password123'
      role: "user",
      isVerified: true,
      fullname: "Test User",
    };
  });

  it("should return 404 if user not found", async () => {
    // Mock Users.findOne untuk mengembalikan null jika tidak ada pengguna
    Users.findOne = jest.fn().mockResolvedValue(null);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "testuser@example.com", password: "password123" });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Pengguna tidak ditemukan");
  });

  it("should return 401 if password is incorrect", async () => {
    // Mock Users.findOne untuk mengembalikan data pengguna
    Users.findOne = jest.fn().mockResolvedValue(user);

    // Mock bcrypt.compare untuk mengembalikan false (password salah)
    bcrypt.compare = jest.fn().mockResolvedValue(false);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "testuser@example.com", password: "wrongpassword" });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Password yang anda masukkan salah");
  });

  it("should return 401 if email is not verified", async () => {
    // Mock Users.findOne untuk mengembalikan data pengguna dengan isVerified false
    Users.findOne = jest.fn().mockResolvedValue({
      ...user,
      isVerified: false,
    });

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "testuser@example.com", password: "password123" });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Email belum diverifikasi");
  });

  it("should return 200 and a token if login is successful", async () => {
    const user = {
      id: 1,
      email: "testuser@example.com",
      password: "$2a$10$V3W.e5H71/hfs0c3NRpaOCOATfGzQYFJhOXxk19id81FuIqZC3OLu", // Hash untuk 'password123'
      isVerified: true,
      fullname: "Test User",
      role: "user",
    };

    Users.findOne = jest.fn().mockResolvedValue(user);
    bcrypt.compare = jest.fn().mockResolvedValue(true); // async
    bcrypt.compareSync = jest.fn().mockReturnValue(true); // sync
    jwt.sign = jest.fn().mockReturnValue("mock-jwt-token");
    logActivity.mockResolvedValue();

    const device = "mock-device";
    const ipAddress = "::ffff:127.0.0.1";

    const mockReq = {
      body: { email: "testuser@example.com", password: "password123" },
      headers: { "user-agent": device }, // Mock user-agent header
      ip: ipAddress, // Mock IP address
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Gunakan controller login dengan request dan response yang telah dimock
    await login(mockReq, mockRes);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "testuser@example.com", password: "password123" });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Login berhasil");
    expect(response.body.token).toBe("mock-jwt-token");
    expect(logActivity).toHaveBeenCalledWith({
      userId: user.id,
      action: "Login",
      description: `${user.fullname} berhasil login.`,
      device: device,
      ipAddress: ipAddress,
    });
  });

  it("should return 401 if password is incorrect even with correct email", async () => {
    // Mock Users.findOne untuk mengembalikan data pengguna
    Users.findOne = jest.fn().mockResolvedValue(user);

    // Mock bcrypt.compare untuk mengembalikan false
    bcrypt.compare = jest.fn().mockResolvedValue(false);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "testuser@example.com", password: "wrongpassword" });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Password yang anda masukkan salah");
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

    // Mock Firebase admin
    admin.auth = jest.fn().mockReturnValue({
      verifyIdToken: jest.fn().mockResolvedValue(decodedToken),
      getUser: jest.fn().mockResolvedValue(userRecord),
    });

    // Mock model dan JWT
    Users.findOne.mockResolvedValue(null);
    Users.create.mockResolvedValue(user);
    jwt.sign.mockReturnValue("mock-jwt-token");

    // Mock logActivity
    logActivity.mockResolvedValue();

    // Simulasi request login-google
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
