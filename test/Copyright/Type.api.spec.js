jest.mock("../../app/models", () => ({
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
  Users,
  Submissions,
  Progresses,
  Copyrights,
  PersonalDatas,
  TypeCreations,
  SubTypeCreations,
} = require("../../app/models");
const fs = require("fs");
const { Op } = require("sequelize");
const logActivity = require("../../app/helpers/activityLogs");
const sendEmail = require("../../emails/services/sendMail");

describe("POST Create Copyright Type", () => {
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

describe("GET All Copyright Type", () => {
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

describe("GET All Copyright Type Without Pagination", () => {
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

describe("PATCH Update Copyright Type", () => {
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

describe("GET Copyright Type by ID", () => {
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

describe("DELETE Copyright Type", () => {
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

describe("PATCH Restore Copyright Type", () => {
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
