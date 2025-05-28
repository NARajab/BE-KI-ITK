jest.mock("../app/models", () => ({
  IndustrialDesigns: {
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
  TypeDesigns: {
    create: jest.fn(),
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
  },
  SubTypeDesigns: {
    create: jest.fn(),
    update: jest.fn(),
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
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
  Submissions,
  IndustrialDesigns,
  PersonalDatas,
  TypeDesigns,
  SubTypeDesigns,
  Progresses,
  Users,
} = require("../app/models");
const fs = require("fs");
const { Op } = require("sequelize");
const logActivity = require("../app/helpers/activityLogs");
const sendEmail = require("../emails/services/sendMail");

describe("POST Create Industrial Design Submission", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a new Industrial Design submission successfully", async () => {
    // Mock files
    const mockDraftFile = { filename: "draft-file.pdf" };
    const mockKtpFiles = [{ filename: "ktp1.jpg" }, { filename: "ktp2.jpg" }];

    // Mock data
    IndustrialDesigns.create = jest.fn().mockResolvedValue({
      id: 1,
      draftDesainIndustriApplicationFile: "draft-file.pdf",
    });

    Submissions.create = jest.fn().mockResolvedValue({
      id: 10,
      submissionTypeId: 5,
      industrialDesignId: 1,
    });

    PersonalDatas.bulkCreate = jest.fn().mockResolvedValue(true);

    UserSubmissions.create = jest.fn().mockResolvedValue({
      id: 100,
      userId: 1,
      submissionId: 10,
      centralStatus: "Draft",
    });

    Progresses.create = jest.fn().mockResolvedValue(true);

    Users.findAll = jest
      .fn()
      .mockResolvedValue([
        { email: "admin1@example.com" },
        { email: "admin2@example.com" },
      ]);

    const mockSendEmail = jest.fn().mockResolvedValue(true);
    jest.mock("../emails/services/sendMail", () => mockSendEmail);

    const SendEmail = require("../emails/services/sendMail");
    SendEmail.mockResolvedValue(true);

    logActivity.mockResolvedValue();

    const personalDatas = [
      { name: "User 1", age: 30 },
      { name: "User 2", age: 25 },
    ];

    const res = await request(app)
      .post("/api/v1/design-industri")
      .field("submissionTypeId", 5)
      .field("personalDatas", JSON.stringify(personalDatas))
      .attach(
        "draftDesainIndustriApplicationFile",
        Buffer.from("file content"),
        {
          filename: "draft-file.pdf",
        }
      )
      .attach("ktp", Buffer.from("ktp1 content"), { filename: "ktp1.jpg" })
      .attach("ktp", Buffer.from("ktp2 content"), { filename: "ktp2.jpg" })
      .set("Authorization", "Bearer mock-token")
      .set("user-agent", "jest-test-agent")
      .set("Accept", "application/json");

    expect(IndustrialDesigns.create).toHaveBeenCalledWith({
      draftDesainIndustriApplicationFile: expect.any(String),
    });

    expect(Submissions.create).toHaveBeenCalledWith({
      submissionTypeId: "5",
      industrialDesignId: 1,
    });

    expect(PersonalDatas.bulkCreate).toHaveBeenCalledWith([
      {
        name: "User 1",
        age: 30,
        submissionId: 10,
        ktp: expect.any(String),
        isLeader: true,
      },
      {
        name: "User 2",
        age: 25,
        submissionId: 10,
        ktp: expect.any(String),
        isLeader: false,
      },
    ]);

    expect(UserSubmissions.create).toHaveBeenCalledWith({
      userId: 1,
      submissionId: 10,
      centralStatus: "Draft",
    });

    expect(Progresses.create).toHaveBeenCalledWith({
      userSubmissionId: 100,
      status: "Menunggu",
      createdBy: "Admin User",
    });

    expect(Users.findAll).toHaveBeenCalledWith({ where: { role: "admin" } });

    expect(SendEmail).toHaveBeenCalledWith({
      to: ["admin1@example.com", "admin2@example.com"],
      subject: "Pengajuan Desain Industri Baru",
      html: expect.any(String),
    });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Menambah Pengajuan Desain Industri",
        description: expect.stringContaining(
          "berhasil menambah pengajuan desain industri"
        ),
        device: "jest-test-agent",
        ipAddress: expect.any(String),
      })
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Pengajuan Desain Industri berhasil ditambahkan",
      userSubmissions: expect.objectContaining({
        id: 100,
        userId: 1,
        submissionId: 10,
        centralStatus: "Draft",
      }),
    });
  });

  it("should call next with error when create fails", async () => {
    IndustrialDesigns.create = jest
      .fn()
      .mockRejectedValue(new Error("DB create error"));

    const res = await request(app)
      .post("/api/v1/design-industri")
      .send({ submissionTypeId: 5, personalDatas: JSON.stringify([]) })
      .set("Authorization", "Bearer mock-token")
      .set("user-agent", "jest-test-agent")
      .set("Accept", "application/json");

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("message", "DB create error");
  });
});

