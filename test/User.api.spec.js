jest.mock("../app/models", () => ({
  Users: {
    findOne: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
    findByPk: jest.fn(),
  },
}));
jest.mock("nodemailer");
jest.mock("jsonwebtoken");
jest.mock("../app/helpers/activityLogs", () => jest.fn());
jest.mock("../emails/services/sendMail");

const { Users } = require("../app/models");
const app = require("../app/index");
const sendEmail = require("../emails/services/sendMail");
const request = require("supertest");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { login, loginGoogle } = require("../app/controllers/authController");
const logActivity = require("../app/helpers/activityLogs");

describe("POST /api/v1/user", () => {
  const mockToken = "dummy-token";

  beforeAll(() => {
    jwt.sign.mockReturnValue(mockToken);
    jwt.verify = jest.fn(() => ({
      id: 1,
      fullname: "Admin User",
      email: "admin@example.com",
      role: "admin",
    }));

    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed-password");
  });

  beforeEach(() => {
    Users.findOne.mockReset();
    Users.create.mockReset();
    Users.findByPk.mockReset();
    logActivity.mockReset();

    Users.findByPk.mockResolvedValue({
      id: 1,
      fullname: "Admin User",
      email: "admin@example.com",
      role: "admin",
    });
  });

  it("should create a new user successfully", async () => {
    Users.findOne.mockResolvedValue(null);

    Users.create.mockResolvedValue({
      id: 1,
      fullname: "User",
      email: "user@example.com",
      faculty: "Engineering",
      studyProgram: "Computer Science",
      institution: "University",
      phoneNumber: "08123456789",
      role: "user",
      isVerified: true,
      image: null,
    });

    const response = await request(app)
      .post("/api/v1/user")
      .set("Authorization", `Bearer ${mockToken}`)
      .field("fullname", "User")
      .field("email", "user@example.com")
      .field("faculty", "Engineering")
      .field("studyProgram", "Computer Science")
      .field("institution", "University")
      .field("phoneNumber", "08123456789")
      .field("role", "user");

    console.log(response.body);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("status", "success");
    expect(response.body.user).toHaveProperty("email", "user@example.com");

    expect(Users.findOne).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
    });
    expect(Users.create).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalled();
  });

  it("should return 400 if email already exists", async () => {
    Users.findOne.mockResolvedValue({
      id: 1,
      email: "test@example.com",
    });

    const response = await request(app)
      .post("/api/v1/user")
      .set("Authorization", `Bearer ${mockToken}`)
      .field("fullname", "Test User")
      .field("email", "test@example.com")
      .field("faculty", "Engineering")
      .field("studyProgram", "Computer Science")
      .field("institution", "Test University")
      .field("phoneNumber", "08123456789")
      .field("role", "user");

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message", "Email sudah terdaftar");
    expect(Users.create).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/user", () => {
  const mockToken = "dummy-token";

  beforeAll(() => {
    jwt.verify = jest.fn(() => ({
      id: 1,
      fullname: "Admin User",
      email: "admin@example.com",
      role: "admin",
    }));
  });

  beforeEach(() => {
    Users.findAndCountAll.mockReset();
    Users.findAll.mockReset();
  });

  it("should return paginated users when limit > 0", async () => {
    Users.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: [
        {
          id: 1,
          fullname: "User One",
          email: "one@example.com",
        },
        {
          id: 2,
          fullname: "User Two",
          email: "two@example.com",
        },
      ],
    });

    const response = await request(app)
      .get("/api/v1/user?page=1&limit=2")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "success");
    expect(response.body.users.length).toBe(2);
    expect(Users.findAndCountAll).toHaveBeenCalledWith({
      limit: 2,
      offset: 0,
      order: [["id", "ASC"]],
    });
  });

  it("should return all users when limit <= 0", async () => {
    Users.findAll.mockResolvedValue([
      {
        id: 1,
        fullname: "User One",
        email: "one@example.com",
      },
      {
        id: 2,
        fullname: "User Two",
        email: "two@example.com",
      },
    ]);

    const response = await request(app)
      .get("/api/v1/user?limit=0")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "success");
    expect(response.body.limit).toBe(2);
    expect(response.body.totalUsers).toBe(2);
    expect(response.body.users.length).toBe(2);
    expect(Users.findAll).toHaveBeenCalled();
  });

  it("should handle errors", async () => {
    Users.findAndCountAll.mockRejectedValue(new Error("Database error"));

    const response = await request(app)
      .get("/api/v1/user")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("status", "Error");
    expect(response.body.message).toMatch(/Database error/);
  });
});
