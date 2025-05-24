jest.mock("../app/models", () => ({
  TermsConditions: {
    create: jest.fn(),
    update: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    count: jest.fn(),
    destroy: jest.fn(),
    restore: jest.fn(),
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

const request = require("supertest");
const app = require("../app/index");
const { TermsConditions, Users } = require("../app/models");
const { Op } = require("sequelize");
const logActivity = require("../app/helpers/activityLogs");

describe("POST /api/v1/terms", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a term and log activity", async () => {
    const termsData = {
      terms:
        "Medukung tema kearifan lokal Kalimantan dan Roadmap Penelitian dan Pengabdian Masyarakat (PPM) ITK",
    };

    const mockCreatedTerms = { id: 1, ...termsData };
    TermsConditions.create.mockResolvedValue(mockCreatedTerms);

    const res = await request(app)
      .post("/api/v1/terms")
      .send(termsData)
      .set("Authorization", "Bearer mock-token")
      .set("User-Agent", "jest-test");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.message).toBe("Terms and conditions berhasil dibuat");
    expect(TermsConditions.create).toHaveBeenCalledWith(termsData);
    expect(logActivity).toHaveBeenCalledWith({
      userId: 1,
      action: "Menambah Syarat dan Ketentuan",
      description: "Admin User berhasil menambah syarat dan ketentuan.",
      device: expect.any(String),
      ipAddress: expect.any(String),
    });
  });

  it("should return 400 if creation fails", async () => {
    const TermsConditions = require("../app/models").TermsConditions;
    TermsConditions.create.mockRejectedValue(new Error("Validation error"));

    const res = await request(app)
      .post("/api/v1/terms")
      .send({
        terms: "", // simulate invalid input
      })
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe("Failed");
    expect(res.body.message).toBe("Validation error");
  });
});

describe("PATCH /api/v1/terms/:id", () => {
  it("should update terms and return success response", async () => {
    const mockTerms = {
      id: 1,
      terms: "Syarat lama",
      update: jest.fn().mockResolvedValue(true),
    };

    const updatedBody = {
      terms: "Syarat baru yang diperbarui",
    };

    TermsConditions.findByPk.mockResolvedValue(mockTerms);

    const response = await request(app)
      .patch("/api/v1/terms/1")
      .send(updatedBody)
      .set("User-Agent", "Supertest")
      .set("Accept", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "success");
    expect(response.body).toHaveProperty(
      "message",
      "Terms and conditions berhasil diperbarui"
    );
    expect(response.body).toHaveProperty("terms");
    expect(TermsConditions.findByPk).toHaveBeenCalledWith("1");
    expect(mockTerms.update).toHaveBeenCalledWith(updatedBody);
  });

  it("should return 404 if terms not found", async () => {
    TermsConditions.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .patch("/api/v1/terms/999")
      .send({ terms: "Update apapun" });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty(
      "message",
      "Terms and conditions tidak ditemukan"
    );
  });

  it("should return 500 on server error", async () => {
    TermsConditions.findByPk.mockRejectedValue(new Error("Database error"));

    const response = await request(app)
      .patch("/api/v1/terms/1")
      .send({ terms: "Coba error" });

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message", "Database error");
  });
});

describe("GET /api/v1/terms", () => {
  it("should return paginated terms with success", async () => {
    const mockTerms = [
      { id: 1, terms: "Term 1" },
      { id: 2, terms: "Term 2" },
    ];
    const mockCount = 2;

    TermsConditions.findAndCountAll.mockResolvedValue({
      count: mockCount,
      rows: mockTerms,
    });

    const response = await request(app)
      .get("/api/v1/terms")
      .query({ page: 1, limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "success");
    expect(response.body).toHaveProperty("currentPage", 1);
    expect(response.body).toHaveProperty("totalPages", 1);
    expect(response.body).toHaveProperty("totalTerms", mockCount);
    expect(response.body).toHaveProperty("limit", 10);
    expect(response.body).toHaveProperty("terms");
    expect(Array.isArray(response.body.terms)).toBe(true);
    expect(response.body.terms.length).toBe(mockTerms.length);

    expect(TermsConditions.findAndCountAll).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
      order: [["id", "ASC"]],
      where: {},
    });
  });

  it("should default to page 1 and limit 10 if query params missing or invalid", async () => {
    TermsConditions.findAndCountAll.mockResolvedValue({
      count: 0,
      rows: [],
    });

    const response = await request(app).get("/api/v1/terms");

    expect(response.status).toBe(200);
    expect(response.body.currentPage).toBe(1);
    expect(response.body.limit).toBe(10);
  });

  it("should return 500 if error occurs", async () => {
    TermsConditions.findAndCountAll.mockRejectedValue(
      new Error("Database failure")
    );

    const response = await request(app).get("/api/v1/terms");

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message", "Database failure");
  });
});

