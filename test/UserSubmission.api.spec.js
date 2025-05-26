jest.mock("../app/models", () => ({
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
jest.mock("../app/helpers/notifications", () => jest.fn());
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
const app = require("../app/index");
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
} = require("../app/models");
const fs = require("fs");
const { Op } = require("sequelize");
const logActivity = require("../app/helpers/activityLogs");
const sendEmail = require("../emails/services/sendMail");
const sendNotification = require("../app/helpers/notifications");
const ApiError = require("../utils/apiError");
const {
  restoreUserSubmission,
  deleteUserSubmission,
} = require("../app/controllers/userSubmissionController");

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

describe("PATCH /api/v1/user-submission/submission-schema/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update submission scheme successfully when valid data and quota available", async () => {
    // Mocking findOne userSubmission
    UserSubmissions.findOne.mockResolvedValue({
      id: "subm-1",
      submissionId: 10,
    });

    // Mocking findOne submission with copyrightId to test quota
    Submissions.findOne.mockResolvedValue({
      id: 10,
      copyrightId: 1,
      patentId: null,
      brandId: null,
      industrialDesignId: null,
      periodId: null,
      groupId: null,
      submissionScheme: null,
      save: jest.fn().mockResolvedValue(true),
    });

    // Mock progress findOne
    Progresses.findOne.mockResolvedValue({
      id: 100,
    });

    // Mock quota findOne
    Quotas.findOne.mockResolvedValue({
      id: 50,
      remainingQuota: 5,
      groupId: 2,
      title: "Hak Cipta",
    });

    // Mock quota update
    Quotas.update.mockResolvedValue([1]);

    // Mock SubmissionTerms bulkCreate (when Pendanaan with termsConditionId)
    SubmissionTerms.bulkCreate.mockResolvedValue(true);

    // Mock Payments findOne returns null (Mandiri case not tested here)
    Payments.findOne.mockResolvedValue(null);

    // Mock Progresses.update
    Progresses.update.mockResolvedValue([1]);

    // Mock logActivity
    logActivity.mockResolvedValue();

    const response = await request(app)
      .patch("/api/v1/user-submission/submission-schema/subm-1")
      .set("Authorization", "Bearer mock-token")
      .send({
        periodId: 1,
        groupId: 2,
        submissionScheme: "Pendanaan",
        termsConditionId: [1, 2],
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "success");
    expect(response.body).toHaveProperty(
      "message",
      "SubmissionScheme berhasil diupdate"
    );
    expect(Submissions.findOne).toHaveBeenCalledWith({ where: { id: 10 } });
    expect(SubmissionTerms.bulkCreate).toHaveBeenCalledWith([
      { submissionId: 10, termsConditionId: 1 },
      { submissionId: 10, termsConditionId: 2 },
    ]);
    expect(Quotas.update).toHaveBeenCalledWith(
      { remainingQuota: 4 },
      { where: { id: 50 } }
    );
    expect(Progresses.update).toHaveBeenCalledWith(
      { isStatus: true },
      { where: { id: 100 } }
    );
  });

  it("should return 404 if UserSubmission not found", async () => {
    UserSubmissions.findOne.mockResolvedValue(null);

    const response = await request(app)
      .patch("/api/v1/user-submission/submission-schema/notfound")
      .set("Authorization", "Bearer mock-token")
      .send({
        periodId: 1,
        groupId: 2,
        submissionScheme: "Pendanaan",
        termsConditionId: [1],
      });

    expect(response.status).toBe(404);
    expect(response.body.message).toMatch(/UserSubmission tidak ditemukan/);
  });

  it("should handle quota not available error", async () => {
    UserSubmissions.findOne.mockResolvedValue({
      id: "subm-1",
      submissionId: 10,
    });

    Submissions.findOne.mockResolvedValue({
      id: 10,
      copyrightId: 1,
      patentId: null,
      brandId: null,
      industrialDesignId: null,
      save: jest.fn(),
    });

    Progresses.findOne.mockResolvedValue({ id: 100 });

    Quotas.findOne.mockResolvedValue({
      id: 50,
      remainingQuota: 0, // quota habis
      groupId: 2,
      title: "Hak Cipta",
    });

    const response = await request(app)
      .patch("/api/v1/user-submission/submission-schema/subm-1")
      .set("Authorization", "Bearer mock-token")
      .send({
        periodId: 1,
        groupId: 2,
        submissionScheme: "Pendanaan",
        termsConditionId: [1],
      });

    expect(response.status).toBe(500);
    expect(response.body.message).toMatch(
      /Kuota tidak tersedia atau sudah habis/
    );
  });

  it("should handle Mandiri submission scheme: destroy terms and create payment if not exists", async () => {
    UserSubmissions.findOne.mockResolvedValue({
      id: "subm-1",
      submissionId: 10,
    });
    Submissions.findOne.mockResolvedValue({
      id: 10,
      copyrightId: null,
      patentId: null,
      brandId: null,
      industrialDesignId: null,
      save: jest.fn(),
    });
    Progresses.findOne.mockResolvedValue({ id: 100 });

    SubmissionTerms.destroy.mockResolvedValue(1);
    Payments.findOne.mockResolvedValue(null);
    Payments.create.mockResolvedValue(true);
    Progresses.update.mockResolvedValue([1]);
    logActivity.mockResolvedValue();

    const response = await request(app)
      .patch("/api/v1/user-submission/submission-schema/subm-1")
      .set("Authorization", "Bearer mock-token")
      .send({
        periodId: 1,
        groupId: 2,
        submissionScheme: "Mandiri",
        termsConditionId: [],
      });

    expect(response.status).toBe(200);
    expect(SubmissionTerms.destroy).toHaveBeenCalledWith({
      where: { submissionId: 10 },
    });
    expect(Payments.create).toHaveBeenCalledWith({
      userId: 1,
      submissionId: 10,
      paymentStatus: false,
    });
  });
});

describe("PATCH /api/v1/user-submission/submission-status/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update status successfully and send email & notification", async () => {
    const mockUserSubmission = {
      id: "subm-1",
      userId: 123,
      update: jest.fn().mockResolvedValue(true),
    };
    UserSubmissions.findOne.mockResolvedValue(mockUserSubmission);

    Users.findOne.mockResolvedValue({
      id: 123,
      email: "user@example.com",
      fullname: "User Example",
    });

    const response = await request(app)
      .patch("/api/v1/user-submission/submission-status/subm-1")
      .set("Authorization", "Bearer mock-token")
      .send({
        centralStatus: "Approved",
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Status berhasil diupdate");

    expect(mockUserSubmission.update).toHaveBeenCalledWith({
      centralStatus: "Approved",
    });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: expect.any(Number),
        action: "Mengubah Status Pengajuan",
        description: expect.stringContaining(
          "berhasil mengubah status pengajuan"
        ),
      })
    );

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: "Update Status Pengajuan",
        html: expect.any(String),
      })
    );

    expect(sendNotification).toHaveBeenCalledWith(
      123,
      "Status Pengajuan",
      "Status Pengajuan anda telah berubah menjadi Approved"
    );
  });

  it("should return 404 if UserSubmission not found", async () => {
    UserSubmissions.findOne.mockResolvedValue(null);

    const response = await request(app)
      .patch("/api/v1/user-submission/submission-status/invalid-id")
      .set("Authorization", "Bearer mock-token")
      .send({
        centralStatus: "Rejected",
      });

    expect(response.status).toBe(404);
    expect(response.body.status).toBe("error");
    expect(response.body.message).toMatch(/UserSubmission tidak ditemukan/);
  });

  it("should handle internal server error", async () => {
    UserSubmissions.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app)
      .patch("/api/v1/user-submission/submission-status/some-id")
      .set("Authorization", "Bearer mock-token")
      .send({
        centralStatus: "Pending",
      });

    expect(response.status).toBe(500);
    expect(response.body.status).toBe("Error");
    expect(response.body.message).toBe("Database error");
  });
});

