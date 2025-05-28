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
const { SubTypeCreations } = require("../../app/models");
const { Op } = require("sequelize");
const logActivity = require("../../app/helpers/activityLogs");

describe("POST Create Copyright Sub Type", () => {
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

describe("GET All Copyright Sub Type", () => {
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

describe("GET All Copyright Sub Type Without Pagination", () => {
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

describe("GET Copyright Sub Type by ID", () => {
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

describe("PATCH Update Copyright Sub Type", () => {
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

describe("PATCH Restore Copyright Sub Type", () => {
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

describe("DELETE Copyright Sub Type", () => {
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
