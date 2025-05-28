jest.mock("../../app/models", () => ({
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
  Submissions,
  IndustrialDesigns,
  PersonalDatas,
  TypeDesigns,
  SubTypeDesigns,
  Progresses,
  Users,
} = require("../../app/models");
const fs = require("fs");
const { Op } = require("sequelize");
const logActivity = require("../../app/helpers/activityLogs");
const sendEmail = require("../../emails/services/sendMail");

describe("POST Create Type Design", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a new TypeDesign successfully", async () => {
    TypeDesigns.create = jest
      .fn()
      .mockResolvedValue({ id: 1, title: "New Design" });
    logActivity.mockResolvedValue();

    const res = await request(app)
      .post("/api/v1/design-industri/type")
      .send({ title: "New Design" })
      .set("Authorization", "Bearer mock-token")
      .set("user-agent", "jest-test-agent")
      .set("Accept", "application/json");

    expect(TypeDesigns.create).toHaveBeenCalledWith({ title: "New Design" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Kategori Desain Industri berhasil ditambahkan",
    });
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: expect.any(Number),
        action: "Menambah Kategori Desain Industri",
        description: expect.stringContaining(
          "berhasil menambah kategori desain industri"
        ),
        device: "jest-test-agent",
        ipAddress: expect.any(String),
      })
    );
  });

  it("should respond with 500 when create fails", async () => {
    TypeDesigns.create = jest
      .fn()
      .mockRejectedValue(new Error("DB create error"));

    const res = await request(app)
      .post("/api/v1/design-industri/type")
      .send({ title: "New Design" })
      .set("Authorization", "Bearer mock-token")
      .set("user-agent", "jest-test-agent")
      .set("Accept", "application/json");

    expect(TypeDesigns.create).toHaveBeenCalled();
    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("message", "DB create error");
  });
});

describe("GET All Type Design", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return paginated type designs successfully", async () => {
    // Mock response data
    const mockTypeDesigns = [
      { id: 1, title: "Design A" },
      { id: 2, title: "Design B" },
    ];
    const mockCount = 2;

    TypeDesigns.findAndCountAll = jest.fn().mockResolvedValue({
      count: mockCount,
      rows: mockTypeDesigns,
    });

    const res = await request(app)
      .get("/api/v1/design-industri/type")
      .query({ page: 1, limit: 10, search: "Design" })
      .set("Authorization", "Bearer mock-token")
      .set("Accept", "application/json");

    expect(TypeDesigns.findAndCountAll).toHaveBeenCalledWith({
      where: {
        title: {
          [Op.iLike]: `%Design%`,
        },
      },
      limit: 10,
      offset: 0,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Kategori Desain Industri berhasil ditemukan",
      currentPage: 1,
      totalPages: 1,
      limit: 10,
      typeDesigns: mockTypeDesigns,
    });
  });

  it("should use default pagination if query params are missing", async () => {
    TypeDesigns.findAndCountAll = jest.fn().mockResolvedValue({
      count: 0,
      rows: [],
    });

    const res = await request(app)
      .get("/api/v1/design-industri/type")
      .set("Authorization", "Bearer mock-token")
      .set("Accept", "application/json");

    expect(TypeDesigns.findAndCountAll).toHaveBeenCalledWith({
      where: {},
      limit: 10,
      offset: 0,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Kategori Desain Industri berhasil ditemukan",
      currentPage: 1,
      totalPages: 0,
      limit: 10,
      typeDesigns: [],
    });
  });

  it("should call next with error on failure", async () => {
    TypeDesigns.findAndCountAll = jest
      .fn()
      .mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .get("/api/v1/design-industri/type")
      .set("Authorization", "Bearer mock-token")
      .set("Accept", "application/json");

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("message", "DB error");
  });
});