describe("PATCH /api/v1/user-submission/submission-reviewer/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update reviewer successfully", async () => {
    // Mock user sebagai reviewer ditemukan
    const mockReviewer = { id: 10, role: "reviewer" };
    Users.findOne.mockResolvedValueOnce(mockReviewer);

    // Mock UserSubmission ditemukan
    const mockUserSubmission = {
      id: "subm-1",
      update: jest.fn().mockResolvedValue(true),
    };
    UserSubmissions.findOne.mockResolvedValueOnce(mockUserSubmission);

    const response = await request(app)
      .patch("/api/v1/user-submission/submission-reviewer/subm-1")
      .set("Authorization", "Bearer mock-token")
      .send({ reviewerId: 10 });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Reviewer berhasil diupdate");
    expect(mockUserSubmission.update).toHaveBeenCalledWith({ reviewerId: 10 });
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: expect.any(Number),
        action: "Mengubah Reviewer Pengajuan",
        description: expect.stringContaining(
          "berhasil mengubah reviewer pengajuan"
        ),
      })
    );
  });

  it("should return 404 if reviewer user not found", async () => {
    Users.findOne.mockResolvedValue(null);

    const response = await request(app)
      .patch("/api/v1/user-submission/submission-reviewer/subm-1")
      .set("Authorization", "Bearer mock-token")
      .send({ reviewerId: 99 });

    expect(response.status).toBe(404);
    expect(response.body.status).toBe("error");
    expect(response.body.message).toBe("Reviewer tidak ditemukan");
  });

  it("should return 400 if user is not a reviewer", async () => {
    Users.findOne.mockResolvedValue({ id: 20, role: "admin" });

    const response = await request(app)
      .patch("/api/v1/user-submission/submission-reviewer/subm-1")
      .set("Authorization", "Bearer mock-token")
      .send({ reviewerId: 20 });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe("error");
    expect(response.body.message).toBe(
      "User yang dipilih bukan seorang reviewer"
    );
  });

  it("should return 404 if UserSubmission not found", async () => {
    Users.findOne.mockResolvedValue({ id: 10, role: "reviewer" });

    UserSubmissions.findOne.mockResolvedValue(null);

    const response = await request(app)
      .patch("/api/v1/user-submission/submission-reviewer/subm-unknown")
      .set("Authorization", "Bearer mock-token")
      .send({ reviewerId: 10 });

    expect(response.status).toBe(404);
    expect(response.body.status).toBe("error");
    expect(response.body.message).toBe("UserSubmission tidak ditemukan");
  });

  it("should handle internal server error", async () => {
    Users.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app)
      .patch("/api/v1/user-submission/submission-reviewer/some-id")
      .set("Authorization", "Bearer mock-token")
      .send({ reviewerId: 10 });

    expect(response.status).toBe(500);
    expect(response.body.status).toBe("Error");
    expect(response.body.message).toBe("Database error");
  });
});

