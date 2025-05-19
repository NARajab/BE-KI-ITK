jest.mock("../app/models", () => ({
  Users: {
    findOne: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
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

    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed-password");
  });

  beforeEach(() => {
    Users.findOne.mockReset();
    Users.create.mockReset();
    logActivity.mockReset();
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
    expect(response.body.user).toHaveProperty("email", "test@example.com");

    expect(Users.findOne).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
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
      .field("fullname", "User")
      .field("email", "user@example.com")
      .field("faculty", "Engineering")
      .field("studyProgram", "Computer Science")
      .field("institution", "University")
      .field("phoneNumber", "08123456789")
      .field("role", "user");

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message", "Email sudah terdaftar");
    expect(Users.create).not.toHaveBeenCalled();
  });
});