describe("GET All Type Design Without Pagination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return all type designs without pagination successfully", async () => {
    const mockTypeDesigns = [
      { id: 1, title: "Design A" },
      { id: 2, title: "Design B" },
    ];

    TypeDesigns.findAll = jest.fn().mockResolvedValue(mockTypeDesigns);

    const res = await request(app)
      .get("/api/v1/design-industri/type/not-pagination")
      .set("Authorization", "Bearer mock-token")
      .set("Accept", "application/json");

    expect(TypeDesigns.findAll).toHaveBeenCalled();

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Kategori Desain Industri berhasil ditemukan",
      typeDesigns: mockTypeDesigns,
    });
  });

  it("should call next with error on failure", async () => {
    TypeDesigns.findAll = jest.fn().mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .get("/api/v1/design-industri/type/not-pagination")
      .set("Authorization", "Bearer mock-token")
      .set("Accept", "application/json");

    expect(res.statusCode).toBe(500);
  });
});

describe("GET Type Design by ID", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return the type design with id 2 successfully", async () => {
    const mockTypeDesign = { id: 2, title: "Design B" };

    TypeDesigns.findByPk = jest.fn().mockResolvedValue(mockTypeDesign);

    const res = await request(app)
      .get("/api/v1/design-industri/type/2")
      .set("Authorization", "Bearer mock-token")
      .set("Accept", "application/json");

    expect(TypeDesigns.findByPk).toHaveBeenCalledWith("2");
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Kategori Desain Industri berhasil ditemukan",
      typeDesign: mockTypeDesign,
    });
  });

  it("should return 404 error if type design with id 2 is not found", async () => {
    TypeDesigns.findByPk = jest.fn().mockResolvedValue(null);

    const res = await request(app)
      .get("/api/v1/design-industri/type/2")
      .set("Authorization", "Bearer mock-token")
      .set("Accept", "application/json");

    expect(TypeDesigns.findByPk).toHaveBeenCalledWith("2");
    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({
      status: "Failed",
      message: "Kategori Desain Industri tidak ditemukan",
    });
  });

  it("should handle server error and return 500", async () => {
    TypeDesigns.findByPk = jest.fn().mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .get("/api/v1/design-industri/type/2")
      .set("Authorization", "Bearer mock-token")
      .set("Accept", "application/json");

    expect(TypeDesigns.findByPk).toHaveBeenCalledWith("2");
    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({
      status: "Error",
      message: "DB error",
    });
  });
});

describe("PATCH Update Type Design", () => {
  const route = "/api/v1/design-industri/type";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update the type design successfully and log activity", async () => {
    TypeDesigns.update.mockResolvedValue([1]);

    logActivity.mockResolvedValue();

    const user = {
      id: 123,
      fullname: "John Doe",
    };

    const res = await request(app)
      .patch(`${route}/1`)
      .send({ title: "Updated Title" })
      .set("user-agent", "jest-test-agent")
      .set("Accept", "application/json")
      .set("x-user-id", user.id)
      .set("x-user-fullname", user.fullname)
      .expect(200);

    expect(TypeDesigns.update).toHaveBeenCalledWith(
      { title: "Updated Title" },
      { where: { id: "1" } }
    );

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Mengubah Kategori Desain Industri",
        description: "Admin User berhasil mengubah kategori desain industri.",
        device: "jest-test-agent",
        ipAddress: "::ffff:127.0.0.1",
      })
    );

    expect(res.body).toMatchObject({
      status: "success",
      message: "Kategori Desain Industri berhasil diperbarui",
    });
  });

  it("should call next with ApiError on failure", async () => {
    const errorMessage = "DB update failed";
    TypeDesigns.update.mockRejectedValue(new Error(errorMessage));

    const next = jest.fn();

    const req = {
      params: { id: "1" },
      body: { title: "Test" },
      user: { id: 1, fullname: "Tester" },
      headers: { "user-agent": "jest-agent" },
      ip: "127.0.0.1",
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const {
      updateTypeDesignIndustri,
    } = require("../app/controllers/industrialDesignController");

    await updateTypeDesignIndustri(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].message).toBe(errorMessage);
  });
});