describe("GET /api/v1/user-submission", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return paginated user submissions successfully", async () => {
    // Mock data for findAndCountAll
    const mockData = {
      count: 2,
      rows: [
        { id: 1, some: "data1" },
        { id: 2, some: "data2" },
      ],
    };

    UserSubmissions.findAndCountAll.mockResolvedValue(mockData);

    const response = await request(app)
      .get("/api/v1/user-submission")
      .query({ page: 1, limit: 10 })
      .set("Authorization", "Bearer mock-token");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.currentPage).toBe(1);
    expect(response.body.totalPages).toBe(Math.ceil(mockData.count / 10));
    expect(response.body.totalUserSubmissions).toBe(mockData.count);
    expect(response.body.limit).toBe(10);
    expect(response.body.userSubmissions).toEqual(mockData.rows);
    expect(UserSubmissions.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
        offset: 0,
        order: [["id", "ASC"]],
        include: expect.any(Array),
      })
    );
  });

  it("should default to page=1 and limit=10 if query params not provided", async () => {
    const mockData = {
      count: 1,
      rows: [{ id: 1 }],
    };
    UserSubmissions.findAndCountAll.mockResolvedValue(mockData);

    const response = await request(app)
      .get("/api/v1/user-submission")
      .set("Authorization", "Bearer mock-token");

    expect(response.status).toBe(200);
    expect(response.body.currentPage).toBe(1);
    expect(response.body.limit).toBe(10);
  });

  it("should handle errors and return status 500", async () => {
    UserSubmissions.findAndCountAll.mockRejectedValue(
      new Error("Database error")
    );

    const response = await request(app)
      .get("/api/v1/user-submission")
      .set("Authorization", "Bearer mock-token");

    expect(response.status).toBe(500);
    expect(response.body.status).toBe("Error");
    expect(response.body.message).toBe("Database error");
  });
});

describe("GET /api/v1/user-submission/get-by-id/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return user submission data when found", async () => {
    const mockUserSubmission = {
      id: 1,
      some: "data",
      // add nested includes mock if needed or just basic data
    };

    UserSubmissions.findOne.mockResolvedValue(mockUserSubmission);

    const response = await request(app)
      .get("/api/v1/user-submission/get-by-id/1")
      .set("Authorization", "Bearer mock-token");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.userSubmission).toEqual(mockUserSubmission);

    expect(UserSubmissions.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "1" },
        include: expect.any(Array),
        order: expect.any(Array),
      })
    );
  });

  it("should return 404 if user submission not found", async () => {
    UserSubmissions.findOne.mockResolvedValue(null);

    const response = await request(app)
      .get("/api/v1/user-submission/get-by-id/999")
      .set("Authorization", "Bearer mock-token");

    expect(response.status).toBe(404);
    expect(response.body.status).toBe("Failed");
    expect(response.body.message).toBe("UserSubmission tidak ditemukan");
  });

  it("should handle errors and return status 500", async () => {
    UserSubmissions.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app)
      .get("/api/v1/user-submission/get-by-id/1")
      .set("Authorization", "Bearer mock-token");

    expect(response.status).toBe(500);
    expect(response.body.status).toBe("Error");
    expect(response.body.message).toBe("Database error");
  });
});

