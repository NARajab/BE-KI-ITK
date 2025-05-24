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
  TypeCreations,
  SubTypeCreations,
} = require("../app/models");
const fs = require("fs");
const { Op } = require("sequelize");
const logActivity = require("../app/helpers/activityLogs");
const sendEmail = require("../emails/services/sendMail");

describe("POST /api/v1/copyright/type", () => {
  it("should create a new copyright type and return success message", async () => {
    const mockCreate = jest
      .spyOn(TypeCreations, "create")
      .mockResolvedValue({});

    const res = await request(app)
      .post("/api/v1/copyright/type")
      .send({ title: "Kategori Baru" })
      .set("User-Agent", "Jest-Test-Agent");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.message).toBe("Kategori Hak Cipta berhasil ditambahkan");
    expect(mockCreate).toHaveBeenCalledWith({ title: "Kategori Baru" });
    expect(logActivity).toHaveBeenCalledWith({
      userId: 1,
      action: "Menambah Kategori Hak Cipta",
      description: "Admin User berhasil menambah kategori hak cipta.",
      device: "Jest-Test-Agent",
      ipAddress: "::ffff:127.0.0.1",
    });
  });

  it("should handle error when create fails", async () => {
    jest
      .spyOn(TypeCreations, "create")
      .mockRejectedValue(new Error("Database error"));

    const res = await request(app)
      .post("/api/v1/copyright/type")
      .send({ title: "Kategori Error" });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Database error");
  });
});

describe("POST /api/v1/copyright/sub-type/:id", () => {
  it("should create a new sub copyright type and return success message", async () => {
    const mockCreate = jest
      .spyOn(SubTypeCreations, "create")
      .mockResolvedValue({});

    const res = await request(app)
      .post("/api/v1/copyright/sub-type/10")
      .send({ title: "Sub Kategori Baru" })
      .set("User-Agent", "Jest-Test-Agent");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.message).toBe(
      "Sub Kategori Hak Cipta berhasil ditambahkan"
    );
    expect(mockCreate).toHaveBeenCalledWith({
      typeCreationId: "10",
      title: "Sub Kategori Baru",
    });
    expect(logActivity).toHaveBeenCalledWith({
      userId: 1,
      action: "Menambah Sub Kategori Hak Cipta",
      description: "Admin User berhasil menambah sub kategori hak cipta.",
      device: "Jest-Test-Agent",
      ipAddress: expect.any(String),
    });
  });

  it("should handle error when creation fails", async () => {
    jest
      .spyOn(SubTypeCreations, "create")
      .mockRejectedValue(new Error("Database error"));

    const res = await request(app)
      .post("/api/v1/copyright/sub-type/10")
      .send({ title: "Sub Kategori Gagal" });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Database error");
  });
});

describe("GET /api/v1/copyright/type", () => {
  it("should return a paginated list of type creations without search", async () => {
    const mockData = {
      count: 3,
      rows: [
        { id: 1, title: "Kategori A" },
        { id: 2, title: "Kategori B" },
        { id: 3, title: "Kategori C" },
      ],
    };

    jest.spyOn(TypeCreations, "findAndCountAll").mockResolvedValue(mockData);

    const res = await request(app).get(
      "/api/v1/copyright/type?page=1&limit=10"
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.currentPage).toBe(1);
    expect(res.body.totalPages).toBe(1);
    expect(res.body.limit).toBe(10);
    expect(res.body.typeCreation).toEqual(mockData.rows);
    expect(TypeCreations.findAndCountAll).toHaveBeenCalledWith({
      where: {},
      limit: 10,
      offset: 0,
    });
  });

  it("should return filtered list of type creations with search", async () => {
    const mockData = {
      count: 1,
      rows: [{ id: 2, title: "Hiburan" }],
    };

    jest.spyOn(TypeCreations, "findAndCountAll").mockResolvedValue(mockData);

    const res = await request(app).get("/api/v1/copyright/type?search=hibur");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.typeCreation).toEqual(mockData.rows);
    expect(TypeCreations.findAndCountAll).toHaveBeenCalledWith({
      where: {
        title: {
          [Op.iLike]: "%hibur%",
        },
      },
      limit: 10,
      offset: 0,
    });
  });

  it("should handle internal server error", async () => {
    jest
      .spyOn(TypeCreations, "findAndCountAll")
      .mockRejectedValue(new Error("Database error"));

    const res = await request(app).get("/api/v1/copyright/type");

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Database error");
  });
});

