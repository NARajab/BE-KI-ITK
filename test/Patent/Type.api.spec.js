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

describe("POST Create Patent Type", () => {
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

describe("PATCH Update Patent Type", () => {
  it("should successfully update a patent type", async () => {
    PatentTypes.update.mockResolvedValue([1]);

    const response = await request(app)
      .patch("/api/v1/patent/type/1")
      .send({ title: "Updated Patent Type" });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Kategori paten berhasil diperbarui");

    expect(PatentTypes.update).toHaveBeenCalledWith(
      { title: "Updated Patent Type" },
      { where: { id: "1" } }
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

describe("GET All Patent Type", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return all patent types without search", async () => {
    const mockTypes = [
      { id: 1, title: "Utility Model" },
      { id: 2, title: "Design Patent" },
    ];

    PatentTypes.findAndCountAll.mockResolvedValue({
      count: mockTypes.length,
      rows: mockTypes,
    });

    const res = await request(app).get("/api/v1/patent/type");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.patentTypes).toHaveLength(2);
    expect(PatentTypes.findAndCountAll).toHaveBeenCalledWith({
      where: {},
      limit: 10,
      offset: 0,
    });
  });

  it("should return filtered patent types with search and pagination", async () => {
    const mockTypes = [{ id: 2, title: "Design Patent" }];

    PatentTypes.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: mockTypes,
    });

    const res = await request(app)
      .get("/api/v1/patent/type")
      .query({ page: 2, limit: 5, search: "design" });

    expect(res.statusCode).toBe(200);
    expect(res.body.currentPage).toBe(2);
    expect(res.body.totalPages).toBe(1);
    expect(res.body.totalTypes).toBe(1);
    expect(res.body.patentTypes).toEqual(mockTypes);
    expect(PatentTypes.findAndCountAll).toHaveBeenCalledWith({
      where: {
        title: {
          [Op.iLike]: "%design%",
        },
      },
      limit: 5,
      offset: 5,
    });
  });

  it("should handle errors and return 500", async () => {
    PatentTypes.findAndCountAll.mockRejectedValue(new Error("Database error"));

    const res = await request(app).get("/api/v1/patent/type");

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Database error");
  });
});

describe("GET All Patent Type Without Pagination", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return all patent types without pagination", async () => {
    const mockTypes = [
      { id: 1, title: "Utility Model" },
      { id: 2, title: "Design Patent" },
    ];

    PatentTypes.findAll.mockResolvedValue(mockTypes);

    const res = await request(app).get("/api/v1/patent/type/not-pagination");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.patentTypes).toEqual(mockTypes);
    expect(PatentTypes.findAll).toHaveBeenCalledTimes(1);
  });

  it("should handle errors and return 500", async () => {
    PatentTypes.findAll.mockRejectedValue(new Error("Database error"));

    const res = await request(app).get("/api/v1/patent/type/not-pagination");

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Database error");
  });
});

describe("GET Patent Type by ID", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return a patent type by id", async () => {
    const mockType = { id: 1, title: "Utility Model" };

    PatentTypes.findByPk.mockResolvedValue(mockType);

    const res = await request(app).get("/api/v1/patent/type/1");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.message).toBe("Kategori paten berhasil ditemukan");
    expect(res.body.patentType).toEqual(mockType);
    expect(PatentTypes.findByPk).toHaveBeenCalledWith("1");
  });

  it("should return 404 if patent type not found", async () => {
    PatentTypes.findByPk.mockResolvedValue(null);

    const res = await request(app).get("/api/v1/patent/type/99");

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Kategori paten tidak ditemukan");
  });

  it("should return 500 if there is a server error", async () => {
    PatentTypes.findByPk.mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/api/v1/patent/type/1");

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("DB error");
  });
});

describe("PATCH Restore Patent Type", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should restore a soft-deleted patent type", async () => {
    const mockPatentType = {
      id: 1,
      restore: jest.fn(),
    };

    PatentTypes.findOne.mockResolvedValue(mockPatentType);
    logActivity.mockResolvedValue();

    const res = await request(app)
      .patch("/api/v1/patent/type/active/1")
      .set("Authorization", "Bearer validtoken")
      .set("user-agent", "jest-agent")
      .set("Content-Type", "application/json")
      .send();

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Kategori paten berhasil dikembalikan");
    expect(PatentTypes.findOne).toHaveBeenCalledWith({
      where: { id: "1" },
      paranoid: false,
    });
    expect(mockPatentType.restore).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Mengembalikan Kategori Paten",
        description: `Admin User berhasil mengembalikan kategori paten.`,
        device: "jest-agent",
        ipAddress: "::ffff:127.0.0.1",
      })
    );
  });

  it("should return 404 if patent type not found", async () => {
    PatentTypes.findOne.mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/v1/patent/type/active/99")
      .set("Authorization", "Bearer validtoken");

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Kategori paten tidak ditemukan");
  });

  it("should return 500 if an error occurs", async () => {
    PatentTypes.findOne.mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .patch("/api/v1/patent/type/active/1")
      .set("Authorization", "Bearer validtoken");

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("DB error");
  });
});

describe("DELETE Patent Type", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should delete a patent type and return 200", async () => {
    const mockPatentType = {
      id: 1,
      destroy: jest.fn().mockResolvedValue(),
    };

    PatentTypes.findByPk.mockResolvedValue(mockPatentType);
    logActivity.mockResolvedValue();

    const res = await request(app)
      .delete("/api/v1/patent/type/1")
      .set("Authorization", "Bearer validtoken")
      .set("user-agent", "jest-agent")
      .set("Content-Type", "application/json")
      .send();

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Kategori paten berhasil dihapus");
    expect(PatentTypes.findByPk).toHaveBeenCalledWith("1");
    expect(mockPatentType.destroy).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Menghapus Kategori Paten",
        description: `Admin User berhasil menghapus kategori paten.`,
        device: "jest-agent",
        ipAddress: "::ffff:127.0.0.1",
      })
    );
  });

  it("should return 404 if patent type not found", async () => {
    PatentTypes.findByPk.mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/v1/patent/type/99")
      .set("Authorization", "Bearer validtoken");

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Kategori paten tidak ditemukan");
  });

  it("should return 500 if an error occurs", async () => {
    PatentTypes.findByPk.mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .delete("/api/v1/patent/type/1")
      .set("Authorization", "Bearer validtoken");

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("DB error");
  });
});
