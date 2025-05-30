jest.mock("../../app/models", () => ({
  Brands: {
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
  AdditionalDatas: {
    bulkCreate: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    destroy: jest.fn(),
  },
  PersonalDatas: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    bulkCreate: jest.fn(),
  },
  BrandTypes: {
    create: jest.fn(),
    update: jest.fn(),
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
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
jest.mock("../../emails/templates/brandSubmissionMail", () => jest.fn());
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
  Brands,
  Progresses,
  BrandTypes,
  PersonalDatas,
  AdditionalDatas,
  Users,
} = require("../../app/models");
const fs = require("fs");
const { Op } = require("sequelize");
const ApiError = require("../../utils/apiError");
const logActivity = require("../../app/helpers/activityLogs");
const sendEmail = require("../../emails/services/sendMail");
const brandSubmissionMail = require("../../emails/templates/brandSubmissionMail");

describe("POST Create Brand Type", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 201 and success message when brand type is created", async () => {
    BrandTypes.create.mockResolvedValue({ id: 1, title: "Elektronik" });

    const response = await request(app)
      .post("/api/v1/brand/type")
      .send({ title: "Elektronik" })
      .expect(201);

    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Kategori merek berhasil dibuat");

    expect(BrandTypes.create).toHaveBeenCalledWith({ title: "Elektronik" });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Menambah Kategori Merek",
        description: "Admin User berhasil menambah kategori merek.",
        device: undefined,
        ipAddress: "::ffff:127.0.0.1",
      })
    );
  });

  it("should return 500 if BrandTypes.create throws an error", async () => {
    BrandTypes.create.mockRejectedValue(new Error("Database error"));

    const response = await request(app)
      .post("/api/v1/brand/type")
      .send({ title: "Elektronik" })
      .expect(500);

    expect(response.body.message).toBe("Database error");
    expect(BrandTypes.create).toHaveBeenCalled();
    expect(logActivity).not.toHaveBeenCalled();
  });
});

describe("PATCH Update Brand Type", () => {
  it("should update brand type and return 200", async () => {
    const mockId = "1";
    const mockTitle = "Updated Brand Type";

    BrandTypes.update.mockResolvedValue([1]);

    const response = await request(app)
      .patch(`/api/v1/brand/type/${mockId}`)
      .send({ title: mockTitle });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      message: "Kategori merek berhasil diperbarui",
    });

    expect(BrandTypes.update).toHaveBeenCalledWith(
      { title: mockTitle },
      { where: { id: mockId } }
    );
  });

  it("should handle errors and return 500", async () => {
    const mockId = "1";
    BrandTypes.update.mockRejectedValue(new Error("Database error"));

    const response = await request(app)
      .patch(`/api/v1/brand/type/${mockId}`)
      .send({ title: "Error Test" });

    expect(response.status).toBe(500);
    expect(response.body.status).toBe("Error");
    expect(response.body.message).toBe("Database error");
  });
});

describe("GET All Brand Type", () => {
  const mockBrandTypes = [
    { id: 1, title: "Wordmark" },
    { id: 2, title: "Pictorial" },
  ];

  beforeEach(() => {
    BrandTypes.findAndCountAll.mockResolvedValue({
      count: mockBrandTypes.length,
      rows: mockBrandTypes,
    });
  });

  it("should return a list of brand types with pagination", async () => {
    const response = await request(app).get(
      "/api/v1/brand/type?page=1&limit=10"
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: "success",
        currentPage: 1,
        totalPages: 1,
        totalTypes: 2,
        limit: 10,
        brandTypes: mockBrandTypes,
      })
    );

    expect(BrandTypes.findAndCountAll).toHaveBeenCalledWith({
      where: {},
      limit: 10,
      offset: 0,
      order: [["id", "ASC"]],
    });
  });

  it("should support search by title", async () => {
    const response = await request(app).get("/api/v1/brand/type?search=word");

    expect(response.statusCode).toBe(200);
    expect(BrandTypes.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          title: {
            [Op.iLike]: `%word%`,
          },
        },
      })
    );
  });

  it("should default to page 1 and limit 10 if not provided", async () => {
    const response = await request(app).get("/api/v1/brand/type");

    expect(response.statusCode).toBe(200);
    expect(response.body.currentPage).toBe(1);
    expect(response.body.limit).toBe(10);
  });

  it("should return 500 if an error is thrown", async () => {
    BrandTypes.findAndCountAll.mockRejectedValueOnce(
      new Error("Database error")
    );

    const response = await request(app).get("/api/v1/brand/type");

    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty("message", "Database error");
  });
});