describe("GET /api/v1/user-submission/get-by-submision-type/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return paginated user submissions filtered by submission type", async () => {
    const mockRows = [
      {
        reviewerId: null,
        user: { fullname: "John Doe" },
        reviewer: { fullname: "Jane Reviewer" },
        submission: { submissionScheme: "Scheme A" },
        progress: [{ status: "approved" }],
        centralStatus: "completed",
        toJSON: function () {
          return {
            id: 1,
            reviewerId: this.reviewerId,
            user: this.user,
            reviewer: this.reviewer,
            submission: this.submission,
            progress: this.progress,
            centralStatus: this.centralStatus,
          };
        },
      },
      {
        reviewerId: 5,
        user: { fullname: "Alice" },
        reviewer: { fullname: "Bob" },
        submission: { submissionScheme: "Scheme B" },
        progress: [{ status: "pending" }],
        centralStatus: "in progress",
        toJSON: function () {
          return {
            id: 2,
            reviewerId: this.reviewerId,
            user: this.user,
            reviewer: this.reviewer,
            submission: this.submission,
            progress: this.progress,
            centralStatus: this.centralStatus,
          };
        },
      },
    ];

    UserSubmissions.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: mockRows,
    });

    const response = await request(app)
      .get("/api/v1/user-submission/get-by-submision-type/10")
      .query({ page: 1, limit: 10, search: "john" })
      .set("Authorization", "Bearer mock-token");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.currentPage).toBe(1);
    expect(response.body.totalPages).toBe(1);
    expect(response.body.totalUserSubmissions).toBe(2);
    expect(response.body.limit).toBe(10);
    expect(Array.isArray(response.body.userSubmissions)).toBe(true);

    // reviewerId null should become "-"
    expect(response.body.userSubmissions[0].reviewerId).toBe("-");

    expect(UserSubmissions.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
        offset: 0,
        where: expect.objectContaining({
          createdAt: expect.any(Object),
        }),
        include: expect.arrayContaining([
          expect.objectContaining({ as: "user" }),
          expect.objectContaining({ as: "reviewer" }),
          expect.objectContaining({ as: "progress" }),
          expect.objectContaining({
            as: "submission",
            where: { submissionTypeId: "10" },
          }),
        ]),
        order: [["id", "ASC"]],
        distinct: true,
      })
    );
  });

  it("should return 404 when no submissions found after filtering", async () => {
    UserSubmissions.findAndCountAll.mockResolvedValue({
      count: 0,
      rows: [],
    });

    const response = await request(app)
      .get("/api/v1/user-submission/get-by-submision-type/10")
      .set("Authorization", "Bearer mock-token");

    expect(response.status).toBe(404);
    expect(response.body.status).toBe("Failed");
    expect(response.body.message).toBe("UserSubmissions tidak ditemukan");
  });

  it("should handle errors and return status 500", async () => {
    UserSubmissions.findAndCountAll.mockRejectedValue(new Error("DB error"));

    const response = await request(app)
      .get("/api/v1/user-submission/get-by-submision-type/10")
      .set("Authorization", "Bearer mock-token");

    expect(response.status).toBe(500);
    expect(response.body.status).toBe("Error");
    expect(response.body.message).toBe("DB error");
  });
});

describe("GET /api/v1/user-submission/get-by-submision-type/status/:id", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return paginated user submissions filtered by progress status 'Selesai'", async () => {
    // Mock data rows
    const mockRows = [
      {
        toJSON: () => ({
          id: 1,
          reviewerId: null,
          progress: [{ status: "Selesai" }],
        }),
        reviewerId: null,
        progress: [{ status: "Selesai" }],
      },
      {
        toJSON: () => ({
          id: 2,
          reviewerId: 5,
          progress: [{ status: "Pending" }],
        }),
        reviewerId: 5,
        progress: [{ status: "Pending" }],
      },
    ];

    UserSubmissions.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: mockRows,
    });

    const response = await request(app)
      .get("/api/v1/user-submission/get-by-submision-type/status/10")
      .query({ page: 1, limit: 10 })
      .set("Authorization", "Bearer mock-token");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.currentPage).toBe(1);
    expect(response.body.totalPages).toBe(Math.ceil(2 / 10));
    expect(response.body.totalUserSubmissions).toBe(2);
    expect(response.body.limit).toBe(10);

    expect(Array.isArray(response.body.filteredUserSubmissions)).toBe(true);

    // Hanya item dengan progress.status === 'Selesai' yang masuk
    expect(response.body.filteredUserSubmissions.length).toBe(1);
    expect(response.body.filteredUserSubmissions[0].progress.status).toBe(
      "Selesai"
    );

    // reviewerId null berubah jadi "-"
    expect(response.body.filteredUserSubmissions[0].reviewerId).toBe("-");
  });

  it("should return 404 if no user submissions found", async () => {
    UserSubmissions.findAndCountAll.mockResolvedValue({
      count: 0,
      rows: [],
    });

    const response = await request(app)
      .get("/api/v1/user-submission/get-by-submision-type/status/10")
      .query({ page: 1, limit: 10 })
      .set("Authorization", "Bearer mock-token");

    expect(response.status).toBe(404);
    expect(response.body.status).toBe("Failed");
    expect(response.body.message).toBe("UserSubmissions tidak ditemukan");
  });

  it("should handle errors and return 500", async () => {
    UserSubmissions.findAndCountAll.mockRejectedValue(new Error("DB error"));

    const response = await request(app)
      .get("/api/v1/user-submission/get-by-submision-type/status/10")
      .query({ page: 1, limit: 10 })
      .set("Authorization", "Bearer mock-token");

    expect(response.status).toBe(500);
    expect(response.body.status).toBe("Error");
    expect(response.body.message).toBe("DB error");
  });
});

