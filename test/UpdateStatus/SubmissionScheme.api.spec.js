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
  sequelize,
  UserSubmissions,
  Submissions,
  TermsConditions,
  SubmissionTerms,
  Progresses,
  Periods,
  Groups,
  Quotas,
  Copyrights,
  TypeCreations,
  SubTypeCreations,
  Patents,
  PatentTypes,
  Brands,
  IndustrialDesigns,
  TypeDesigns,
  SubTypeDesigns,
  AdditionalDatas,
  PersonalDatas,
  BrandTypes,
  Users,
  RevisionFiles,
  SubmissionTypes,
  Payments,
  Faqs,
  Documents,
} = require("../../app/models");
const fs = require("fs");
const { Op } = require("sequelize");
const logActivity = require("../../app/helpers/activityLogs");
const sendEmail = require("../../emails/services/sendMail");
const sendNotification = require("../../app/helpers/notifications");
const ApiError = require("../../utils/apiError");
const {
  restoreUserSubmission,
  deleteUserSubmission,
} = require("../../app/controllers/userSubmissionController");

describe("PATCH /api/v1/user-submission/submission-schema/:id", () => {
  const mockId = 1;

  const mockSubmission = {
    id: 10,
    periodId: 1,
    groupId: 1,
    submissionScheme: "Mandiri",
    copyrightId: 1,
    patentId: null,
    brandId: null,
    industrialDesignId: null,
    save: jest.fn(),
  };

  const mockProgress = {
    id: 123,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update to 'Pendanaan' scheme and reduce quota", async () => {
    UserSubmissions.findOne.mockResolvedValue({
      id: mockId,
      submissionId: mockSubmission.id,
    });
    Submissions.findOne.mockResolvedValue(mockSubmission);
    Progresses.findOne.mockResolvedValue(mockProgress);
    SubmissionTerms.bulkCreate.mockResolvedValue(true);
    Quotas.findOne.mockResolvedValue({ id: 99, remainingQuota: 3 });
    Quotas.update.mockResolvedValue(true);
    Progresses.update.mockResolvedValue(true);
    logActivity.mockResolvedValue(true);

    const res = await request(app)
      .patch(`/api/v1/user-submission/submission-schema/${mockId}`)
      .send({
        periodId: 2,
        groupId: 3,
        submissionScheme: "Pendanaan",
        termsConditionId: [1, 2, 3],
      })
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("SubmissionScheme berhasil diupdate");
    expect(UserSubmissions.findOne).toHaveBeenCalledWith({
      where: { id: "1" },
    });
    expect(SubmissionTerms.bulkCreate).toHaveBeenCalled();
    expect(Quotas.update).toHaveBeenCalledWith(
      { remainingQuota: 2 },
      { where: { id: 99 } }
    );
    expect(Progresses.update).toHaveBeenCalledWith(
      { isStatus: true },
      { where: { id: mockProgress.id } }
    );
  });

  it("should update to 'Mandiri' scheme and create payment if not exists", async () => {
    UserSubmissions.findOne.mockResolvedValue({
      id: mockId,
      submissionId: mockSubmission.id,
    });
    Submissions.findOne.mockResolvedValue(mockSubmission);
    Progresses.findOne.mockResolvedValue(mockProgress);
    Payments.findOne.mockResolvedValue(null);
    Payments.create.mockResolvedValue(true);
    SubmissionTerms.destroy.mockResolvedValue(true);
    Progresses.update.mockResolvedValue(true);
    logActivity.mockResolvedValue(true);

    const res = await request(app)
      .patch(`/api/v1/user-submission/submission-schema/${mockId}`)
      .send({
        periodId: 2,
        groupId: 3,
        submissionScheme: "Mandiri",
      })
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("SubmissionScheme berhasil diupdate");
    expect(Payments.create).toHaveBeenCalledWith({
      userId: 1,
      submissionId: mockSubmission.id,
      paymentStatus: false,
    });
  });

  it("should return 404 if UserSubmission not found", async () => {
    UserSubmissions.findOne.mockResolvedValue(null);

    const res = await request(app)
      .patch(`/api/v1/user-submission/submission-schema/${mockId}`)
      .send({ periodId: 2, groupId: 3, submissionScheme: "Mandiri" })
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("UserSubmission tidak ditemukan");
  });

  it("should return 404 if Submission not found", async () => {
    UserSubmissions.findOne.mockResolvedValue({
      id: mockId,
      submissionId: 999,
    });
    Submissions.findOne.mockResolvedValue(null);

    const res = await request(app)
      .patch(`/api/v1/user-submission/submission-schema/${mockId}`)
      .send({ periodId: 2, groupId: 3, submissionScheme: "Mandiri" })
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Submission tidak ditemukan");
  });

  it("should return 404 if Progress not found", async () => {
    UserSubmissions.findOne.mockResolvedValue({
      id: mockId,
      submissionId: mockSubmission.id,
    });
    Submissions.findOne.mockResolvedValue(mockSubmission);
    Progresses.findOne.mockResolvedValue(null);

    const res = await request(app)
      .patch(`/api/v1/user-submission/submission-schema/${mockId}`)
      .send({ periodId: 2, groupId: 3, submissionScheme: "Mandiri" })
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Progress tidak ditemukan");
  });

  it("should return 500 if quota not available", async () => {
    UserSubmissions.findOne.mockResolvedValue({
      id: mockId,
      submissionId: mockSubmission.id,
    });
    Submissions.findOne.mockResolvedValue(mockSubmission);
    Progresses.findOne.mockResolvedValue(mockProgress);
    SubmissionTerms.bulkCreate.mockResolvedValue(true);
    Quotas.findOne.mockResolvedValue({ id: 88, remainingQuota: 0 }); // no quota

    const res = await request(app)
      .patch(`/api/v1/user-submission/submission-schema/${mockId}`)
      .send({
        periodId: 2,
        groupId: 3,
        submissionScheme: "Pendanaan",
        termsConditionId: [1],
      })
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Kuota tidak tersedia atau sudah habis.");
  });

  it("should return 500 if unexpected error occurs", async () => {
    UserSubmissions.findOne.mockRejectedValue(new Error("Unexpected DB Error"));

    const res = await request(app)
      .patch(`/api/v1/user-submission/submission-schema/${mockId}`)
      .send({
        periodId: 2,
        groupId: 3,
        submissionScheme: "Mandiri",
      })
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Unexpected DB Error");
  });
});
