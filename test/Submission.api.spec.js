jest.mock("../app/models", () => ({
  Patents: {
    findByPk: jest.fn(),
  },
  Users: {
    findByPk: jest.fn(),
  },
  Copyrights: {
    findByPk: jest.fn(),
  },
  Brands: {
    findByPk: jest.fn(),
  },
  IndustrialDesigns: {
    findByPk: jest.fn(),
  },
  PersonalDatas: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  SubmissionTypes: {
    findAndCountAll: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
  },
  Submissions: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
  },
  UserSubmissions: {
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
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
jest.mock("fs", () => {
  const fsActual = jest.requireActual("fs");
  return {
    ...fsActual,
    unlink: jest.fn((path, cb) => cb(null)),
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
  };
});

const request = require("supertest");
const app = require("../app/index");
const {
  UserSubmissions,
  Submissions,
  SubmissionTypes,
  PersonalDatas,
  Patents,
  Copyrights,
  Brands,
  IndustrialDesigns,
  Users,
} = require("../app/models");
const fs = require("fs");
const { Op } = require("sequelize");
const logActivity = require("../app/helpers/activityLogs");

describe("GET /api/v1/submission/type", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 200 and a paginated list of submission types", async () => {
    SubmissionTypes.findAndCountAll.mockResolvedValue({
      count: 3,
      rows: [
        { id: 1, name: "Paten" },
        { id: 2, name: "Merek" },
        { id: 3, name: "Desain Industri" },
      ],
    });

    const res = await request(app).get(
      "/api/v1/submission/type?page=1&limit=10"
    );

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.totalTypes).toBe(3);
    expect(res.body.submissionsType.length).toBe(3);
    expect(SubmissionTypes.findAndCountAll).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
    });
  });

  it("should apply default pagination when no query params are given", async () => {
    SubmissionTypes.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [{ id: 1, name: "Hak Cipta" }],
    });

    const res = await request(app).get("/api/v1/submission/type");

    expect(res.status).toBe(200);
    expect(res.body.currentPage).toBe(1);
    expect(res.body.limit).toBe(10);
    expect(res.body.submissionsType.length).toBe(1);
    expect(SubmissionTypes.findAndCountAll).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
    });
  });

  it("should return 500 if there is a server error", async () => {
    SubmissionTypes.findAndCountAll.mockRejectedValue(new Error("DB Error"));

    const res = await request(app).get("/api/v1/submission/type");

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("DB Error");
  });
});