describe("GET /api/v1/copyright/sub-type/:id", () => {
  const mockId = 1;

  it("should return a paginated list of sub type creations without search", async () => {
    const mockData = {
      count: 2,
      rows: [
        { id: 1, title: "Sub A", typeCreationId: mockId },
        { id: 2, title: "Sub B", typeCreationId: mockId },
      ],
    };

    SubTypeCreations.findAndCountAll.mockResolvedValue(mockData);

    const res = await request(app).get(`/api/v1/copyright/sub-type/${mockId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.currentPage).toBe(1);
    expect(res.body.totalPages).toBe(1);
    expect(res.body.limit).toBe(10);
    expect(res.body.subTypeCreation).toEqual(mockData.rows);
    expect(SubTypeCreations.findAndCountAll).toHaveBeenCalledWith({
      where: {
        typeCreationId: `${mockId}`,
      },
      limit: 10,
      offset: 0,
    });
  });

  it("should return filtered list of sub type creations with search", async () => {
    const mockData = {
      count: 1,
      rows: [{ id: 3, title: "Drama", typeCreationId: mockId }],
    };

    SubTypeCreations.findAndCountAll.mockResolvedValue(mockData);

    const res = await request(app).get(
      `/api/v1/copyright/sub-type/${mockId}?search=drama&page=1&limit=5`
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.totalPages).toBe(1);
    expect(res.body.subTypeCreation).toEqual(mockData.rows);
    expect(SubTypeCreations.findAndCountAll).toHaveBeenCalledWith({
      where: {
        typeCreationId: `${mockId}`,
        title: {
          [Op.iLike]: "%drama%",
        },
      },
      limit: 5,
      offset: 0,
    });
  });

  it("should return empty array if no sub type creation found", async () => {
    SubTypeCreations.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const res = await request(app).get(
      `/api/v1/copyright/sub-type/${mockId}?search=tidakada`
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.totalPages).toBe(0);
    expect(res.body.subTypeCreation).toEqual([]);
  });

  it("should handle internal server error", async () => {
    SubTypeCreations.findAndCountAll.mockRejectedValue(new Error("DB error"));

    const res = await request(app).get(`/api/v1/copyright/sub-type/${mockId}`);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("DB error");
  });
});

describe("GET /api/v1/copyright/type/not-pagination", () => {
  it("should return all type creations without pagination", async () => {
    const mockData = [
      { id: 1, title: "Literature" },
      { id: 2, title: "Music" },
    ];

    TypeCreations.findAll = jest.fn().mockResolvedValue(mockData);

    const res = await request(app).get("/api/v1/copyright/type/not-pagination");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.typeCreation).toEqual(mockData);
    expect(TypeCreations.findAll).toHaveBeenCalledTimes(1);
  });

  it("should handle internal server error", async () => {
    TypeCreations.findAll = jest.fn().mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/api/v1/copyright/type/not-pagination");

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("DB error");
  });
});

describe("GET /api/v1/copyright/sub-type/not-pagination/:id", () => {
  it("should return all sub type creations for a given typeCreationId without pagination", async () => {
    const mockId = "1";
    const mockData = [
      { id: 1, title: "Novel", typeCreationId: mockId },
      { id: 2, title: "Short Story", typeCreationId: mockId },
    ];

    SubTypeCreations.findAll = jest.fn().mockResolvedValue(mockData);

    const res = await request(app).get(
      `/api/v1/copyright/sub-type/not-pagination/${mockId}`
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.subTypeCreation).toEqual(mockData);
    expect(SubTypeCreations.findAll).toHaveBeenCalledWith({
      where: { typeCreationId: mockId },
    });
  });

  it("should handle internal server error", async () => {
    const mockId = "1";

    SubTypeCreations.findAll = jest
      .fn()
      .mockRejectedValue(new Error("Database error"));

    const res = await request(app).get(
      `/api/v1/copyright/sub-type/not-pagination/${mockId}`
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Database error");
  });
});

describe("PATCH /api/v1/copyright/type/:id", () => {
  it("should update a type creation and return success message", async () => {
    const mockId = "1";
    const mockTitle = "Updated Title";

    TypeCreations.update = jest.fn().mockResolvedValue([1]); // 1 row updated
    logActivity.mockResolvedValue();

    const res = await request(app)
      .patch(`/api/v1/copyright/type/${mockId}`)
      .send({ title: mockTitle });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.message).toBe("Kategori Hak Cipta berhasil diperbarui");
    expect(TypeCreations.update).toHaveBeenCalledWith(
      { title: mockTitle },
      { where: { id: mockId } }
    );
    expect(logActivity).toHaveBeenCalled();
  });

  it("should handle internal server error", async () => {
    const mockId = "1";

    TypeCreations.update = jest
      .fn()
      .mockRejectedValue(new Error("Update error"));

    const res = await request(app)
      .patch(`/api/v1/copyright/type/${mockId}`)
      .send({ title: "Test" });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Update error");
  });
});

describe("GET /api/v1/copyright/type/:id", () => {
  it("should return a typeCreation object if found", async () => {
    const mockId = "1";
    const mockTypeCreation = { id: mockId, title: "Mock Title" };

    TypeCreations.findByPk = jest.fn().mockResolvedValue(mockTypeCreation);

    const res = await request(app).get(`/api/v1/copyright/type/${mockId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.typeCreation).toEqual(mockTypeCreation);
    expect(TypeCreations.findByPk).toHaveBeenCalledWith(mockId);
  });

  it("should return 404 if typeCreation not found", async () => {
    const mockId = "999";

    TypeCreations.findByPk = jest.fn().mockResolvedValue(null);

    const res = await request(app).get(`/api/v1/copyright/type/${mockId}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("TypeCreation tidak ditemukan");
  });

  it("should handle internal server error", async () => {
    const mockId = "1";

    TypeCreations.findByPk = jest
      .fn()
      .mockRejectedValue(new Error("Database error"));

    const res = await request(app).get(`/api/v1/copyright/type/${mockId}`);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Database error");
  });
});

describe("GET /api/v1/copyright/sub-type/by-id/:id", () => {
  it("should return a subTypeCreation object if found", async () => {
    const mockId = "1";
    const mockSubType = {
      id: mockId,
      title: "Mock SubType",
      typeCreationId: 2,
    };

    SubTypeCreations.findByPk = jest.fn().mockResolvedValue(mockSubType);

    const res = await request(app).get(
      `/api/v1/copyright/sub-type/by-id/${mockId}`
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.subTypeCreation).toEqual(mockSubType);
    expect(SubTypeCreations.findByPk).toHaveBeenCalledWith(mockId);
  });

  it("should return 404 if subTypeCreation not found", async () => {
    const mockId = "999";

    SubTypeCreations.findByPk = jest.fn().mockResolvedValue(null);

    const res = await request(app).get(
      `/api/v1/copyright/sub-type/by-id/${mockId}`
    );

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("SubTypeCreation tidak ditemukan");
  });

  it("should handle internal server error", async () => {
    const mockId = "1";

    SubTypeCreations.findByPk = jest
      .fn()
      .mockRejectedValue(new Error("Database error"));

    const res = await request(app).get(
      `/api/v1/copyright/sub-type/by-id/${mockId}`
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Database error");
  });
});

describe("PATCH /api/v1/copyright/sub-type/:id", () => {
  it("should update a SubTypeCreation and return success message", async () => {
    const mockId = "1";
    const mockTitle = "Updated SubType Title";

    SubTypeCreations.update = jest.fn().mockResolvedValue([1]);
    logActivity.mockClear();

    const res = await request(app)
      .patch(`/api/v1/copyright/sub-type/${mockId}`)
      .set("user-agent", "test-agent")
      .set("Authorization", `Bearer valid token`)
      .send({ title: mockTitle });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.message).toBe("Sub Kategori Hak Cipta berhasil diperbarui");
    expect(SubTypeCreations.update).toHaveBeenCalledWith(
      { title: mockTitle },
      { where: { id: mockId } }
    );
    expect(logActivity).toHaveBeenCalled();
  });

  it("should handle internal server error", async () => {
    const mockId = "1";

    SubTypeCreations.update = jest
      .fn()
      .mockRejectedValue(new Error("Update failed"));

    const res = await request(app)
      .patch(`/api/v1/copyright/sub-type/${mockId}`)
      .send({ title: "Test Title" });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Update failed");
  });
});

describe("POST /api/v1/copyright", () => {
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

describe("PATCH /api/v1/copyright/:id", () => {
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

describe("DELETE /api/v1/copyright/type/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete type creation and related subtypes, then log activity", async () => {
    const mockId = "1";
    const mockTypeCreation = {
      id: mockId,
      destroy: jest.fn().mockResolvedValue(true),
    };
    TypeCreations.findByPk = jest.fn().mockResolvedValue(mockTypeCreation);
    SubTypeCreations.destroy = jest.fn().mockResolvedValue(3); // assume 3 rows deleted

    const res = await request(app)
      .delete(`/api/v1/copyright/type/${mockId}`)
      .set("Authorization", "Bearer validtoken")
      .set("user-agent", "jest-agent");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      status: "success",
      message: "Type Creation berhasil dihapus",
    });

    expect(TypeCreations.findByPk).toHaveBeenCalledWith(mockId);
    expect(SubTypeCreations.destroy).toHaveBeenCalledWith({
      where: { typeCreationId: mockId },
    });
    expect(mockTypeCreation.destroy).toHaveBeenCalled();

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Menghapus Kategori Hak Cipta",
        description: "Admin User berhasil menghapus kategori hak cipta.",
        device: "jest-agent",
        ipAddress: "::ffff:127.0.0.1",
      })
    );
  });

  it("should return 404 if type creation not found", async () => {
    TypeCreations.findByPk = jest.fn().mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/v1/copyright/type/999")
      .set("Authorization", "Bearer validtoken");

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Type Creation tidak ditemukan");
  });

  it("should return 500 on internal server error", async () => {
    TypeCreations.findByPk = jest.fn().mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .delete("/api/v1/copyright/type/1")
      .set("Authorization", "Bearer validtoken");

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("DB error");
  });
});

describe("PATCH /api/v1/copyright/type/active/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should restore a soft-deleted type creation and its sub types", async () => {
    const mockId = "1";

    const mockTypeCreation = {
      id: mockId,
      restore: jest.fn().mockResolvedValue(true),
    };

    TypeCreations.findByPk = jest.fn().mockResolvedValue(mockTypeCreation);
    SubTypeCreations.restore = jest.fn().mockResolvedValue(2); // assume 2 subtypes restored

    const res = await request(app)
      .patch(`/api/v1/copyright/type/active/${mockId}`)
      .set("Authorization", "Bearer validtoken")
      .set("user-agent", "jest-agent");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      status: "success",
      message: "Type Creation dan Sub Type terkait berhasil dikembalikan",
    });

    expect(TypeCreations.findByPk).toHaveBeenCalledWith(mockId, {
      paranoid: false,
    });
    expect(mockTypeCreation.restore).toHaveBeenCalled();
    expect(SubTypeCreations.restore).toHaveBeenCalledWith({
      where: { typeCreationId: mockId },
    });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Mengembalikan Kategori Hak Cipta",
        description: "Admin User berhasil mengembalikan kategori hak cipta.",
        device: "jest-agent",
        ipAddress: "::ffff:127.0.0.1",
      })
    );
  });

  it("should return 404 if type creation not found", async () => {
    TypeCreations.findByPk = jest.fn().mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/v1/copyright/type/active/999")
      .set("Authorization", "Bearer validtoken");

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Type Creation tidak ditemukan");
  });

  it("should return 500 on internal server error", async () => {
    TypeCreations.findByPk = jest
      .fn()
      .mockRejectedValue(new Error("Database error"));

    const res = await request(app)
      .patch("/api/v1/copyright/type/active/1")
      .set("Authorization", "Bearer validtoken");

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Database error");
  });
});

describe("PATCH /api/v1/copyright/sub-type/active/:id", () => {
  let mockSubType;

  beforeEach(() => {
    mockSubType = {
      id: 1,
      name: "Mock Sub Type",
      restore: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should restore a soft-deleted Sub Type Creation successfully", async () => {
    jest.spyOn(SubTypeCreations, "findByPk").mockResolvedValue(mockSubType);

    const response = await request(app)
      .patch("/api/v1/copyright/sub-type/active/1")
      .set("Authorization", "Bearer mockToken");

    expect(SubTypeCreations.findByPk).toHaveBeenCalledWith("1", {
      paranoid: false,
    });
    expect(mockSubType.restore).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      "Sub Type Creation berhasil dikembalikan"
    );
  });

  it("should return 404 if Sub Type Creation not found", async () => {
    jest.spyOn(SubTypeCreations, "findByPk").mockResolvedValue(null);

    const response = await request(app)
      .patch("/api/v1/copyright/sub-type/active/999")
      .set("Authorization", "Bearer mockToken");

    expect(SubTypeCreations.findByPk).toHaveBeenCalledWith("999", {
      paranoid: false,
    });
    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Sub Type Creation tidak ditemukan");
  });

  it("should handle unexpected errors", async () => {
    jest
      .spyOn(SubTypeCreations, "findByPk")
      .mockRejectedValue(new Error("Unexpected error"));

    const response = await request(app)
      .patch("/api/v1/copyright/sub-type/active/1")
      .set("Authorization", "Bearer mockToken");

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Unexpected error");
  });
});

describe("DELETE /api/v1/copyright/sub-type/:id › deleteSubTypeCreation", () => {
  let mockSubType;

  beforeEach(() => {
    mockSubType = {
      id: 1,
      name: "Mock Sub Type",
      destroy: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should delete a Sub Type Creation successfully", async () => {
    jest.spyOn(SubTypeCreations, "findByPk").mockResolvedValue(mockSubType);

    const response = await request(app)
      .delete("/api/v1/copyright/sub-type/1")
      .set("Authorization", "Bearer mockToken");

    expect(SubTypeCreations.findByPk).toHaveBeenCalledWith("1");
    expect(mockSubType.destroy).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Sub Type Creation berhasil dihapus");
  });

  it("should return 404 if Sub Type Creation not found", async () => {
    jest.spyOn(SubTypeCreations, "findByPk").mockResolvedValue(null);

    const response = await request(app)
      .delete("/api/v1/copyright/sub-type/999")
      .set("Authorization", "Bearer mockToken");

    expect(SubTypeCreations.findByPk).toHaveBeenCalledWith("999");
    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Sub Type Creation tidak ditemukan");
  });

  it("should handle unexpected errors", async () => {
    jest
      .spyOn(SubTypeCreations, "findByPk")
      .mockRejectedValue(new Error("Unexpected error"));

    const response = await request(app)
      .delete("/api/v1/copyright/sub-type/1")
      .set("Authorization", "Bearer mockToken");

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Unexpected error");
  });
});
