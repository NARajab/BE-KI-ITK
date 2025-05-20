jest.mock("../app/models", () => ({
  Users: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
    findByPk: jest.fn(),
    findAndCountAll: jest.fn(),
  },
}));
jest.mock("nodemailer");
jest.mock("jsonwebtoken");
jest.mock("../app/helpers/activityLogs", () => jest.fn());
jest.mock("../emails/services/sendMail");
jest.mock("fs", () => ({
  unlink: jest.fn((path, cb) => cb(null)),
  existsSync: jest.fn(() => true), // atau false sesuai kebutuhan test
  mkdirSync: jest.fn(),
}));

jest.mock("../utils/profanityFilter", () => ({
  containsProfanity: jest.fn(),
}));
jest.mock("bcrypt", () => ({
  hash: jest.fn(() => Promise.resolve("hashed-password")),
  compare: jest.fn(() => Promise.resolve(true)),
}));

const path = require("path");
const fs = require("fs");
const { Users } = require("../app/models");
const app = require("../app/index");
const sendEmail = require("../emails/services/sendMail");
const request = require("supertest");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { containsProfanity } = require("../utils/profanityFilter");
const { login, loginGoogle } = require("../app/controllers/authController");
const logActivity = require("../app/helpers/activityLogs");

describe("POST /api/v1/user", () => {
  const mockToken = "dummy-token";

  beforeAll(() => {
    jwt.sign.mockReturnValue(mockToken);
    jwt.verify = jest.fn(() => ({
      id: 1,
      fullname: "Admin User",
      email: "admin@example.com",
      role: "admin",
    }));

    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed-password");
  });

  beforeEach(() => {
    Users.findOne.mockReset();
    Users.create.mockReset();
    Users.findByPk.mockReset();
    logActivity.mockReset();

    Users.findByPk.mockResolvedValue({
      id: 1,
      fullname: "Admin User",
      email: "admin@example.com",
      role: "admin",
    });
  });

  it("should create a new user successfully", async () => {
    Users.findOne.mockResolvedValue(null);

    Users.create.mockResolvedValue({
      id: 1,
      fullname: "User",
      email: "user@example.com",
      faculty: "Engineering",
      studyProgram: "Computer Science",
      institution: "University",
      phoneNumber: "08123456789",
      role: "user",
      isVerified: true,
      image: null,
    });

    const response = await request(app)
      .post("/api/v1/user")
      .set("Authorization", `Bearer ${mockToken}`)
      .field("fullname", "User")
      .field("email", "user@example.com")
      .field("faculty", "Engineering")
      .field("studyProgram", "Computer Science")
      .field("institution", "University")
      .field("phoneNumber", "08123456789")
      .field("role", "user");

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("status", "success");
    expect(response.body.user).toHaveProperty("email", "user@example.com");

    expect(Users.findOne).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
    });
    expect(Users.create).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalled();
  });

  it("should return 400 if email already exists", async () => {
    Users.findOne.mockResolvedValue({
      id: 1,
      email: "test@example.com",
    });

    const response = await request(app)
      .post("/api/v1/user")
      .set("Authorization", `Bearer ${mockToken}`)
      .field("fullname", "Test User")
      .field("email", "test@example.com")
      .field("faculty", "Engineering")
      .field("studyProgram", "Computer Science")
      .field("institution", "Test University")
      .field("phoneNumber", "08123456789")
      .field("role", "user");

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message", "Email sudah terdaftar");
    expect(Users.create).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/user", () => {
  const mockToken = "dummy-token";

  beforeAll(() => {
    // Mock jwt.verify supaya middleware authenticate bisa berjalan
    jwt.verify = jest.fn(() => ({
      id: 1,
      fullname: "Admin User",
      email: "admin@example.com",
      role: "admin",
    }));
  });

  beforeEach(() => {
    Users.findAndCountAll.mockReset();
  });

  it("should return paginated users", async () => {
    Users.findAndCountAll.mockResolvedValue({
      count: 3,
      rows: [
        { id: 1, fullname: "User One", email: "one@example.com" },
        { id: 2, fullname: "User Two", email: "two@example.com" },
      ],
    });

    const response = await request(app)
      .get("/api/v1/user?page=1&limit=2")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "success");
    expect(response.body.currentPage).toBe(1);
    expect(response.body.limit).toBe(2);
    expect(response.body.totalUsers).toBe(3);
    expect(response.body.totalPages).toBe(Math.ceil(3 / 2));
    expect(response.body.users).toHaveLength(2);

    expect(Users.findAndCountAll).toHaveBeenCalledWith({
      limit: 2,
      offset: 0,
      order: [["id", "ASC"]],
    });
  });

  it("should use default page and limit if query params are missing", async () => {
    Users.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [{ id: 1, fullname: "User One", email: "one@example.com" }],
    });

    const response = await request(app)
      .get("/api/v1/user")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(response.status).toBe(200);
    expect(response.body.currentPage).toBe(1);
    expect(response.body.limit).toBe(10);

    expect(Users.findAndCountAll).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
      order: [["id", "ASC"]],
    });
  });

  it("should call next with ApiError on failure", async () => {
    // Simulate error thrown by findAndCountAll
    const errorMessage = "Database failure";
    Users.findAndCountAll.mockRejectedValue(new Error(errorMessage));

    // Untuk testing middleware error, kita bisa spy next function
    const next = jest.fn();

    // langsung panggil fungsi handler dengan dummy req, res, next
    const req = { query: {} };
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(),
    };

    await require("../app/controllers/userController").getAllUsers(
      req,
      res,
      next
    );

    expect(next).toHaveBeenCalled();
    const errorArg = next.mock.calls[0][0];
    expect(errorArg.message).toBe(errorMessage);
    expect(errorArg.statusCode).toBe(500);
  });
});