describe("PATCH Update Industrial Design Submission", () => {
  const dummyId = "1";
  const dummyUser = {
    id: 10,
    fullname: "John Doe",
    email: "john@example.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update industrial design successfully", async () => {
    IndustrialDesigns.findByPk.mockResolvedValue({
      id: dummyId,
      looksPerspective: "old_looks.jpg",
      frontView: "old_front.jpg",
      backView: null,
      rightSideView: null,
      lefttSideView: null,
      topView: null,
      downView: null,
      moreImages: null,
      letterTransferDesignRights: null,
      designOwnershipLetter: null,
      update: jest.fn().mockResolvedValue(true),
    });

    Submissions.findOne.mockResolvedValue({ id: 101 });
    UserSubmissions.findOne.mockResolvedValue({ id: 201 });

    Progresses.findOne.mockResolvedValue({
      id: 301,
    });

    Progresses.update.mockResolvedValue([1]);

    Users.findAll.mockResolvedValue([{ email: "admin@example.com" }]);

    fs.existsSync.mockReturnValue(true);
    fs.unlinkSync.mockReturnValue();

    const response = await request(app)
      .patch(`/api/v1/design-industri/${dummyId}`)
      .set("Content-Type", "multipart/form-data")
      .set("Authorization", `Bearer mockToken`)
      .field("titleDesign", "Updated Design Title")
      .field("type", "some-type")
      .field("typeDesignId", "2")
      .field("subtypeDesignId", "3")
      .field("claim", JSON.stringify(["claim1", "claim2"]))
      .attach("looksPerspective", Buffer.from("file"), "plook.jpg")
      .attach("frontView", Buffer.from("file"), "front.jpg");

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "Desain Industri berhasil diperbarui"
    );

    expect(IndustrialDesigns.findByPk).toHaveBeenCalledWith(dummyId);
    expect(Submissions.findOne).toHaveBeenCalledWith({
      where: { industrialDesignId: dummyId },
    });
    expect(UserSubmissions.findOne).toHaveBeenCalledWith({
      where: { submissionId: 101 },
    });
    expect(Progresses.findOne).toHaveBeenCalledWith({
      where: { userSubmissionId: 201 },
      order: [["id", "DESC"]],
    });

    expect(Progresses.update).toHaveBeenCalledWith(
      { isStatus: true },
      { where: { id: 301 } }
    );

    expect(Users.findAll).toHaveBeenCalledWith({ where: { role: "admin" } });
  });

  it("should return 404 if industrial design not found", async () => {
    IndustrialDesigns.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/v1/design-industri/${dummyId}`)
      .set("Authorization", `Bearer mockToken`)
      .field("titleDesign", "New Title");

    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty(
      "message",
      "Desain Industri tidak ditemukan"
    );
  });

  it("should return 500 on unexpected error", async () => {
    IndustrialDesigns.findByPk.mockRejectedValue(new Error("Unexpected error"));

    const response = await request(app)
      .patch(`/api/v1/design-industri/${dummyId}`)
      .set("Authorization", `Bearer mockToken`)
      .field("titleDesign", "Any");

    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty("message", "Unexpected error");
  });
});
