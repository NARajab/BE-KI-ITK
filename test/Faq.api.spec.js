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
const { Faqs, Users } = require("../app/models");
const { Op } = require("sequelize");
const {
  getFaqByType,
  getById,
  updateFaq,
  restoreFaq,
  restoreTypeFaq,
} = require("../app/controllers/faqController");
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

    Faqs.findAll.mockResolvedValue([{ id: 1, type: oldType }]);
    Faqs.update.mockResolvedValue([1]);
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
    Faqs.findAll.mockResolvedValue([]);

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

    Faqs.findOne.mockResolvedValue({ id: 1, type });

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
    Faqs.findOne.mockResolvedValue(null);

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

describe("GET /api/v1/faq/by-type/:type", () => {
  beforeEach(() => {
    Faqs.findAndCountAll.mockClear();
  });

  it("should return paginated FAQs filtered by type with question NOT null", async () => {
    const faqType = "technical";

    const mockFaqs = [
      {
        id: 1,
        type: faqType,
        question: "What is API?",
        answer: "Application Programming Interface",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        type: faqType,
        question: "How to test?",
        answer: "Use Jest or Mocha",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockCount = 2;

    Faqs.findAndCountAll.mockResolvedValue({
      count: mockCount,
      rows: mockFaqs,
    });

    const response = await request(app)
      .get(`/api/v1/faq/by-type/${faqType}`)
      .query({ page: 1, limit: 10 });

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.currentPage).toBe(1);
    expect(response.body.limit).toBe(10);
    expect(response.body.totalPages).toBe(Math.ceil(mockCount / 10));
    expect(response.body.totalFaqs).toBe(mockCount);
    expect(response.body.faqs).toHaveLength(mockFaqs.length);

    response.body.faqs.forEach((faq, index) => {
      expect(faq).toMatchObject({
        id: mockFaqs[index].id,
        type: faqType,
        question: expect.any(String),
        answer: expect.any(String),
      });
    });

    expect(Faqs.findAndCountAll).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
      order: [["id", "ASC"]],
      where: {
        type: faqType,
        question: {
          [Op.ne]: null,
        },
      },
    });
  });

  it("should handle errors and call next with ApiError", async () => {
    const faqType = "general";

    const errorMessage = "Database failure";
    Faqs.findAndCountAll.mockRejectedValue(new Error(errorMessage));

    const next = jest.fn();

    const req = {
      params: { type: faqType },
      query: { page: "1", limit: "10" },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await getFaqByType(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: errorMessage,
        statusCode: 500,
      })
    );
  });
});

describe("GET /api/v1/faq/:id", () => {
  beforeEach(() => {
    Faqs.findByPk.mockClear();
  });

  it("should return a FAQ by id when found", async () => {
    const mockFaq = {
      id: 1,
      type: "general",
      question: "Apa itu API?",
      answer: "Application Programming Interface",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    Faqs.findByPk.mockResolvedValue(mockFaq);

    const response = await request(app).get(`/api/v1/faq/1`);

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.faq).toMatchObject({
      id: 1,
      type: "general",
      question: "Apa itu API?",
      answer: "Application Programming Interface",
    });

    expect(Faqs.findByPk).toHaveBeenCalledWith("1");
  });

  it("should return 404 and call next with ApiError if FAQ not found", async () => {
    const faqId = 9999;

    Faqs.findByPk.mockResolvedValue(null);

    const req = { params: { id: faqId } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await getById(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Faq tidak ditemukan",
        statusCode: 404,
      })
    );
  });

  it("should handle error and call next with ApiError", async () => {
    const errorMessage = "Database error";

    Faqs.findByPk.mockRejectedValue(new Error(errorMessage));

    const req = { params: { id: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await getById(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: errorMessage,
        statusCode: 500,
      })
    );
  });
});

