const request = require("supertest");
const app = require("../app/index");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Users } = require("../app/models");
const nodemailer = require("nodemailer");
const logActivity = require("../app/helpers/activityLogs");

jest.mock("nodemailer");
jest.mock("jsonwebtoken");
jest.mock("../app/helpers/activityLogs");

describe("POST /api/v1/auth/register", () => {
  afterEach(async () => {
    await Users.destroy({ where: {} });
  });

  it("should register a new user and send a verification email", async () => {
    const newUser = {
      email: "user@example.com",
      fullname: "exampel User",
      password: "Password123!",
      phoneNumber: "1234567890",
      faculty: "Engineering",
      studyProgram: "Computer Science",
      institution: "University XYZ",
    };

    // Mocking the email sending function
    nodemailer.createTransport.mockReturnValue({
      sendMail: jest.fn().mockResolvedValue(true),
    });

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(newUser);

    expect(response.status).toBe(201);

    const user = await Users.findOne({ where: { email: newUser.email } });
    expect(user).not.toBeNull();
    expect(user.email).toBe(newUser.email);
    expect(user.isVerified).toBe(false);

    expect(nodemailer.createTransport().sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: newUser.email,
        subject: "Verifikasi Email Anda",
      })
    );
  });

  it("should return an error if the email is already registered", async () => {
    await Users.create({
      email: "user@example.com",
      fullname: "exampel User",
      password: "Password123!",
      phoneNumber: "1234567890",
      faculty: "Engineering",
      studyProgram: "Computer Science",
      institution: "University XYZ",
      isVerified: false,
      role: "user",
    });

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
      fullname: "exampel User",
      password: "Password123!",
      phoneNumber: "1234567890",
      faculty: "Engineering",
      studyProgram: "Computer Science",
      institution: "University XYZ",
      fullname: "Test BadWord",
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
    // Mock Users.findOne untuk mengembalikan data pengguna
    Users.findOne = jest.fn().mockResolvedValue(user);

    // Mock bcrypt.compare untuk mengembalikan true (password benar)
    bcrypt.compare = jest.fn().mockResolvedValue(true);

    // Mock jwt.sign untuk menghasilkan token palsu
    jwt.sign = jest.fn().mockReturnValue("mock-jwt-token");

    // Mock logActivity untuk memastikan fungsi log dipanggil
    logActivity.mockResolvedValue();

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
      device: expect.any(String), // Bisa divalidasi lebih lanjut jika perlu
      ipAddress: expect.any(String), // Bisa divalidasi lebih lanjut jika perlu
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
