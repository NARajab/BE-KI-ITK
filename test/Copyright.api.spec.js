jest.mock("../app/models", () => ({
  Copyrights: {
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
  TypeCreations: {
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
  },
  SubTypeCreations: {
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    restore: jest.fn(),
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
  Copyrights,
  PersonalDatas,
} = require("../app/models");
const fs = require("fs");
const { Op } = require("sequelize");
const logActivity = require("../app/helpers/activityLogs");
const sendEmail = require("../emails/services/sendMail");

describe("POST Create Copyright Submission", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a new copyright submission successfully", async () => {
    const mockRequestBody = {
      titleInvention: "Invention Title",
      typeCreationId: 1,
      subTypeCreationId: 1,
      countryFirstAnnounced: "Indonesia",
      cityFirstAnnounced: "Jakarta",
      timeFirstAnnounced: "2025-05-24T10:00:00Z",
      briefDescriptionCreation: "Brief description here",
      submissionTypeId: 2,
      personalDatas: JSON.stringify([
        { name: "John Doe", ktp: null },
        { name: "Jane Doe", ktp: null },
      ]),
      exampleCreation: null,
    };

    const mockFiles = {
      statementLetter: [{ filename: "statement.pdf" }],
      letterTransferCopyright: [{ filename: "transfer.pdf" }],
      exampleCreation: [{ filename: "example.pdf" }],
      ktp: [{ filename: "ktp1.jpg" }, { filename: "ktp2.jpg" }],
    };

    // Mock semua fungsi model dan helper yang dipanggil
    Copyrights.create = jest.fn().mockResolvedValue({ id: 10 });
    Submissions.create = jest.fn().mockResolvedValue({ id: 20 });
    PersonalDatas.bulkCreate = jest.fn().mockResolvedValue();
    UserSubmissions.create = jest.fn().mockResolvedValue({ id: 30 });
    Progresses.create = jest.fn().mockResolvedValue();
    Users.findAll = jest
      .fn()
      .mockResolvedValue([
        { email: "admin1@example.com" },
        { email: "admin2@example.com" },
      ]);
    sendEmail.mockClear();
    logActivity.mockClear();

    const res = await request(app)
      .post("/api/v1/copyright")
      .set("Authorization", "Bearer validtoken")
      .set("user-agent", "jest-test-agent")
      .field("titleInvention", mockRequestBody.titleInvention)
      .field("typeCreationId", mockRequestBody.typeCreationId)
      .field("subTypeCreationId", mockRequestBody.subTypeCreationId)
      .field("countryFirstAnnounced", mockRequestBody.countryFirstAnnounced)
      .field("cityFirstAnnounced", mockRequestBody.cityFirstAnnounced)
      .field("timeFirstAnnounced", mockRequestBody.timeFirstAnnounced)
      .field(
        "briefDescriptionCreation",
        mockRequestBody.briefDescriptionCreation
      )
      .field("submissionTypeId", mockRequestBody.submissionTypeId)
      .field("personalDatas", mockRequestBody.personalDatas)
      .attach("statementLetter", Buffer.from("file"), "statement.pdf")
      .attach("letterTransferCopyright", Buffer.from("file"), "transfer.pdf")
      .attach("exampleCreation", Buffer.from("file"), "example.pdf")
      .attach("ktp", Buffer.from("file"), "ktp1.jpg")
      .attach("ktp", Buffer.from("file"), "ktp2.jpg");

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("Submission created successfully");
    expect(Copyrights.create).toHaveBeenCalled();
    expect(Submissions.create).toHaveBeenCalled();
    expect(PersonalDatas.bulkCreate).toHaveBeenCalled();
    expect(UserSubmissions.create).toHaveBeenCalled();
    expect(Progresses.create).toHaveBeenCalled();
    expect(Users.findAll).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalled();
  });

  it("should handle errors and return 500", async () => {
    Copyrights.create = jest.fn().mockRejectedValue(new Error("DB error"));

    const res = await request(app).post("/api/v1/copyright").send({});

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("DB error");
  });
});

describe("PATCH Update Copyright Submission", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update copyright and return success message", async () => {
    const mockId = "1";
    const mockUser = { id: 99, fullname: "Test User" };
    const mockCopyright = {
      id: mockId,
      titleInvention: "Old Title",
      statementLetter: "oldLetter.pdf",
      letterTransferCopyright: "oldTransfer.pdf",
      exampleCreation: "oldExample.pdf",
      update: jest.fn().mockResolvedValue(true),
    };
    const mockSubmission = { id: 100, copyrightId: mockId };
    const mockUserSubmission = { id: 101, submissionId: mockSubmission.id };
    const mockProgress = { id: 102 };
    const mockAdmins = [
      { email: "admin1@mail.com" },
      { email: "admin2@mail.com" },
    ];

    Copyrights.findByPk = jest.fn().mockResolvedValue(mockCopyright);
    Submissions.findOne = jest.fn().mockResolvedValue(mockSubmission);
    UserSubmissions.findOne = jest.fn().mockResolvedValue(mockUserSubmission);
    Progresses.findOne = jest.fn().mockResolvedValue(mockProgress);
    Progresses.update = jest.fn().mockResolvedValue([1]);
    Users.findAll = jest.fn().mockResolvedValue(mockAdmins);

    const res = await request(app)
      .patch(`/api/v1/copyright/${mockId}`)
      .set("Authorization", "Bearer validtoken")
      .set("user-agent", "jest-test-agent")
      .send({
        titleInvention: "New Title",
        typeCreation: "New Type",
        subTypeCreation: "New SubType",
        countryFirstAnnounced: "New Country",
        cityFirstAnnounced: "New City",
        timeFirstAnnounced: "2025-05-24",
        briefDescriptionCreation: "New description",
      });
    // Tambahkan user di req.user lewat middleware mock jika perlu
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Data Hak Cipta berhasil diperbarui.");
    expect(mockCopyright.update).toHaveBeenCalledWith({
      titleInvention: "New Title",
      typeCreation: "New Type",
      subTypeCreation: "New SubType",
      countryFirstAnnounced: "New Country",
      cityFirstAnnounced: "New City",
      timeFirstAnnounced: "2025-05-24",
      briefDescriptionCreation: "New description",
      statementLetter: "oldLetter.pdf",
      letterTransferCopyright: "oldTransfer.pdf",
      exampleCreation: "oldExample.pdf",
    });

    expect(Progresses.update).toHaveBeenCalledWith(
      { isStatus: true },
      { where: { id: mockProgress.id } }
    );

    expect(Users.findAll).toHaveBeenCalledWith({ where: { role: "admin" } });

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["admin1@mail.com", "admin2@mail.com"],
        subject: "Pembaruan Pengajuan Hak Cipta",
      })
    );

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Memperbarui Data Hak Cipta",
        description: "Admin User berhasil memperbarui data hak cipta.",
        device: "jest-test-agent",
        ipAddress: "::ffff:127.0.0.1",
      })
    );
  });

  it("should return 404 if copyright not found", async () => {
    Copyrights.findByPk = jest.fn().mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/v1/copyright/999")
      .send({ titleInvention: "Any" });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Copyright tidak ditemukan");
  });
});