describe("GET /api/v1/user-submission/progress/:id", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return user submission with progress details", async () => {
    const mockUserSubmission = {
      id: 1,
      reviewer: { id: 10, fullname: "Jane Reviewer" },
      progress: [
        {
          id: 101,
          status: "Selesai",
          revisionFile: { id: 1001, fileName: "file.pdf" },
        },
      ],
      submission: { id: 20, submissionScheme: "Scheme A" },
      toJSON() {
        return this;
      },
    };

    UserSubmissions.findOne.mockResolvedValue(mockUserSubmission);

    const response = await request(app)
      .get("/api/v1/user-submission/progress/1")
      .set("Authorization", "Bearer mock-token");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.userSubmission).toBeDefined();
    expect(response.body.userSubmission.id).toBe(1);
    expect(response.body.userSubmission.reviewer.fullname).toBe(
      "Jane Reviewer"
    );
    expect(Array.isArray(response.body.userSubmission.progress)).toBe(true);
    expect(response.body.userSubmission.progress[0].status).toBe("Selesai");
    expect(response.body.userSubmission.submission.submissionScheme).toBe(
      "Scheme A"
    );

    expect(UserSubmissions.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "1" },
        include: expect.arrayContaining([
          expect.objectContaining({ as: "reviewer" }),
          expect.objectContaining({ as: "progress" }),
          expect.objectContaining({ as: "submission" }),
        ]),
      })
    );
  });

  it("should handle errors and return 500", async () => {
    UserSubmissions.findOne.mockRejectedValue(new Error("DB error"));

    const response = await request(app)
      .get("/api/v1/user-submission/progress/1")
      .set("Authorization", "Bearer mock-token");

    expect(response.status).toBe(500);
    expect(response.body.status).toBe("Error");
    expect(response.body.message).toBe("DB error");
  });
});

describe("GET /api/v1/user-submission/progress", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return all progress records with status 200", async () => {
    const mockProgress = [
      { id: 1, status: "pending" },
      { id: 2, status: "completed" },
    ];

    Progresses.findAll.mockResolvedValue(mockProgress);

    const response = await request(app)
      .get("/api/v1/user-submission/progress")
      .set("Authorization", "Bearer mock-token");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("success");
    expect(Array.isArray(response.body.progress)).toBe(true);
    expect(response.body.progress.length).toBe(2);
    expect(response.body.progress[0].status).toBe("pending");

    expect(Progresses.findAll).toHaveBeenCalled();
  });

  it("should handle errors and return 500", async () => {
    Progresses.findAll.mockRejectedValue(new Error("DB failure"));

    const response = await request(app)
      .get("/api/v1/user-submission/progress")
      .set("Authorization", "Bearer mock-token");

    expect(response.status).toBe(500);
    expect(response.body.status).toBe("Error");
    expect(response.body.message).toBe("DB failure");
  });
});

describe("GET /api/v1/user-submission/by-reviewer", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return paginated user submissions filtered by reviewerId", async () => {
    const mockCount = 3;
    const mockRows = [
      { id: 1, reviewerId: 10, toJSON: () => ({ id: 1, reviewerId: 10 }) },
      { id: 2, reviewerId: 10, toJSON: () => ({ id: 2, reviewerId: 10 }) },
      { id: 3, reviewerId: 10, toJSON: () => ({ id: 3, reviewerId: 10 }) },
    ];

    UserSubmissions.findAndCountAll.mockResolvedValue({
      count: mockCount,
      rows: mockRows,
    });

    // Mock user in req.user
    const mockUser = { id: 1 };

    // Mock middleware to inject req.user (simplified)
    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });

    const response = await request(app)
      .get("/api/v1/user-submission/by-reviewer")
      .query({ page: 1, limit: 10 })
      .set("Authorization", "Bearer mocktoken");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.currentPage).toBe(1);
    expect(response.body.limit).toBe(10);
    expect(response.body.totalUserSubmissions).toBe(mockCount);
    expect(response.body.totalPages).toBe(Math.ceil(mockCount / 10));
    expect(Array.isArray(response.body.userSubmissions)).toBe(true);
    expect(response.body.userSubmissions.length).toBe(mockRows.length);

    expect(UserSubmissions.findAndCountAll).toHaveBeenCalledTimes(1);
    expect(UserSubmissions.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reviewerId: mockUser.id },
        limit: 10,
        offset: 0,
        order: [["id", "DESC"]],
        distinct: true,
      })
    );
  });

  it("should handle errors and pass to next middleware", async () => {
    UserSubmissions.findAndCountAll.mockRejectedValue(new Error("DB Error"));

    const mockUser = { id: 10 };
    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });

    const next = jest.fn();

    const {
      getSubmissionsByReviewerId,
    } = require("../app/controllers/userSubmissionController"); // sesuaikan path

    // We create mock req, res, next
    const req = { user: mockUser, query: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await getSubmissionsByReviewerId(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].message).toBe("DB Error");
  });
});

