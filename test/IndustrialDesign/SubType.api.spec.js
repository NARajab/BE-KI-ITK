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

describe("POST Create SubTypeDesign", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a new SubTypeDesign successfully", async () => {
    SubTypeDesigns.create = jest
      .fn()
      .mockResolvedValue({ id: 1, typeDesignId: 1, title: "New SubType" });

    logActivity.mockResolvedValue();

    const res = await request(app)
      .post("/api/v1/design-industri/sub-type/1")
      .send({ title: "New SubType" })
      .set("Authorization", "Bearer mock-token")
      .set("user-agent", "jest-test-agent")
      .set("Accept", "application/json");

    expect(SubTypeDesigns.create).toHaveBeenCalledWith({
      typeDesignId: "1", // karena params.id itu string
      title: "New SubType",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil ditambahkan",
    });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: expect.any(Number),
        action: "Menambah Sub Kategori Desain Industri",
        description: expect.stringContaining(
          "berhasil menambah sub kategori desain industri"
        ),
        device: "jest-test-agent",
        ipAddress: expect.any(String),
      })
    );
  });

  it("should respond with 500 when create fails", async () => {
    SubTypeDesigns.create = jest
      .fn()
      .mockRejectedValue(new Error("DB create error"));

    const res = await request(app)
      .post("/api/v1/design-industri/sub-type/1")
      .send({ title: "New SubType" })
      .set("Authorization", "Bearer mock-token")
      .set("user-agent", "jest-test-agent")
      .set("Accept", "application/json");

    expect(SubTypeDesigns.create).toHaveBeenCalled();
    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("message", "DB create error");
  });
});

describe("GET All Sub Type Design", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return paginated subtype designs successfully", async () => {
    const mockSubTypes = [
      { id: 1, typeDesignId: "2", title: "Sub Design 1" },
      { id: 2, typeDesignId: "2", title: "Sub Design 2" },
    ];
    SubTypeDesigns.findAndCountAll = jest.fn().mockResolvedValue({
      count: 2,
      rows: mockSubTypes,
    });

    const res = await request(app)
      .get("/api/v1/design-industri/sub-type/2?page=1&limit=10&search=Design")
      .set("Authorization", "Bearer mock-token")
      .set("Accept", "application/json");

    expect(SubTypeDesigns.findAndCountAll).toHaveBeenCalledWith({
      where: {
        typeDesignId: "2",
        title: { [Op.iLike]: "%Design%" },
      },
      limit: 10,
      offset: 0,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil ditemukan",
      currentPage: 1,
      totalPages: 1,
      limit: 10,
      subTypeDesign: mockSubTypes,
    });
  });

  it("should return empty list when no subtype designs found", async () => {
    SubTypeDesigns.findAndCountAll = jest.fn().mockResolvedValue({
      count: 0,
      rows: [],
    });

    const res = await request(app)
      .get("/api/v1/design-industri/sub-type/2")
      .set("Authorization", "Bearer mock-token")
      .set("Accept", "application/json");

    expect(SubTypeDesigns.findAndCountAll).toHaveBeenCalledWith({
      where: { typeDesignId: "2" },
      limit: 10,
      offset: 0,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      currentPage: 1,
      totalPages: 0,
      limit: 10,
      subTypeCreation: [],
    });
  });

  it("should return 404 if typeDesign with id not found", async () => {
    TypeDesigns.findByPk = jest.fn().mockResolvedValue(null);

    const res = await request(app)
      .get("/api/v1/design-industri/type/99999")
      .set("Accept", "application/json");

    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({
      status: "Failed",
      message: "Kategori Desain Industri tidak ditemukan",
    });
  });

  it("should handle server error and return 500", async () => {
    SubTypeDesigns.findAndCountAll = jest
      .fn()
      .mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .get("/api/v1/design-industri/sub-type/2")
      .set("Authorization", "Bearer mock-token")
      .set("Accept", "application/json");

    expect(SubTypeDesigns.findAndCountAll).toHaveBeenCalledWith({
      where: { typeDesignId: "2" },
      limit: 10,
      offset: 0,
    });

    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({
      status: "Error",
      message: "DB error",
    });
  });
});

