jest.mock("../app/models", () => ({
  HelpCenters: {
    create: jest.fn(),
    update: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    count: jest.fn(),
    destroy: jest.fn(),
    restore: jest.fn(),
  },
  Users: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
  },
}));
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(() => "mock-token"),
  verify: jest.fn(() => ({
    id: 1,
    fullname: "Admin User",
    email: "admin@example.com",
    role: "admin",
  })),
}));
jest.mock("../app/middlewares/authenticat", () => {
  return (req, res, next) => {
    req.user = {
      id: 1,
      fullname: "Admin User",
      role: "admin",
    };
    next();
  };
});

jest.mock("../app/helpers/activityLogs", () => jest.fn());

jest.mock("../emails/services/sendMail", () => jest.fn());
jest.mock("../emails/templates/helpCenterMailUser", () =>
  jest.fn(() => "<p>Email content</p>")
);

const sendEmail = require("../emails/services/sendMail");
const helpCenterMailUser = require("../emails/templates/helpCenterMailUser");
const request = require("supertest");
const app = require("../app/index");
const { HelpCenters, Users } = require("../app/models");
const { Op } = require("sequelize");
const logActivity = require("../app/helpers/activityLogs");

describe("POST /api/v1/help-center", () => {
  beforeEach(() => {
    HelpCenters.create.mockClear();
    Users.findAll.mockClear();
    logActivity.mockClear();
    sendEmail.mockClear();
  });

  it("should create a new HelpCenter entry and notify admins", async () => {
    const mockHelpCenter = {
      id: 1,
      email: "user@example.com",
      phoneNumber: "08123456789",
      problem: "Login Error",
      message: "I can't login to my account",
      document: null,
      status: false,
    };

    const mockAdmins = [
      { email: "admin1@example.com" },
      { email: "admin2@example.com" },
    ];

    HelpCenters.create.mockResolvedValue(mockHelpCenter);
    Users.findAll.mockResolvedValue(mockAdmins);

    const response = await request(app)
      .post("/api/v1/help-center")
      .send({
        email: mockHelpCenter.email,
        phoneNumber: mockHelpCenter.phoneNumber,
        problem: mockHelpCenter.problem,
        message: mockHelpCenter.message,
      })
      .set("User-Agent", "jest-test");

    console.log("Response body:", response.body);

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Help Center berhasil ditambahkan");

    expect(HelpCenters.create).toHaveBeenCalledWith({
      email: mockHelpCenter.email,
      phoneNumber: mockHelpCenter.phoneNumber,
      problem: mockHelpCenter.problem,
      message: mockHelpCenter.message,
      document: null,
      status: false,
    });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Mengajukan Pertanyaan di Help Center",
        description: expect.stringContaining("berhasil mengajukan"),
      })
    );

    expect(sendEmail).toHaveBeenCalledWith({
      to: ["admin1@example.com", "admin2@example.com"],
      subject: "Pertanyaan di Pusat Bantuan",
      html: expect.any(String),
    });
  });

  it("should return 500 on internal error", async () => {
    HelpCenters.create.mockRejectedValue(new Error("DB error"));

    const response = await request(app).post("/api/v1/help-center").send({
      email: "user@example.com",
      phoneNumber: "08123456789",
      problem: "Login Error",
      message: "I can't login",
    });

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("DB error");
  });
});