describe("GET /api/v1/user-submission/by-user", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return paginated user submissions filtered by userId", async () => {
    const mockSubmissions = [
      {
        id: 1,
        updatedAt: new Date("2024-01-01"),
        submission: { updatedAt: new Date("2024-01-02") },
        progress: [
          { updatedAt: new Date("2024-01-03") },
          { updatedAt: new Date("2024-01-01") },
        ],
      },
      {
        id: 2,
        updatedAt: new Date("2024-01-04"),
        submission: { updatedAt: new Date("2024-01-04") },
        progress: [],
      },
    ];

    UserSubmissions.findAndCountAll = jest.fn().mockResolvedValue({
      count: 2,
      rows: mockSubmissions,
    });

    const response = await request(app)
      .get("/api/v1/user-submission/by-user")
      .query({ page: 1, limit: 10 });

    expect(response.status).toBe(200);
    expect(UserSubmissions.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        distinct: true,
        limit: 10,
        offset: 0,
        where: { userId: 1 },
        include: expect.any(Array),
        order: [["id", "ASC"]],
      })
    );

    const getMaxUpdatedAt = (submission) => {
      const updatedAtTimestamps = [
        new Date(submission.updatedAt).getTime(),
        new Date(submission.submission?.updatedAt || 0).getTime(),
        ...submission.progress.map((p) => new Date(p.updatedAt).getTime()),
      ];
      return Math.max(...updatedAtTimestamps);
    };

    const firstUpdated = getMaxUpdatedAt(
      response.body.userSubmissionsSorted[0]
    );
    const secondUpdated = getMaxUpdatedAt(
      response.body.userSubmissionsSorted[1]
    );

    expect(firstUpdated).toBeGreaterThanOrEqual(secondUpdated);
  });

  it("should handle internal server error gracefully", async () => {
    UserSubmissions.findAndCountAll = jest
      .fn()
      .mockRejectedValue(new Error("DB error"));

    const response = await request(app).get("/api/v1/user-submission/by-user");

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message", "DB error");
  });
});

describe("GET /api/v1/user-submission/admin-dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return dashboard data for admin", async () => {
    Copyrights.count.mockResolvedValue(5);
    Patents.count.mockResolvedValue(3);
    Brands.count.mockResolvedValue(4);
    IndustrialDesigns.count.mockResolvedValue(2);

    Submissions.count.mockImplementation(({ where }) => {
      if (where?.submissionScheme === "pendanaan") return Promise.resolve(7);
      if (where?.submissionScheme === "mandiri") return Promise.resolve(8);
      return Promise.resolve(0);
    });

    Faqs.count.mockResolvedValue(10);
    Documents.count.mockResolvedValue(20);

    // Mock UserSubmissions.findAll
    UserSubmissions.findAll.mockResolvedValue([
      {
        id: 1,
        createdAt: new Date("2024-01-01"),
        user: { fullname: "John Doe" },
        submission: {
          submissionScheme: "pendanaan",
          submissionType: { title: "Hak Cipta" },
        },
        progress: { status: "Submitted" },
      },
    ]);

    const response = await request(app).get(
      "/api/v1/user-submission/admin-dashboard"
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("totalPengajuan");
    expect(response.body.totalPengajuan).toEqual({
      hakCipta: 5,
      paten: 3,
      merek: 4,
      desainIndustri: 2,
    });

    expect(response.body).toHaveProperty("totalPendanaan");
    expect(response.body.totalPendanaan).toEqual({
      pendanaan: 7,
      mandiri: 8,
    });

    expect(response.body).toHaveProperty("faq", 10);
    expect(response.body).toHaveProperty("unduhan", 20);

    expect(response.body.pengajuanTerakhir[0]).toEqual(
      expect.objectContaining({
        id: 1,
        namaPengguna: "John Doe",
        jenisPengajuan: "Hak Cipta",
        pendanaan: "pendanaan",
        progres: "Submitted",
        waktuPengajuan: expect.any(String),
      })
    );

    expect(response.body).toHaveProperty("berdasarkanGelombang");
    expect(response.body).toHaveProperty("berdasarkanTahun");

    expect(Array.isArray(response.body.berdasarkanGelombang.data)).toBe(true);
    expect(Array.isArray(response.body.berdasarkanTahun.data)).toBe(true);
  });

  it("should handle server errors gracefully", async () => {
    Copyrights.count.mockRejectedValue(new Error("DB Error"));

    const response = await request(app).get(
      "/api/v1/user-submission/admin-dashboard"
    );

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("DB Error");
  });
});