describe("GET All Sub Type Design Without Pagination", () => {
  const route = "/api/v1/design-industri/sub-type/not-pagination";

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 404 error if no sub types found", async () => {
    SubTypeDesigns.findAll.mockResolvedValue([]);

    const res = await request(app).get(`${route}/9999`);

    expect(SubTypeDesigns.findAll).toHaveBeenCalledWith({
      where: { typeDesignId: "9999" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil ditemukan",
      subTypeDesign: [],
    });
  });

  it("should return sub type designs successfully", async () => {
    const mockSubTypes = [
      { id: 1, typeDesignId: 2, title: "SubType 1" },
      { id: 2, typeDesignId: 2, title: "SubType 2" },
    ];

    SubTypeDesigns.findAll.mockResolvedValue(mockSubTypes);

    const res = await request(app).get(`${route}/2`);

    expect(SubTypeDesigns.findAll).toHaveBeenCalledWith({
      where: { typeDesignId: "2" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil ditemukan",
      subTypeDesign: mockSubTypes,
    });
  });

  it("should handle errors and call next with ApiError", async () => {
    const errorMessage = "Database error";
    SubTypeDesigns.findAll.mockRejectedValue(new Error(errorMessage));

    const next = jest.fn();

    const req = { params: { id: "1" } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const handler =
      require("../../app/controllers/industrialDesignController").getSubTypeDesignIndustriWtoPagination;

    await handler(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].message).toBe(errorMessage);
  });
});

describe("GET Sub Type Design by ID", () => {
  const route = "/api/v1/design-industri/sub-type/by-id";

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 404 if subtype design with given id is not found", async () => {
    SubTypeDesigns.findByPk.mockResolvedValue(null);

    const res = await request(app).get(`${route}/9999`);

    expect(SubTypeDesigns.findByPk).toHaveBeenCalledWith("9999");
    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({
      status: "Failed",
      message: "Sub Kategori Desain Industri tidak ditemukan",
    });
  });

  it("should return subtype design if found", async () => {
    const mockSubType = {
      id: 1,
      typeDesignId: 2,
      title: "SubType Example",
    };
    SubTypeDesigns.findByPk.mockResolvedValue(mockSubType);

    const res = await request(app).get(`${route}/1`);

    expect(SubTypeDesigns.findByPk).toHaveBeenCalledWith("1");
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil ditemukan",
      subTypeDesign: mockSubType,
    });
  });

  it("should handle internal server error and call next with ApiError", async () => {
    const errorMessage = "DB failure";
    SubTypeDesigns.findByPk.mockRejectedValue(new Error(errorMessage));

    const next = jest.fn();

    // Mock req, res objects
    const req = { params: { id: "1" } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const {
      getSubTypeById,
    } = require("../../app/controllers/industrialDesignController");

    await getSubTypeById(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].message).toBe(errorMessage);
  });
});

describe("PATCH Update Sub Type Design", () => {
  const route = "/api/v1/design-industri/sub-type";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update the sub type design successfully and log activity", async () => {
    SubTypeDesigns.update.mockResolvedValue([1]); // Sequelize returns [numberOfAffectedRows]
    logActivity.mockResolvedValue();

    const user = {
      id: 456,
      fullname: "Jane Doe",
    };

    const res = await request(app)
      .patch(`${route}/1`)
      .send({ title: "Updated Sub Type Title" })
      .set("user-agent", "jest-test-agent")
      .set("Accept", "application/json")
      .set("x-user-id", user.id)
      .set("x-user-fullname", user.fullname)
      .expect(200);

    expect(SubTypeDesigns.update).toHaveBeenCalledWith(
      { title: "Updated Sub Type Title" },
      { where: { id: "1" } }
    );

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Mengubah Sub Kategori Desain Industri",
        description:
          "Admin User berhasil mengubah sub kategori desain industri.",
        device: "jest-test-agent",
        ipAddress: "::ffff:127.0.0.1",
      })
    );

    expect(res.body).toMatchObject({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil diperbarui",
    });
  });

  it("should call next with ApiError on failure", async () => {
    const errorMessage = "DB update error";
    SubTypeDesigns.update.mockRejectedValue(new Error(errorMessage));

    const next = jest.fn();

    const req = {
      params: { id: "1" },
      body: { title: "Test Sub Type" },
      user: { id: 1, fullname: "Tester" },
      headers: { "user-agent": "jest-agent" },
      ip: "127.0.0.1",
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const {
      updateSubTypeDesignIndustri,
    } = require("../../app/controllers/industrialDesignController");

    await updateSubTypeDesignIndustri(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].message).toBe(errorMessage);
  });
});

