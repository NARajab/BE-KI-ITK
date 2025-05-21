jest.mock("../app/models", () => ({
  Faqs: {
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
  Users: {
    findByPk: jest.fn(),
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
const fs = require("fs");
const { Faqs, Users } = require("../app/models");
const { Op } = require("sequelize");
const logActivity = require("../app/helpers/activityLogs");

describe("POST /api/v1/faq", () => {
  const mockUser = {
    id: 1,
    fullname: "Admin User",
    role: "admin",
  };

  beforeEach(() => {
    Faqs.create.mockClear();
    logActivity.mockClear();
  });

  it("should create a new FAQ category and log activity", async () => {
    Faqs.create.mockResolvedValue({ type: "general" });
    logActivity.mockResolvedValue();

    const response = await request(app)
      .post("/api/v1/faq")
      .set("Authorization", "Bearer valid-token")
      .set("User-Agent", "Jest Test")
      .send({ type: "general" });

    console.log("Response body:", response.body);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Kategori Faq berhasil ditambahkan");
    expect(Faqs.create).toHaveBeenCalledWith({ type: "general" });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser.id,
        action: "Menambah Kategori Faq",
        description: expect.stringContaining(
          "berhasil menambahkan kategori FAQ: general"
        ),
      })
    );
  });

  it("should handle validation error and call next with ApiError", async () => {
    const errorMessage = "Validation error";
    Faqs.create.mockRejectedValue(new Error(errorMessage));
    logActivity.mockResolvedValue();

    const response = await request(app)
      .post("/api/v1/faq")
      .set("Authorization", "Bearer valid-token")
      .send({ type: "" });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe(errorMessage);
  });
});

describe("PATCH /api/v1/faq/type", () => {
  const mockUser = {
    id: 1,
    fullname: "Admin User",
    role: "admin",
  };

  beforeEach(() => {
    Faqs.findAll.mockClear();
    Faqs.update.mockClear();
    logActivity.mockClear();
  });

  it("should update FAQ category type and log activity", async () => {
    const oldType = "old-category";
    const newType = "new-category";

    // Mock findAll mengembalikan array FAQ yang matching oldType
    Faqs.findAll.mockResolvedValue([{ id: 1, type: oldType }]);
    Faqs.update.mockResolvedValue([1]); // Sequelize update returns [affectedCount]
    logActivity.mockResolvedValue();

    const response = await request(app)
      .patch("/api/v1/faq/type")
      .set("Authorization", "Bearer valid-token")
      .set("User-Agent", "Jest Test")
      .send({ oldType, newType });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Faqs berhasil diperbaharui");

    expect(Faqs.findAll).toHaveBeenCalledWith({ where: { type: oldType } });
    expect(Faqs.update).toHaveBeenCalledWith(
      { type: newType },
      { where: { type: oldType } }
    );

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser.id,
        action: "Mengubah Kategori Faq",
        description: expect.stringContaining(newType),
      })
    );
  });

  it("should return 404 if no FAQ with oldType found", async () => {
    Faqs.findAll.mockResolvedValue([]); // Tidak ada FAQ matching oldType

    const response = await request(app)
      .patch("/api/v1/faq/type")
      .set("Authorization", "Bearer valid-token")
      .send({ oldType: "nonexistent", newType: "anything" });

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("Tidak ada dokumen dengan id tersebut");
  });

  it("should handle server error", async () => {
    Faqs.findAll.mockRejectedValue(new Error("DB failure"));

    const response = await request(app)
      .patch("/api/v1/faq/type")
      .set("Authorization", "Bearer valid-token")
      .send({ oldType: "old", newType: "new" });

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("DB failure");
  });
});

describe("POST /api/v1/faq/by-type/:type", () => {
  const mockUser = {
    id: 1,
    fullname: "Admin User",
    role: "admin",
  };

  beforeEach(() => {
    Faqs.findOne.mockClear();
    Faqs.create.mockClear();
    logActivity.mockClear();
  });

  it("should create a new FAQ under the specified type and log activity", async () => {
    const type = "general";
    const question = "Apa itu FAQ?";
    const answer = "Frequently Asked Questions.";

    // Mock kategori FAQ ditemukan
    Faqs.findOne.mockResolvedValue({ id: 1, type });

    // Mock FAQ baru dibuat
    const newFaqData = { id: 2, type, question, answer };
    Faqs.create.mockResolvedValue(newFaqData);

    logActivity.mockResolvedValue();

    const response = await request(app)
      .post(`/api/v1/faq/by-type/${type}`)
      .set("Authorization", "Bearer valid-token")
      .set("User-Agent", "Jest Test")
      .send({ question, answer });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Faq berhasil ditambahkan");
    expect(response.body.newFaq).toEqual(newFaqData);

    expect(Faqs.findOne).toHaveBeenCalledWith({ where: { type } });
    expect(Faqs.create).toHaveBeenCalledWith({ type, question, answer });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser.id,
        action: "Menambah Faq",
        description: expect.stringContaining("berhasil menambahkan FAQ"),
      })
    );
  });

  it("should return 404 if FAQ category not found", async () => {
    Faqs.findOne.mockResolvedValue(null); // kategori tidak ditemukan

    const response = await request(app)
      .post("/api/v1/faq/by-type/nonexistent")
      .set("Authorization", "Bearer valid-token")
      .send({ question: "Q", answer: "A" });

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("Kategori faq tidak ditemukan");
  });

  it("should handle server error", async () => {
    Faqs.findOne.mockRejectedValue(new Error("DB error"));

    const response = await request(app)
      .post("/api/v1/faq/by-type/general")
      .set("Authorization", "Bearer valid-token")
      .send({ question: "Q", answer: "A" });

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("DB error");
  });
});

