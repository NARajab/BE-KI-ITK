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
    findOne: jest.fn(),
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
  it("should create a new HelpCenter entry and notify admins", async () => {
    const mockRequestData = {
      email: "user@example.com",
      phoneNumber: "08123456789",
      problem: "Login Error",
      message: "I can't login to my account",
    };

    const mockUser = {
      id: 123,
      fullname: "John Doe",
      email: mockRequestData.email,
    };

    const mockHelpCenter = {
      ...mockRequestData,
      id: 1,
      document: null,
      status: false,
    };

    const mockAdmins = [
      { email: "admin1@example.com" },
      { email: "admin2@example.com" },
    ];

    Users.findOne.mockResolvedValue(mockUser);
    Users.findAll.mockResolvedValue(mockAdmins);
    HelpCenters.create.mockResolvedValue(mockHelpCenter);

    const response = await request(app)
      .post("/api/v1/help-center")
      .send(mockRequestData)
      .set("User-Agent", "jest-test");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Help Center berhasil ditambahkan");
    expect(HelpCenters.create).toHaveBeenCalledWith({
      ...mockRequestData,
      document: null,
      status: false,
    });

    expect(logActivity).toHaveBeenCalledWith({
      userId: mockUser.id,
      action: "Mengajukan Pertanyaan di Help Center",
      description: `${mockUser.fullname} berhasil mengajukan pertanyaan di Help Center.`,
      device: "jest-test",
      ipAddress: expect.any(String),
    });

    expect(sendEmail).toHaveBeenCalledWith({
      to: ["admin1@example.com", "admin2@example.com"],
      subject: "Pertanyaan di Pusat Bantuan",
      html: "<p>Email content</p>",
    });
  });

  it("should still log and send email even if user is not found", async () => {
    const mockRequestData = {
      email: "user@example.com",
      phoneNumber: "08123456789",
      problem: "Login Error",
      message: "I can't login to my account",
    };
    Users.findOne.mockResolvedValue(null); // no user found
    Users.findAll.mockResolvedValue([{ email: "admin@example.com" }]);
    HelpCenters.create.mockResolvedValue({ id: 1, ...mockRequestData });

    const response = await request(app)
      .post("/api/v1/help-center")
      .send(mockRequestData)
      .set("User-Agent", "jest-test");

    expect(response.statusCode).toBe(200);
    expect(logActivity).toHaveBeenCalledWith({
      userId: null,
      action: "Mengajukan Pertanyaan di Help Center",
      description: `${mockRequestData.email} berhasil mengajukan pertanyaan di Help Center.`,
      device: "jest-test",
      ipAddress: expect.any(String),
    });
  });
});

describe("PATCH /api/v1/help-center/:id", () => {
  const mockHelpCenter = {
    id: 1,
    email: "user@example.com",
    phoneNumber: "08123456789",
    problem: "Login Error",
    message: "I can't login",
    answer: null,
    status: false,
    update: jest.fn().mockResolvedValue(true),
  };

  const mockUser = {
    id: 10,
    fullname: "Test User",
    email: "user@example.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update HelpCenter with answer and notify the user", async () => {
    HelpCenters.findByPk.mockResolvedValue(mockHelpCenter);
    Users.findOne.mockResolvedValue(mockUser);

    const response = await request(app)
      .patch("/api/v1/help-center/1")
      .send({ answer: "Silakan coba reset password Anda." })
      .set("User-Agent", "jest-agent");

    console.log("Response body:", response.body);

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Help Center berhasil diperbarui");

    expect(mockHelpCenter.update).toHaveBeenCalledWith({
      answer: "Silakan coba reset password Anda.",
      status: true,
    });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1, // req.user.id dari middleware mock
        action: "Menjawab Pertanyaan di Help Center",
        description: expect.stringContaining("berhasil menjawab"),
      })
    );

    expect(SendEmail).toHaveBeenCalledWith({
      to: mockUser.email,
      subject: "Pertanyaan di Pusat Bantuan",
      html: expect.any(String),
    });

    expect(sendNotification).toHaveBeenCalledWith(
      mockUser.id,
      "Pertanyaan di Pusat Bantuan",
      "Pertanyaan di Pusat Bantuan telah dijawab"
    );
  });

  it("should return 404 if HelpCenter not found", async () => {
    HelpCenters.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .patch("/api/v1/help-center/999")
      .send({ answer: "Some answer" });

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("Help Center tidak ditemukan");
  });

  it("should return 400 if user ID is invalid", async () => {
    HelpCenters.findByPk.mockResolvedValue(mockHelpCenter);
    Users.findOne.mockResolvedValue({ id: NaN, email: "invalid@example.com" });

    const response = await request(app)
      .patch("/api/v1/help-center/1")
      .send({ answer: "Some answer" });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("ID pengguna tidak valid");
  });
});