describe("restoreUserSubmission controller", () => {
  let mockTransaction;

  beforeEach(() => {
    mockTransaction = {
      commit: jest.fn().mockResolvedValue(),
      rollback: jest.fn().mockResolvedValue(),
    };

    sequelize.transaction.mockResolvedValue(mockTransaction);

    jest.clearAllMocks();
  });

  it("should restore user submission and return success message", async () => {
    const fakeUserSubmission = {
      id: 1,
      restore: jest.fn().mockResolvedValue(),
      submission: {
        id: 10,
        copyrightId: 20,
        patentId: 21,
        brandId: 22,
        industrialDesignId: 23,
        termsConditions: [{ id: 100 }, { id: 101 }],
        setTermsConditions: jest.fn().mockResolvedValue(),
      },
      progress: [{ id: 5 }, { id: 6 }],
    };

    UserSubmissions.findByPk.mockResolvedValue(fakeUserSubmission);
    Submissions.restore.mockResolvedValue();
    Progresses.restore.mockResolvedValue();
    PersonalDatas.restore.mockResolvedValue();
    RevisionFiles.restore.mockResolvedValue();
    Copyrights.restore.mockResolvedValue();
    Patents.restore.mockResolvedValue();
    Brands.restore.mockResolvedValue();
    IndustrialDesigns.restore.mockResolvedValue();

    const req = {
      params: { id: "1" },
      user: { id: 99 },
      headers: { "user-agent": "jest-agent" },
      ip: "127.0.0.1",
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await restoreUserSubmission(req, res, next);

    expect(UserSubmissions.findByPk).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({
        paranoid: false,
        include: expect.any(Array),
        transaction: mockTransaction,
      })
    );

    expect(fakeUserSubmission.restore).toHaveBeenCalledWith({
      transaction: mockTransaction,
    });
    expect(Submissions.restore).toHaveBeenCalledWith({
      where: { id: 10 },
      transaction: mockTransaction,
    });
    expect(Progresses.restore).toHaveBeenCalledWith({
      where: { userSubmissionId: "1" },
      transaction: mockTransaction,
    });
    expect(PersonalDatas.restore).toHaveBeenCalledWith({
      where: { submissionId: 10 },
      transaction: mockTransaction,
    });
    expect(RevisionFiles.restore).toHaveBeenCalledWith({
      where: { progressId: [5, 6] },
      transaction: mockTransaction,
    });
    expect(
      fakeUserSubmission.submission.setTermsConditions
    ).toHaveBeenCalledWith([100, 101], { transaction: mockTransaction });
    expect(Copyrights.restore).toHaveBeenCalledWith({
      where: { id: 20 },
      transaction: mockTransaction,
    });
    expect(Patents.restore).toHaveBeenCalledWith({
      where: { id: 21 },
      transaction: mockTransaction,
    });
    expect(Brands.restore).toHaveBeenCalledWith({
      where: { id: 22 },
      transaction: mockTransaction,
    });
    expect(IndustrialDesigns.restore).toHaveBeenCalledWith({
      where: { id: 23 },
      transaction: mockTransaction,
    });
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 99,
        action: "Restore Pengajuan",
        description: expect.stringContaining("UserSubmission ID 1"),
        device: "jest-agent",
        ipAddress: "127.0.0.1",
      })
    );

    expect(mockTransaction.commit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        message: expect.stringMatching(/berhasil direstore/i),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next with 404 error if user submission not found", async () => {
    UserSubmissions.findByPk.mockResolvedValue(null);

    const req = {
      params: { id: "2" },
      user: { id: 99 },
      headers: {},
      ip: "::1",
    };
    const res = {};
    const next = jest.fn();

    await restoreUserSubmission(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(404);
    expect(next.mock.calls[0][0].message).toMatch(/tidak ditemukan/i);
  });

  it("should rollback and call next with 500 on error", async () => {
    UserSubmissions.findByPk.mockImplementation(() => {
      throw new Error("DB Error");
    });

    const req = {
      params: { id: "3" },
      user: { id: 99 },
      headers: {},
      ip: "::1",
    };
    const res = {};
    const next = jest.fn();

    await restoreUserSubmission(req, res, next);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(500);
    expect(next.mock.calls[0][0].message).toBe("DB Error");
  });
});