describe("PATCH Restore Type Design", () => {
  const dummyId = 1;
  const mockTypeDesign = {
    id: dummyId,
    deletedAt: new Date(),
    restore: jest.fn().mockResolvedValue(true),
  };
  const mockSubTypes = [
    {
      id: 101,
      deletedAt: new Date(),
      restore: jest.fn().mockResolvedValue(true),
    },
    {
      id: 102,
      deletedAt: null, // tidak perlu di-restore
      restore: jest.fn(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should restore a deleted type design and its deleted subtypes", async () => {
    TypeDesigns.findByPk.mockResolvedValue(mockTypeDesign);
    SubTypeDesigns.findAll.mockResolvedValue(mockSubTypes);

    const response = await request(app)
      .patch(`/api/v1/design-industri/type/active/${dummyId}`)
      .set("Authorization", `Bearer mockToken`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      message:
        "Kategori Desain Industri dan semua subkategori berhasil direstore",
    });

    expect(TypeDesigns.findByPk).toHaveBeenCalledWith("1", {
      paranoid: false,
    });
    expect(mockTypeDesign.restore).toHaveBeenCalled();

    expect(SubTypeDesigns.findAll).toHaveBeenCalledWith({
      where: { typeDesignId: "1" },
      paranoid: false,
    });

    expect(mockSubTypes[0].restore).toHaveBeenCalled();
    expect(mockSubTypes[1].restore).not.toHaveBeenCalled();
  });

  it("should return 404 if type design not found", async () => {
    TypeDesigns.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/v1/design-industri/type/active/${dummyId}`)
      .set("Authorization", `Bearer mockToken`);

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe(
      "Kategori Desain Industri tidak ditemukan"
    );
  });

  it("should return 500 if an error occurs", async () => {
    TypeDesigns.findByPk.mockRejectedValue(new Error("Something failed"));

    const response = await request(app)
      .patch(`/api/v1/design-industri/type/active/${dummyId}`)
      .set("Authorization", `Bearer mockToken`);

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("Something failed");
  });
});

describe("DELETE Type Design", () => {
  const dummyId = 1;

  const mockTypeDesign = {
    id: dummyId,
    destroy: jest.fn().mockResolvedValue(true),
  };

  const mockSubTypes = [
    { id: 101, destroy: jest.fn().mockResolvedValue(true) },
    { id: 102, destroy: jest.fn().mockResolvedValue(true) },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete type and all related subtypes", async () => {
    TypeDesigns.findByPk.mockResolvedValue(mockTypeDesign);
    SubTypeDesigns.findAll.mockResolvedValue(mockSubTypes);

    const response = await request(app)
      .delete(`/api/v1/design-industri/type/${dummyId}`)
      .set("Authorization", "Bearer mockToken");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      message:
        "Kategori Desain Industri dan semua subkategori berhasil dihapus",
    });

    expect(TypeDesigns.findByPk).toHaveBeenCalledWith("1");
    expect(SubTypeDesigns.findAll).toHaveBeenCalledWith({
      where: { typeDesignId: "1" },
    });

    expect(mockSubTypes[0].destroy).toHaveBeenCalled();
    expect(mockSubTypes[1].destroy).toHaveBeenCalled();
    expect(mockTypeDesign.destroy).toHaveBeenCalled();
  });

  it("should return 404 if type design not found", async () => {
    TypeDesigns.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .delete(`/api/v1/design-industri/type/${dummyId}`)
      .set("Authorization", "Bearer mockToken");

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe(
      "Kategori Desain Industri tidak ditemukan"
    );
  });

  it("should return 500 if error occurs", async () => {
    TypeDesigns.findByPk.mockRejectedValue(new Error("DB error"));

    const response = await request(app)
      .delete(`/api/v1/design-industri/type/${dummyId}`)
      .set("Authorization", "Bearer mockToken");

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("DB error");
  });
});