describe("GET /api/v1/faq", () => {
  beforeEach(() => {
    Faqs.findAndCountAll.mockClear();
  });

  it("should return paginated list of FAQs", async () => {
    const mockFaqs = [
      { id: 1, type: "general", question: "Q1", answer: "A1" },
      { id: 2, type: "general", question: "Q2", answer: "A2" },
    ];

    Faqs.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: mockFaqs,
    });

    const response = await request(app)
      .get("/api/v1/faq")
      .query({ page: 1, limit: 10 });

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.currentPage).toBe(1);
    expect(response.body.totalPages).toBe(1);
    expect(response.body.totalFaqs).toBe(2);
    expect(response.body.limit).toBe(10);
    expect(response.body.faqs).toEqual(mockFaqs);

    expect(Faqs.findAndCountAll).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
      order: [["id", "ASC"]],
      where: {
        question: {
          [Op.ne]: null,
        },
      },
    });
  });

  it("should use default pagination if query params are invalid", async () => {
    Faqs.findAndCountAll.mockResolvedValue({
      count: 0,
      rows: [],
    });

    const response = await request(app)
      .get("/api/v1/faq")
      .query({ page: "abc", limit: "def" });

    expect(response.statusCode).toBe(200);
    expect(response.body.currentPage).toBe(1);
    expect(response.body.limit).toBe(10);
  });

  it("should handle errors and return 500", async () => {
    Faqs.findAndCountAll.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/api/v1/faq");

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("Database error");
  });
});

describe("GET /api/v1/faq/not-pagination", () => {
  beforeEach(() => {
    Faqs.findAll.mockClear();
  });

  it("should return all FAQs without pagination", async () => {
    const mockFaqs = [
      { id: 1, type: "general", question: "Q1", answer: "A1" },
      { id: 2, type: "general", question: "Q2", answer: "A2" },
    ];

    Faqs.findAll.mockResolvedValue(mockFaqs);

    const response = await request(app).get("/api/v1/faq/not-pagination");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.faqs).toEqual(mockFaqs);

    expect(Faqs.findAll).toHaveBeenCalledWith({
      order: [["id", "ASC"]],
      where: {
        question: {
          [Op.ne]: null,
        },
      },
    });
  });

  it("should handle errors and return 500", async () => {
    Faqs.findAll.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/api/v1/faq/not-pagination");

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("Database error");
  });
});

describe("GET /api/v1/faq/by-type", () => {
  beforeAll(() => {
    Faqs.sequelize = {
      fn: jest.fn((fnName, colName) => `${fnName}(${colName})`),
      col: jest.fn((colName) => colName),
    };
  });

  beforeEach(() => {
    Faqs.findAndCountAll.mockClear();
    Faqs.findAll.mockClear();
    Faqs.sequelize.fn.mockClear();
    Faqs.sequelize.col.mockClear();
  });

  it("should return paginated FAQ types with totalTypeDigunakan counts", async () => {
    const mockFaqs = [
      {
        dataValues: {
          id: 1,
          type: "general",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      {
        dataValues: {
          id: 2,
          type: "technical",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ];

    const mockCount = 2;

    const mockTypeCountsRaw = [
      {
        type: "general",
        dataValues: { totalTypeDigunakan: "2" },
      },
      {
        type: "technical",
        dataValues: { totalTypeDigunakan: "3" },
      },
    ];

    Faqs.findAndCountAll.mockResolvedValue({
      count: mockCount,
      rows: mockFaqs,
    });

    Faqs.findAll.mockResolvedValue(mockTypeCountsRaw);

    const response = await request(app).get("/api/v1/faq/by-type").query({
      page: 1,
      limit: 10,
    });

    console.log("Response body:", response.body);

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.currentPage).toBe(1);
    expect(response.body.limit).toBe(10);
    expect(response.body.totalPages).toBe(Math.ceil(mockCount / 10));
    expect(response.body.totalFaqs).toBe(mockCount);

    expect(response.body.faqs).toHaveLength(mockFaqs.length);

    response.body.faqs.forEach((faq) => {
      const matchingTypeCount = mockTypeCountsRaw.find(
        (item) => item.type === faq.type
      );

      const totalCount = matchingTypeCount
        ? Math.max(
            0,
            parseInt(matchingTypeCount.dataValues.totalTypeDigunakan) - 1
          )
        : 0;

      expect(faq).toHaveProperty("totalTypeDigunakan", totalCount);
    });

    expect(Faqs.findAndCountAll).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
      attributes: ["id", "type", "createdAt", "updatedAt"],
      order: [["id", "ASC"]],
      where: {
        question: {
          [Op.eq]: null,
        },
      },
    });

    expect(Faqs.findAll).toHaveBeenCalledWith({
      attributes: [
        "type",
        [
          Faqs.sequelize.fn("COUNT", Faqs.sequelize.col("type")),
          "totalTypeDigunakan",
        ],
      ],
      group: ["type"],
    });
  });

  it("should handle errors and call next with ApiError", async () => {
    Faqs.findAndCountAll.mockRejectedValue(new Error("DB failure"));

    const response = await request(app).get("/api/v1/faq/by-type");

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("DB failure");
  });
});