describe("PATCH Restore Sub Type", () => {
  const dummyId = 1;

  const mockSubType = {
    id: dummyId,
    deletedAt: new Date(),
    restore: jest.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should restore a deleted sub type design", async () => {
    SubTypeDesigns.findByPk.mockResolvedValue(mockSubType);

    const response = await request(app)
      .patch(`/api/v1/design-industri/sub-type/active/${dummyId}`)
      .set("Authorization", "Bearer mockToken");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil direstore",
    });

    expect(SubTypeDesigns.findByPk).toHaveBeenCalledWith("1", {
      paranoid: false,
    });
    expect(mockSubType.restore).toHaveBeenCalled();
  });

  it("should not call restore if sub type is not deleted", async () => {
    const notDeletedSubType = {
      ...mockSubType,
      deletedAt: null,
      restore: jest.fn(),
    };
    SubTypeDesigns.findByPk.mockResolvedValue(notDeletedSubType);

    const response = await request(app)
      .patch(`/api/v1/design-industri/sub-type/active/${dummyId}`)
      .set("Authorization", "Bearer mockToken");

    expect(response.statusCode).toBe(200);
    expect(notDeletedSubType.restore).not.toHaveBeenCalled();
  });

  it("should return 404 if sub type not found", async () => {
    SubTypeDesigns.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/v1/design-industri/sub-type/active/${dummyId}`)
      .set("Authorization", "Bearer mockToken");

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe(
      "Sub Kategori Desain Industri tidak ditemukan"
    );
  });

  it("should return 500 if an error occurs", async () => {
    SubTypeDesigns.findByPk.mockRejectedValue(
      new Error("Something went wrong")
    );

    const response = await request(app)
      .patch(`/api/v1/design-industri/sub-type/active/${dummyId}`)
      .set("Authorization", "Bearer mockToken");

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("Something went wrong");
  });
});

describe("DELETE Sub Type Design", () => {
  const dummyId = 123;

  const mockSubType = {
    id: dummyId,
    destroy: jest.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete sub type successfully", async () => {
    SubTypeDesigns.findByPk.mockResolvedValue(mockSubType);

    const response = await request(app)
      .delete(`/api/v1/design-industri/sub-type/${dummyId}`)
      .set("Authorization", "Bearer mockToken");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil dihapus",
    });

    expect(SubTypeDesigns.findByPk).toHaveBeenCalledWith("123");
    expect(mockSubType.destroy).toHaveBeenCalled();
  });

  it("should return 404 if sub type not found", async () => {
    SubTypeDesigns.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .delete(`/api/v1/design-industri/sub-type/${dummyId}`)
      .set("Authorization", "Bearer mockToken");

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe(
      "Sub Kategori Desain Industri tidak ditemukan"
    );
  });

  it("should return 500 if something went wrong", async () => {
    SubTypeDesigns.findByPk.mockRejectedValue(new Error("Database error"));

    const response = await request(app)
      .delete(`/api/v1/design-industri/sub-type/${dummyId}`)
      .set("Authorization", "Bearer mockToken");

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("Database error");
  });
});