describe("GET All Brand Type Without Pagination", () => {
  const mockBrandTypes = [
    { id: 1, title: "Wordmark" },
    { id: 2, title: "Pictorial" },
  ];

  beforeEach(() => {
    BrandTypes.findAll.mockResolvedValue(mockBrandTypes);
  });

  it("should return all brand types without pagination", async () => {
    const response = await request(app).get(
      "/api/v1/brand/type/not-pagination"
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      brandTypes: mockBrandTypes,
    });

    expect(BrandTypes.findAll).toHaveBeenCalledWith({
      order: [["id", "ASC"]],
    });
  });

  it("should return 500 if an error is thrown", async () => {
    BrandTypes.findAll.mockRejectedValueOnce(new Error("Unexpected error"));

    const response = await request(app).get(
      "/api/v1/brand/type/not-pagination"
    );

    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty("message", "Unexpected error");
  });
});

describe("GET Brand Type by ID", () => {
  const mockBrandType = {
    id: 1,
    title: "Wordmark",
  };

  it("should return brand type by ID", async () => {
    BrandTypes.findByPk.mockResolvedValue(mockBrandType);

    const response = await request(app).get("/api/v1/brand/type/1");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      brandType: mockBrandType,
    });

    expect(BrandTypes.findByPk).toHaveBeenCalledWith("1");
  });

  it("should return 404 if brand type is not found", async () => {
    BrandTypes.findByPk.mockResolvedValue(null);

    const response = await request(app).get("/api/v1/brand/type/999");

    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty(
      "message",
      "BrandType tidak ditemukan"
    );
  });

  it("should return 500 if an error is thrown", async () => {
    BrandTypes.findByPk.mockRejectedValueOnce(new Error("Unexpected error"));

    const response = await request(app).get("/api/v1/brand/type/1");

    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty("message", "Unexpected error");
  });
});

describe("PATCH Restore Brand Type", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logActivity.mockResolvedValue();
  });

  it("should restore a soft-deleted brand type", async () => {
    const mockBrand = {
      id: 1,
      deletedAt: new Date(),
      restore: jest.fn(),
    };

    BrandTypes.findOne.mockResolvedValue(mockBrand);

    const res = await request(app)
      .patch("/api/v1/brand/type/active/1")
      .set("Authorization", "Bearer mock-token");

    console.log(res.body);

    expect(res.statusCode).toBe(200);
    expect(mockBrand.restore).toHaveBeenCalled();
  });

  it("should return 404 if brand type not found", async () => {
    BrandTypes.findOne.mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/v1/brand/type/active/999")
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Kategori merek tidak ditemukan");
  });

  it("should return 400 if brand type is not deleted", async () => {
    const mockBrand = {
      id: 1,
      deletedAt: null,
    };

    BrandTypes.findOne.mockResolvedValue(mockBrand);

    const res = await request(app)
      .patch("/api/v1/brand/type/active/1")
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe(
      "Kategori merek ini tidak dalam status terhapus"
    );
  });

  it("should return 500 on unexpected error", async () => {
    BrandTypes.findOne.mockImplementation(() => {
      throw new Error("Database error");
    });

    const res = await request(app)
      .patch("/api/v1/brand/type/active/1")
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Database error");
  });
});

describe("DELETE Brand Type", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logActivity.mockResolvedValue();
  });

  it("should delete brand type and return 200 success", async () => {
    const mockBrand = {
      id: 1,
      destroy: jest.fn().mockResolvedValue(),
    };
    BrandTypes.findByPk.mockResolvedValue(mockBrand);

    const res = await request(app)
      .delete("/api/v1/brand/type/1")
      .set("Authorization", "Bearer mock-token") // jika ada middleware auth
      .set("user-agent", "jest-test-agent")
      .set("Accept", "application/json");

    expect(BrandTypes.findByPk).toHaveBeenCalledWith("1");
    expect(mockBrand.destroy).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: expect.anything(),
        action: "Menghapus Kategori Merek",
        description: expect.stringContaining(
          "berhasil menghapus kategori merek"
        ),
        device: "jest-test-agent",
        ipAddress: expect.anything(),
      })
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Kategori brand berhasil dihapus",
    });
  });

  it("should return 404 if brand type not found", async () => {
    BrandTypes.findByPk.mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/v1/brand/type/999")
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty(
      "message",
      "Kategori merek tidak ditemukan"
    );
  });

  it("should call next with error on exception", async () => {
    const errorMessage = "Database error";
    BrandTypes.findByPk.mockRejectedValue(new Error(errorMessage));

    const next = jest.fn();

    const req = {
      params: { id: "1" },
      user: { id: 1, fullname: "Test User" },
      headers: { "user-agent": "jest-agent" },
      ip: "127.0.0.1",
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const {
      deleteBrandType,
    } = require("../../app/controllers/brandController");

    await deleteBrandType(req, res, next);

    expect(next).toHaveBeenCalled();
    const calledWithError = next.mock.calls[0][0];
    expect(calledWithError).toBeInstanceOf(ApiError);
    expect(calledWithError.message).toBe(errorMessage);
    expect(calledWithError.statusCode).toBe(500);
  });
});
