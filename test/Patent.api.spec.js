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

describe("POST /api/v1/patent/type", () => {
  it("should create a new patent type successfully", async () => {
    PatentTypes.create = jest
      .fn()
      .mockResolvedValue({ id: 1, title: "Inovasi Teknologi" });

    const response = await request(app)
      .post("/api/v1/patent/type")
      .send({ title: "Inovasi Teknologi" })
      .set("Authorization", "Bearer mock-token");

    expect(response.status).toBe(201);
    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Kategori paten berhasil dibuat");
    expect(PatentTypes.create).toHaveBeenCalledWith({
      title: "Inovasi Teknologi",
    });
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Menambah Kategori Paten",
        description: "Admin User berhasil menambah kategori paten.",
      })
    );
  });

  it("should return 500 if an error occurs", async () => {
    const { PatentTypes } = require("../app/models");

    PatentTypes.create = jest
      .fn()
      .mockRejectedValue(new Error("Database error"));

    const response = await request(app)
      .post("/api/v1/patent/type")
      .send({ title: "Gagal Insert" })
      .set("Authorization", "Bearer mock-token");

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Database error");
  });
});

describe("POST /api/v1/patent", () => {
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

describe("PATCH /api/v1/patent/type/:id", () => {
  it("should successfully update a patent type", async () => {
    // Arrange: mock implementasi PatentTypes.update
    PatentTypes.update.mockResolvedValue([1]); // [1] berarti 1 row diubah

    const response = await request(app)
      .patch("/api/v1/patent/type/1")
      .send({ title: "Updated Patent Type" });

    // Assert response
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Kategori paten berhasil diperbarui");

    // Assert pemanggilan fungsi
    expect(PatentTypes.update).toHaveBeenCalledWith(
      { title: "Updated Patent Type" },
      { where: { id: "1" } } // ingat, req.params.id itu string
    );
  });

  it("should handle error and return 500 if update fails", async () => {
    PatentTypes.update.mockRejectedValue(new Error("Database error"));

    const response = await request(app)
      .patch("/api/v1/patent/type/1")
      .send({ title: "New Title" });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Database error");
  });
});