describe("PATCH /api/v1/faq/:id", () => {
  beforeEach(() => {
    Faqs.findByPk.mockClear();
    logActivity.mockClear();
  });

  it("should update FAQ and return success message", async () => {
    const mockFaqInstance = {
      update: jest.fn().mockResolvedValue(true),
      id: 1,
      question: "Old question",
      answer: "Old answer",
    };

    Faqs.findByPk.mockResolvedValue(mockFaqInstance);

    const updatedData = {
      question: "New question?",
      answer: "New answer.",
    };

    const user = {
      id: 123,
      fullname: "John Doe",
    };

    const response = await request(app)
      .patch("/api/v1/faq/1")
      .set("user-agent", "jest-test-agent")
      .send(updatedData)
      .set("Accept", "application/json")
      .set("X-User-Id", user.id)
      .set("X-User-Fullname", user.fullname);

    expect(Faqs.findByPk).toHaveBeenCalledWith("1");
    expect(mockFaqInstance.update).toHaveBeenCalledWith(updatedData);
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: expect.any(Number),
        action: "Mengubah Faq",
        description: expect.stringContaining("berhasil memperbaharui FAQ"),
        device: "jest-test-agent",
        ipAddress: expect.any(String),
      })
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Faq berhasil diperbarui");
    expect(response.body.faq).toBeDefined();
  });

  it("should call next with ApiError 404 if FAQ not found", async () => {
    Faqs.findByPk.mockResolvedValue(null);

    const req = {
      params: { id: "999" },
      body: { question: "Q", answer: "A" },
      user: { id: 123, fullname: "John Doe" },
      headers: { "user-agent": "jest-test-agent" },
      ip: "127.0.0.1",
    };
    const res = {};
    const next = jest.fn();

    await updateFaq(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Faq tidak ditemukan",
        statusCode: 404,
      })
    );
  });

  it("should call next with ApiError 500 on DB error", async () => {
    const error = new Error("DB error");
    Faqs.findByPk.mockRejectedValue(error);

    const req = {
      params: { id: "1" },
      body: { question: "Q", answer: "A" },
      user: { id: 123, fullname: "John Doe" },
      headers: { "user-agent": "jest-test-agent" },
      ip: "127.0.0.1",
    };
    const res = {};
    const next = jest.fn();

    await updateFaq(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "DB error",
        statusCode: 500,
      })
    );
  });
});

describe("PATCH /api/v1/faq/active/:id", () => {
  beforeEach(() => {
    Faqs.findOne.mockClear();
  });

  it("should restore a deleted FAQ successfully", async () => {
    const mockFaq = {
      id: 1,
      deletedAt: new Date(),
      restore: jest.fn().mockResolvedValue(true),
    };

    Faqs.findOne.mockResolvedValue(mockFaq);

    const response = await request(app)
      .patch(`/api/v1/faq/active/1`)
      .set("User-Agent", "jest-test");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Faq berhasil dikembalikan");
    expect(Faqs.findOne).toHaveBeenCalledWith({
      where: { id: "1" },
      paranoid: false,
    });
    expect(mockFaq.restore).toHaveBeenCalled();
  });

  it("should return 404 if FAQ not found", async () => {
    Faqs.findOne.mockResolvedValue(null);

    const req = {
      params: { id: "9999" },
      headers: {},
      user: { id: 1, fullname: "Admin User" },
      ip: "127.0.0.1",
    };
    const res = {};
    const next = jest.fn();

    await restoreFaq(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Faq tidak ditemukan",
        statusCode: 404,
      })
    );
  });

  it("should return 400 if FAQ is not deleted", async () => {
    const mockFaq = {
      id: 1,
      deletedAt: null,
    };

    Faqs.findOne.mockResolvedValue(mockFaq);

    const response = await request(app).patch(`/api/v1/faq/active/1`);

    expect(response.statusCode).toBe(400);
    expect(response.body.status).toBe("fail");
    expect(response.body.message).toBe("Faq ini belum dihapus");
  });

  it("should call next with ApiError on unexpected error", async () => {
    const errorMessage = "Database error";

    Faqs.findOne.mockRejectedValue(new Error(errorMessage));

    const req = {
      params: { id: "1" },
      headers: {},
      user: { id: 1, fullname: "Admin User" },
      ip: "127.0.0.1",
    };
    const res = {};
    const next = jest.fn();

    await restoreFaq(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: errorMessage,
        statusCode: 500,
      })
    );
  });
});