describe("GET /api/v1/terms/not-pagination", () => {
  it("should return all terms without pagination successfully", async () => {
    const mockTerms = [
      { id: 1, terms: "Term 1" },
      { id: 2, terms: "Term 2" },
    ];

    TermsConditions.findAll.mockResolvedValue(mockTerms);

    const response = await request(app).get("/api/v1/terms/not-pagination");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "success");
    expect(response.body).toHaveProperty("terms");
    expect(Array.isArray(response.body.terms)).toBe(true);
    expect(response.body.terms.length).toBe(mockTerms.length);
    expect(response.body.terms).toEqual(mockTerms);

    expect(TermsConditions.findAll).toHaveBeenCalled();
  });

  it("should return 500 if an error occurs", async () => {
    TermsConditions.findAll.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/api/v1/terms/not-pagination");

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message", "Database error");
  });
});

describe("GET /api/v1/terms/:id", () => {
  it("should return a terms and conditions item by ID", async () => {
    const mockTerm = { id: 1, terms: "Syarat dan Ketentuan Contoh" };

    TermsConditions.findByPk.mockResolvedValue(mockTerm);

    const response = await request(app).get("/api/v1/terms/1");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "success");
    expect(response.body).toHaveProperty("terms");
    expect(response.body.terms).toEqual(mockTerm);
    expect(TermsConditions.findByPk).toHaveBeenCalledWith("1");
  });

  it("should return 404 if terms not found", async () => {
    TermsConditions.findByPk.mockResolvedValue(null);

    const response = await request(app).get("/api/v1/terms/999");

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty(
      "message",
      "Terms and conditions tidak ditemukan"
    );
    expect(TermsConditions.findByPk).toHaveBeenCalledWith("999");
  });

  it("should return 500 if a server error occurs", async () => {
    TermsConditions.findByPk.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/api/v1/terms/1");

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message", "Database error");
  });
});

describe("PATCH /api/v1/terms/active/:id", () => {
  it("should restore a deleted terms and conditions", async () => {
    const mockRestore = jest.fn();
    const mockTerm = {
      id: 1,
      deletedAt: new Date(),
      restore: mockRestore,
    };

    TermsConditions.findOne.mockResolvedValue(mockTerm);

    const response = await request(app).patch("/api/v1/terms/active/1");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "success");
    expect(response.body).toHaveProperty(
      "message",
      "Terms and conditions berhasil direstore"
    );
    expect(TermsConditions.findOne).toHaveBeenCalledWith({
      where: { id: "1" },
      paranoid: false,
    });
    expect(mockRestore).toHaveBeenCalled();
  });

  it("should return 404 if terms not found", async () => {
    TermsConditions.findOne.mockResolvedValue(null);

    const response = await request(app).patch("/api/v1/terms/active/999");

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty(
      "message",
      "Terms and conditions tidak ditemukan"
    );
  });

  it("should return 400 if terms has not been deleted", async () => {
    const mockTerm = {
      id: 1,
      deletedAt: null,
    };

    TermsConditions.findOne.mockResolvedValue(mockTerm);

    const response = await request(app).patch("/api/v1/terms/active/1");

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message", "Terms belum dihapus");
  });

  it("should return 500 on internal error", async () => {
    TermsConditions.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app).patch("/api/v1/terms/active/1");

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message", "Database error");
  });
});

describe("DELETE /api/v1/terms/:id", () => {
  it("should delete the terms and return success", async () => {
    const mockDestroy = jest.fn();
    const mockTerm = {
      id: 1,
      destroy: mockDestroy,
    };

    TermsConditions.findByPk.mockResolvedValue(mockTerm);

    const response = await request(app).delete("/api/v1/terms/1");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "success");
    expect(response.body).toHaveProperty(
      "message",
      "Terms and conditions berhasil dihapus"
    );
    expect(TermsConditions.findByPk).toHaveBeenCalledWith("1");
    expect(mockDestroy).toHaveBeenCalled();
  });

  it("should return 404 if terms not found", async () => {
    TermsConditions.findByPk.mockResolvedValue(null);

    const response = await request(app).delete("/api/v1/terms/999");

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty(
      "message",
      "Terms and conditions tidak ditemukan"
    );
  });

  it("should return 500 on internal error", async () => {
    TermsConditions.findByPk.mockRejectedValue(new Error("Unexpected error"));

    const response = await request(app).delete("/api/v1/terms/1");

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message", "Unexpected error");
  });
});