describe("deleteUserSubmission controller", () => {
  let mockTransaction;

  beforeEach(() => {
    mockTransaction = {
      commit: jest.fn().mockResolvedValue(),
      rollback: jest.fn().mockResolvedValue(),
    };

    sequelize.transaction.mockResolvedValue(mockTransaction);

    jest.clearAllMocks();
  });

  it("should delete user submission and related data, then return success message", async () => {
    const req = {
      params: { id: "1" },
      user: { id: "user-123" },
      headers: { "user-agent": "jest-test-agent" },
      ip: "127.0.0.1",
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    // Mock data returned by UserSubmissions.findByPk
    const userSubmissionMock = {
      id: 1,
      progress: [{ id: 10 }, { id: 11 }],
      submission: {
        id: 100,
        copyrightId: 20,
        patentId: 21,
        brandId: 22,
        industrialDesignId: 23,
        termsConditions: [{ id: 30 }],
        personalDatas: [{ id: 40 }],
        setTermsConditions: jest.fn().mockResolvedValue(),
      },
    };

    UserSubmissions.findByPk.mockResolvedValue(userSubmissionMock);

    // Mock destroy calls resolve
    RevisionFiles.destroy.mockResolvedValue();
    Progresses.destroy.mockResolvedValue();
    PersonalDatas.destroy.mockResolvedValue();
    UserSubmissions.destroy.mockResolvedValue();
    Submissions.destroy.mockResolvedValue();
    Copyrights.destroy.mockResolvedValue();
    Patents.destroy.mockResolvedValue();
    Brands.destroy.mockResolvedValue();
    IndustrialDesigns.destroy.mockResolvedValue();

    logActivity.mockResolvedValue();

    await deleteUserSubmission(req, res, next);

    expect(sequelize.transaction).toHaveBeenCalled();

    expect(UserSubmissions.findByPk).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({
        include: expect.any(Array),
        transaction: mockTransaction,
      })
    );

    expect(RevisionFiles.destroy).toHaveBeenCalledWith({
      where: { progressId: [10, 11] },
      transaction: mockTransaction,
    });

    expect(Progresses.destroy).toHaveBeenCalledWith({
      where: { userSubmissionId: "1" },
      transaction: mockTransaction,
    });

    expect(PersonalDatas.destroy).toHaveBeenCalledWith({
      where: { submissionId: 100 },
      transaction: mockTransaction,
    });

    expect(
      userSubmissionMock.submission.setTermsConditions
    ).toHaveBeenCalledWith([], { transaction: mockTransaction });

    expect(UserSubmissions.destroy).toHaveBeenCalledWith({
      where: { id: "1" },
      transaction: mockTransaction,
    });

    expect(Submissions.destroy).toHaveBeenCalledWith({
      where: { id: 100 },
      transaction: mockTransaction,
    });

    expect(Copyrights.destroy).toHaveBeenCalledWith({
      where: { id: 20 },
      transaction: mockTransaction,
    });

    expect(Patents.destroy).toHaveBeenCalledWith({
      where: { id: 21 },
      transaction: mockTransaction,
    });

    expect(Brands.destroy).toHaveBeenCalledWith({
      where: { id: 22 },
      transaction: mockTransaction,
    });

    expect(IndustrialDesigns.destroy).toHaveBeenCalledWith({
      where: { id: 23 },
      transaction: mockTransaction,
    });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        action: "Menghapus Pengajuan",
        description: expect.stringContaining("UserSubmission ID 1"),
        device: "jest-test-agent",
        ipAddress: "127.0.0.1",
      })
    );

    expect(mockTransaction.commit).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        message: expect.stringContaining("berhasil dihapus"),
      })
    );

    expect(next).not.toHaveBeenCalled();
  });

  it("should call next with 404 error if user submission not found", async () => {
    const req = { params: { id: "99" } };
    const res = {};
    const next = jest.fn();

    UserSubmissions.findByPk.mockResolvedValue(null);

    await deleteUserSubmission(req, res, next);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].message).toMatch(/tidak ditemukan/i);
    expect(next.mock.calls[0][0].statusCode).toBe(404);
  });

  it("should rollback transaction and call next with 500 on error", async () => {
    const req = { params: { id: "1" } };
    const res = {};
    const next = jest.fn();

    UserSubmissions.findByPk.mockRejectedValue(new Error("DB failure"));

    await deleteUserSubmission(req, res, next);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].message).toBe("DB failure");
    expect(next.mock.calls[0][0].statusCode).toBe(500);
  });
});