describe("GET /api/v1/user/:id", () => {
  beforeEach(() => {
    Users.findByPk.mockReset();
  });

  it("should return 200 and user data when user exists", async () => {
    const mockUser = {
      id: 1,
      fullname: "User Test",
      email: "user@test.com",
      role: "user",
    };

    Users.findByPk.mockResolvedValue(mockUser);

    const response = await request(app).get("/api/v1/user/1");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "success");
    expect(response.body).toHaveProperty("user");
    expect(response.body.user).toMatchObject({
      id: 1,
      fullname: "User Test",
      email: "user@test.com",
      role: "user",
    });
    expect(Users.findByPk).toHaveBeenCalledWith("1");
  });

  it("should return 404 when user not found", async () => {
    Users.findByPk.mockResolvedValue(null);

    const response = await request(app).get("/api/v1/user/999");

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message", "Pengguna tidak ditemukan");
    expect(Users.findByPk).toHaveBeenCalledWith("999");
  });

  it("should call next with ApiError on exception", async () => {
    const errorMessage = "Database error";
    Users.findByPk.mockRejectedValue(new Error(errorMessage));

    // Mock next function
    const next = jest.fn();

    // Because your route uses next(err), we can call the controller function directly to test this
    const getUserById =
      require("../app/controllers/userController").getUserById;

    const req = { params: { id: "1" } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await getUserById(req, res, next);

    expect(next).toHaveBeenCalled();
    const apiErrorInstance = next.mock.calls[0][0];
    expect(apiErrorInstance.message).toBe(errorMessage);
    expect(apiErrorInstance.statusCode).toBe(500);
  });
});

describe("GET /api/v1/user/reviewer", () => {
  beforeEach(() => {
    Users.findAll.mockReset();
  });

  it("should return 200 and list of reviewers", async () => {
    const mockReviewers = [
      { id: 1, fullname: "Reviewer One", role: "reviewer" },
      { id: 2, fullname: "Reviewer Two", role: "reviewer" },
    ];

    Users.findAll.mockResolvedValue(mockReviewers);

    const response = await request(app).get("/api/v1/user/reviewer");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "success");
    expect(response.body).toHaveProperty("users");
    expect(response.body.users).toEqual(mockReviewers);
    expect(Users.findAll).toHaveBeenCalledWith({ where: { role: "reviewer" } });
  });

  it("should call next with ApiError on exception", async () => {
    const errorMessage = "Database failure";
    Users.findAll.mockRejectedValue(new Error(errorMessage));

    // Mock next function
    const next = jest.fn();

    // Import controller function directly (pastikan path sesuai)
    const getAllUserReviewer =
      require("../app/controllers/userController").getAllUserReviewer;

    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await getAllUserReviewer(req, res, next);

    expect(next).toHaveBeenCalled();
    const apiErrorInstance = next.mock.calls[0][0];
    expect(apiErrorInstance.message).toBe(errorMessage);
    expect(apiErrorInstance.statusCode).toBe(500);
  });
});

describe("PATCH /api/v1/user/:id", () => {
  const mockToken = "dummy-token";
  beforeAll(() => {
    jwt.sign.mockReturnValue(mockToken);
    jwt.verify = jest.fn(() => ({
      id: 1,
      fullname: "Admin User",
      email: "admin@example.com",
      role: "admin",
    }));
  });
  beforeEach(() => {
    Users.findByPk.mockReset();
    containsProfanity.mockReset();
    logActivity.mockReset();
    fs.unlink.mockClear();
    Users.findByPk.mockResolvedValue({
      id: 1,
      fullname: "Admin User",
      email: "admin@example.com",
      role: "admin",
    });
  });

  const mockUser = {
    id: 2,
    fullname: "John Doe",
    image: "old-image.jpg",
    update: jest.fn().mockResolvedValue(true),
  };

  it("should update user successfully", async () => {
    Users.findByPk.mockImplementation((id) => {
      console.log("findByPk called with id:", id);
      if (id === "2") return Promise.resolve(mockUser);
      if (id === "1")
        return Promise.resolve({
          id: 1,
          fullname: "Admin User",
          email: "admin@example.com",
          role: "admin",
        });
      return Promise.resolve(null);
    });

    containsProfanity.mockReturnValue(false);

    const response = await request(app)
      .patch("/api/v1/user/2")
      .set("Authorization", `Bearer ${mockToken}`)
      .set("user-agent", "jest-test-agent")
      .send({
        fullname: "New Name",
        faculty: "New Faculty",
        studyProgram: "New Program",
        institution: "New Institution",
      });

    console.log(response.body);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "Pengguna berhasil diperbaharui"
    );

    expect(Users.findByPk).toHaveBeenCalledWith("2");
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        fullname: "New Name",
        faculty: "New Faculty",
        studyProgram: "New Program",
        institution: "New Institution",
      })
    );
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: undefined, // kalau mau, kamu bisa mock req.user supaya userId ada
        action: "Mengubah Data Pengguna",
        description: expect.stringContaining("berhasil memperbaharui"),
      })
    );
  });
});