describe("PATCH /api/v1/faq/type/active/:type", () => {
  beforeEach(() => {
    Faqs.findAll.mockClear();
  });

  it("should restore all deleted FAQs of a given type", async () => {
    const mockDeletedFaq1 = {
      id: 1,
      deletedAt: new Date(),
      restore: jest.fn().mockResolvedValue(true),
    };
    const mockDeletedFaq2 = {
      id: 2,
      deletedAt: new Date(),
      restore: jest.fn().mockResolvedValue(true),
    };
    const mockActiveFaq = {
      id: 3,
      deletedAt: null,
      restore: jest.fn(),
    };

    Faqs.findAll.mockResolvedValue([
      mockDeletedFaq1,
      mockDeletedFaq2,
      mockActiveFaq,
    ]);

    const response = await request(app)
      .patch("/api/v1/faq/type/active/general")
      .set("User-Agent", "jest-test");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe(
      "Berhasil mengembalikan semua FAQ dengan type 'general'"
    );
    expect(Faqs.findAll).toHaveBeenCalledWith({
      where: { type: "general" },
      paranoid: false,
    });

    expect(mockDeletedFaq1.restore).toHaveBeenCalled();
    expect(mockDeletedFaq2.restore).toHaveBeenCalled();
    expect(mockActiveFaq.restore).not.toHaveBeenCalled();
  });

  it("should return 404 if no FAQs found for the type", async () => {
    Faqs.findAll.mockResolvedValue([]);

    const req = {
      params: { type: "unknown" },
      headers: {},
      user: { id: 1, fullname: "Admin User" },
      ip: "127.0.0.1",
    };
    const res = {};
    const next = jest.fn();

    await restoreTypeFaq(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Faq dengan type tersebut tidak ditemukan",
        statusCode: 404,
      })
    );
  });

  it("should return 400 if no deleted FAQs to restore", async () => {
    const mockFaq1 = { id: 1, deletedAt: null, restore: jest.fn() };
    const mockFaq2 = { id: 2, deletedAt: null, restore: jest.fn() };

    Faqs.findAll.mockResolvedValue([mockFaq1, mockFaq2]);

    const response = await request(app).patch(
      "/api/v1/faq/type/active/general"
    );

    expect(response.statusCode).toBe(400);
    expect(response.body.status).toBe("fail");
    expect(response.body.message).toBe(
      "Tidak ada Faq yang perlu direstore untuk type ini"
    );
  });

  it("should call next with ApiError on unexpected error", async () => {
    const errorMessage = "Database error";

    Faqs.findAll.mockRejectedValue(new Error(errorMessage));

    const req = {
      params: { type: "general" },
      headers: {},
      user: { id: 1, fullname: "Admin User" },
      ip: "127.0.0.1",
    };
    const res = {};
    const next = jest.fn();

    await restoreTypeFaq(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: errorMessage,
        statusCode: 500,
      })
    );
  });
});

describe("DELETE /api/v1/faq/:id", () => {
  beforeEach(() => {
    Faqs.findByPk.mockClear();
  });

  it("should delete a FAQ and return success message", async () => {
    const mockFaq = {
      id: 1,
      destroy: jest.fn().mockResolvedValue(true),
    };

    Faqs.findByPk.mockResolvedValue(mockFaq);

    const response = await request(app)
      .delete("/api/v1/faq/1")
      .set("User-Agent", "jest-test");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Faq berhasil dihapus");

    expect(Faqs.findByPk).toHaveBeenCalledWith("1");
    expect(mockFaq.destroy).toHaveBeenCalled();
  });

  it("should return 404 if FAQ is not found", async () => {
    Faqs.findByPk.mockResolvedValue(null);

    const response = await request(app).delete("/api/v1/faq/999");

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("Faq tidak ditemukan");
  });

  it("should return 500 on unexpected error", async () => {
    Faqs.findByPk.mockRejectedValue(new Error("Database error"));

    const response = await request(app).delete("/api/v1/faq/1");

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("Database error");
  });
});

describe("DELETE /api/v1/faq/type/:type", () => {
  beforeEach(() => {
    Faqs.findAll.mockClear();
  });

  it("should delete all FAQs with the specified type and return success", async () => {
    const mockFaqs = [
      { id: 1, destroy: jest.fn().mockResolvedValue(true) },
      { id: 2, destroy: jest.fn().mockResolvedValue(true) },
    ];

    Faqs.findAll.mockResolvedValue(mockFaqs);

    const response = await request(app)
      .delete("/api/v1/faq/type/general")
      .set("User-Agent", "jest-test");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe(
      "Semua Faq dengan type 'general' berhasil dihapus"
    );

    expect(Faqs.findAll).toHaveBeenCalledWith({ where: { type: "general" } });
    mockFaqs.forEach((faq) => expect(faq.destroy).toHaveBeenCalled());
  });

  it("should return 404 if no FAQs found for the given type", async () => {
    Faqs.findAll.mockResolvedValue([]);

    const response = await request(app).delete("/api/v1/faq/type/unknown");

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("Tidak ada Faq dengan type tersebut");
  });

  it("should return 500 on internal error", async () => {
    Faqs.findAll.mockRejectedValue(new Error("Database error"));

    const response = await request(app).delete("/api/v1/faq/type/general");

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("Database error");
  });
});
