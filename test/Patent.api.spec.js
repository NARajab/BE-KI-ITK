jest.mock("../app/models", () => ({
  Patents: {
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  Progresses: {
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  },
  Users: {
    findAll: jest.fn(),
  },
  PersonalDatas: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    bulkCreate: jest.fn(),
  },
  PatentTypes: {
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
  },
  Submissions: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
  },
  UserSubmissions: {
    create: jest.fn(),
    findOne: jest.fn(),
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
  UserSubmissions,
  Users,
  Submissions,
  Progresses,
  Patents,
  PersonalDatas,
  PatentTypes,
} = require("../app/models");
const fs = require("fs");
const { Op } = require("sequelize");
const logActivity = require("../app/helpers/activityLogs");
const sendEmail = require("../emails/services/sendMail");

describe("POST Create Patent Submission", () => {
  beforeEach(() => {
    Patents.create.mockResolvedValue({ id: 10 });
    Submissions.create.mockResolvedValue({ id: 20 });
    PersonalDatas.bulkCreate.mockResolvedValue(true);
    UserSubmissions.create.mockResolvedValue({ id: 30 });
    Progresses.create.mockResolvedValue(true);
    Users.findAll.mockResolvedValue([
      { email: "admin1@example.com" },
      { email: "admin2@example.com" },
    ]);
    sendEmail.mockResolvedValue(true);
    logActivity.mockResolvedValue(true);
  });

  it("should successfully create a new patent submission", async () => {
    const response = await request(app)
      .post("/api/v1/patent")
      .set("Authorization", "Bearer mock-token")
      .field("submissionTypeId", 1)
      .field(
        "personalDatas",
        JSON.stringify([
          {
            name: "Tester One",
            address: "Jl. Satu",
          },
        ])
      )
      .attach("draftPatentApplicationFile", Buffer.from("dummy content"), {
        filename: "draft.pdf",
        contentType: "application/pdf",
      })
      .attach("ktp", Buffer.from("dummy ktp"), {
        filename: "ktp.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe("success");
    expect(Patents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        draftPatentApplicationFile: expect.any(String),
      })
    );

    expect(Submissions.create).toHaveBeenCalledWith({
      submissionTypeId: "1",
      patentId: 10,
    });
    expect(PersonalDatas.bulkCreate).toHaveBeenCalledWith([
      {
        name: "Tester One",
        address: "Jl. Satu",
        submissionId: 20,
        ktp: expect.any(String),
        isLeader: true,
      },
    ]);
    expect(UserSubmissions.create).toHaveBeenCalledWith({
      userId: 1,
      submissionId: 20,
      centralStatus: "Draft",
    });
    expect(Progresses.create).toHaveBeenCalledWith({
      userSubmissionId: 30,
      status: "Menunggu",
      createdBy: "Admin User",
    });
    expect(sendEmail).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalled();
  });

  it("should return 500 if Patents.create fails", async () => {
    Patents.create.mockRejectedValue(new Error("DB error"));

    const response = await request(app)
      .post("/api/v1/patent")
      .set("Authorization", "Bearer mock-token")
      .field("submissionTypeId", 1)
      .field("personalDatas", JSON.stringify([]));

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("DB error");
  });
});

describe("PATCH Update Patent Submission", () => {
  const baseUrl = "/api/v1/patent";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 404 if patent is not found", async () => {
    Patents.findByPk.mockResolvedValue(null);

    const res = await request(app)
      .patch(`${baseUrl}/1`)
      .send({ inventionTitle: "Updated Title" });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Patent tidak ditemukan");
  });

  it("should return 404 if submission is not found", async () => {
    Patents.findByPk.mockResolvedValue({ id: 1 });
    Submissions.findOne.mockResolvedValue(null);

    const res = await request(app)
      .patch(`${baseUrl}/1`)
      .send({ inventionTitle: "Updated Title" });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Submission tidak ditemukan");
  });

  it("should return 404 if user submission is not found", async () => {
    Patents.findByPk.mockResolvedValue({ id: 1 });
    Submissions.findOne.mockResolvedValue({ id: 10 });
    UserSubmissions.findOne.mockResolvedValue(null);

    const res = await request(app)
      .patch(`${baseUrl}/1`)
      .send({ inventionTitle: "Updated Title" });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("UserSubmission tidak ditemukan");
  });

  it("should return 404 if progress is not found", async () => {
    Patents.findByPk.mockResolvedValue({ id: 1 });
    Submissions.findOne.mockResolvedValue({ id: 10 });
    UserSubmissions.findOne.mockResolvedValue({ id: 100 });
    Progresses.findOne.mockResolvedValue(null);

    const res = await request(app)
      .patch(`${baseUrl}/1`)
      .send({ inventionTitle: "Updated Title" });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Progress tidak ditemukan");
  });

  it("should update the patent and return 200", async () => {
    const mockPatent = {
      id: 1,
      update: jest.fn(),
      entirePatentDocument: "old.pdf",
      description: "old-desc.pdf",
      abstract: "old-abs.pdf",
      claim: "old-claim.pdf",
      inventionImage: "old-img.jpg",
      statementInventionOwnership: "old-own.pdf",
      letterTransferRightsInvention: "old-rights.pdf",
      letterPassedReviewStage: "old-stage.pdf",
    };

    Patents.findByPk.mockResolvedValue(mockPatent);
    Submissions.findOne.mockResolvedValue({ id: 10 });
    UserSubmissions.findOne.mockResolvedValue({ id: 100 });
    Progresses.findOne.mockResolvedValue({ id: 200 });
    Users.findAll.mockResolvedValue([{ email: "admin@example.com" }]);
    Progresses.update.mockResolvedValue();
    sendEmail.mockResolvedValue();
    logActivity.mockResolvedValue();

    const res = await request(app)
      .patch(`${baseUrl}/1`)
      .field("inventionTitle", "Updated Title")
      .field("patentTypeId", "2")
      .field("numberClaims", "5")
      .attach("entirePatentDocument", Buffer.from("file1.pdf"))
      .attach("description", Buffer.from("file2.pdf"))
      .attach("abstract", Buffer.from("file3.pdf"))
      .attach("claim", Buffer.from("file4.pdf"))
      .attach("inventionImage", Buffer.from("file5.pdf"))
      .attach("statementInventionOwnership", Buffer.from("file6.pdf"))
      .attach("letterTransferRightsInvention", Buffer.from("file7.pdf"))
      .attach("letterPassedReviewStage", Buffer.from("file8.pdf"));

    expect(res.statusCode).toBe(200);
    expect(mockPatent.update).toHaveBeenCalled();
    expect(Progresses.update).toHaveBeenCalledWith(
      { isStatus: true },
      { where: { id: 200 } }
    );
    expect(sendEmail).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalled();
    expect(res.body.message).toBe("Patent berhasil diperbaharui");
  });
});
