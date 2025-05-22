jest.mock("../app/models", () => ({
  Periods: {
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
  Groups: {
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
  Quotas: {
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
const { Periods, Groups, Quotas, Users } = require("../app/models");
const { Op } = require("sequelize");
const logActivity = require("../app/helpers/activityLogs");

describe("POST /api/v1/period", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a new period with 4 groups and quotas, and return 201", async () => {
    const mockNewPeriod = { id: 1, year: 2025 };
    const mockGroups = [
      { id: 1, group: "Gelombang 1" },
      { id: 2, group: "Gelombang 2" },
      { id: 3, group: "Gelombang 3" },
      { id: 4, group: "Gelombang 4" },
    ];

    Periods.findOne.mockResolvedValue(null);
    Periods.create.mockResolvedValue(mockNewPeriod);
    Groups.bulkCreate = jest.fn().mockResolvedValue(mockGroups); // override since not mocked above
    Quotas.bulkCreate = jest.fn().mockResolvedValue([]);

    const response = await request(app)
      .post("/api/v1/period")
      .send({ year: 2025 });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("status", "success");
    expect(response.body).toHaveProperty("message");
    expect(response.body.newPeriod).toEqual(mockNewPeriod);

    expect(Periods.findOne).toHaveBeenCalledWith({ where: { year: 2025 } });
    expect(Periods.create).toHaveBeenCalledWith({ year: 2025 });
    expect(Groups.bulkCreate).toHaveBeenCalled();
    expect(Quotas.bulkCreate).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalled();
  });

  it("should return 400 if the period already exists", async () => {
    Periods.findOne.mockResolvedValue({ id: 99, year: 2025 });

    const response = await request(app)
      .post("/api/v1/period")
      .send({ year: 2025 });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty(
      "message",
      "Periode dengan tahun yang sama sudah ada."
    );
    expect(Periods.create).not.toHaveBeenCalled();
  });

  it("should return 500 if internal error occurs", async () => {
    Periods.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app)
      .post("/api/v1/period")
      .send({ year: 2025 });

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message", "Database error");
  });
});

describe("PATCH /api/v1/period/year", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update the period year successfully and return 200", async () => {
    const mockOldYear = 2023;
    const mockNewYear = 2024;

    const mockPeriod = [{ id: 1, year: mockOldYear }];
    const mockUpdatedRows = [1]; // Sequelize returns an array where the first item is the number of affected rows

    Periods.findAll.mockResolvedValue(mockPeriod);
    Periods.update.mockResolvedValue(mockUpdatedRows);
    Periods.findOne.mockResolvedValue(null); // no duplicate year
    logActivity.mockResolvedValue();

    const response = await request(app)
      .patch("/api/v1/period/year")
      .send({ oldYear: mockOldYear, newYear: mockNewYear });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "success");
    expect(response.body).toHaveProperty(
      "message",
      "Periode berhasil diperbarui"
    );
    expect(Periods.update).toHaveBeenCalledWith(
      { year: mockNewYear },
      { where: { year: mockOldYear } }
    );
    expect(logActivity).toHaveBeenCalled();
  });

  it("should return 404 if period with oldYear is not found", async () => {
    Periods.findAll.mockResolvedValue([]);

    const response = await request(app)
      .patch("/api/v1/period/year")
      .send({ oldYear: 2022, newYear: 2025 });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message", "Periode tidak ditemukan.");
    expect(Periods.update).not.toHaveBeenCalled();
  });

  it("should return 400 if newYear already exists in another period", async () => {
    const mockOldYear = 2022;
    const mockNewYear = 2025;

    const mockPeriod = [{ id: 1, year: mockOldYear }];
    Periods.findAll.mockResolvedValue(mockPeriod);
    Periods.update.mockResolvedValue([1]);

    Periods.findOne.mockResolvedValue({ id: 2, year: mockNewYear });

    const response = await request(app)
      .patch("/api/v1/period/year")
      .send({ oldYear: mockOldYear, newYear: mockNewYear });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty(
      "message",
      "Periode dengan tahun ini sudah ada."
    );
  });

  it("should return 500 if an internal server error occurs", async () => {
    Periods.findAll.mockRejectedValue(new Error("DB failure"));

    const response = await request(app)
      .patch("/api/v1/period/year")
      .send({ oldYear: 2022, newYear: 2023 });

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message", "DB failure");
  });
});
