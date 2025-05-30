jest.mock("../../app/models", () => ({
  sequelize: {
    transaction: jest.fn(),
  },
  UserSubmissions: {
    findOne: jest.fn(),
    update: jest.fn(),
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    destroy: jest.fn(),
  },
  Submissions: {
    findOne: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
    restore: jest.fn(),
    count: jest.fn(),
    destroy: jest.fn(),
  },
  SubmissionTerms: {
    bulkCreate: jest.fn(),
    destroy: jest.fn(),
  },
  Progresses: {
    findOne: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    restore: jest.fn(),
    destroy: jest.fn(),
  },
  Copyrights: {
    count: jest.fn(),
    restore: jest.fn(),
    destroy: jest.fn(),
  },
  Patents: {
    count: jest.fn(),
    restore: jest.fn(),
    destroy: jest.fn(),
  },
  Brands: {
    count: jest.fn(),
    restore: jest.fn(),
    destroy: jest.fn(),
  },
  IndustrialDesigns: {
    count: jest.fn(),
    restore: jest.fn(),
    destroy: jest.fn(),
  },
  Faqs: {
    count: jest.fn(),
  },
  Documents: {
    count: jest.fn(),
  },
  PersonalDatas: {
    restore: jest.fn(),
    destroy: jest.fn(),
  },
  Users: {
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
  Quotas: {
    findOne: jest.fn(),
    update: jest.fn(),
  },
  RevisionFiles: {
    create: jest.fn(),
    restore: jest.fn(),
    destroy: jest.fn(),
  },
  Payments: {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
  SubTypeCreations: {
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    restore: jest.fn(),
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
jest.mock("../../app/middlewares/authenticat", () => {
  return (req, res, next) => {
    req.user = {
      id: 1,
      fullname: "Admin User",
      role: "admin",
    };
    next();
  };
});

jest.mock("../../app/helpers/activityLogs", () => jest.fn());
jest.mock("../../emails/services/sendMail", () => jest.fn());
jest.mock("../../app/helpers/notifications", () => jest.fn());
jest.mock("fs", () => {
  const fsActual = jest.requireActual("fs");
  return {
    ...fsActual,
    unlink: jest.fn((path, cb) => cb(null)),
    existsSync: jest.fn(() => true),
    unlinkSync: jest.fn(),
    mkdirSync: jest.fn(),
  };
});

const request = require("supertest");
const app = require("../../app/index");
const {
  UserSubmissions,
  Progresses,
  Users,
  RevisionFiles,
  Payments,
} = require("../../app/models");
const logActivity = require("../../app/helpers/activityLogs");
const sendEmail = require("../../emails/services/sendMail");
const sendNotification = require("../../app/helpers/notifications");

describe("PATCH /api/v1/user-submission/submission-progress/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("success update submission progress", async () => {
    const mockSubmission = {
      id: 1,
      userId: 2,
      submissionId: 3,
    };

    const mockProgress = { id: 10 };
    const mockUser = { email: "test@example.com", fullname: "John Doe", id: 2 };

    UserSubmissions.findOne.mockResolvedValue(mockSubmission);
    Progresses.create.mockResolvedValue(mockProgress);
    UserSubmissions.update.mockResolvedValue([1]);
    Payments.update.mockResolvedValue([1]);
    Progresses.update.mockResolvedValue([1]);
    RevisionFiles.create.mockResolvedValue({});
    Users.findOne.mockResolvedValue(mockUser);
    sendEmail.mockResolvedValue();
    sendNotification.mockResolvedValue();
    logActivity.mockResolvedValue();

    const res = await request(app)
      .patch("/api/v1/user-submission/submission-progress/1")
      .field("reviewStatus", "Revisi")
      .field("comments", "Perlu perbaikan")
      .field("billingCode", "BILL-123")
      .field("fileNames", JSON.stringify(["file1.pdf"]))
      .attach("files", Buffer.from("dummy file"), "file1.pdf")
      .attach("certificateFile", Buffer.from("certificate"), "cert.pdf");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("status", "success");
    expect(res.body).toHaveProperty(
      "message",
      "SubmissionProgress berhasil diupdate"
    );
    expect(UserSubmissions.findOne).toHaveBeenCalledWith({
      where: { id: "1" },
    });
    expect(Progresses.create).toHaveBeenCalled();
    expect(UserSubmissions.update).toHaveBeenCalledWith(
      { progressId: mockProgress.id },
      { where: { id: "1" } }
    );
    expect(sendNotification).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalled();
  });

  it("UserSubmission not found", async () => {
    UserSubmissions.findOne.mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/v1/user-submission/submission-progress/999")
      .field("reviewStatus", "Approved");

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("status", "error");
    expect(res.body).toHaveProperty(
      "message",
      "UserSubmission tidak ditemukan"
    );
  });

  it("handle server error", async () => {
    UserSubmissions.findOne.mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .patch("/api/v1/user-submission/submission-progress/1")
      .field("reviewStatus", "Approved");

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("message", "DB error");
  });
});
