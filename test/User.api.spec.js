jest.mock("../app/models", () => ({
  Users: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
    findByPk: jest.fn(),
    findAndCountAll: jest.fn(),
    restore: jest.fn(),
  },
}));
jest.mock("jsonwebtoken");
jest.mock("../app/helpers/activityLogs", () => jest.fn());
jest.mock("../emails/services/sendMail");
jest.mock("fs", () => {
  const fsActual = jest.requireActual("fs");
  return {
    ...fsActual,
    unlink: jest.fn((path, cb) => cb(null)),
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
  };
});
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
    const errorMessage = "Database failure";
    Users.findAndCountAll.mockRejectedValue(new Error(errorMessage));

    const next = jest.fn();

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

    const next = jest.fn();

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

    const next = jest.fn();

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
    jwt.verify = jest.fn((token) => {
      return {
        id: 99,
        fullname: "Admin User",
        email: "admin@example.com",
        role: "admin",
      };
    });
  });
  beforeEach(() => {
    Users.findByPk.mockReset();
    containsProfanity.mockReset();
    logActivity.mockReset();
    fs.unlink.mockClear();

    Users.findByPk.mockImplementation((id) => {
      console.log("findByPk called with id:", id);
      if (id === 99 || id === "99") {
        return Promise.resolve({
          id: 99,
          fullname: "Admin User",
          email: "admin@example.com",
          role: "admin",
        });
      } else if (id === 2 || id === "2") {
        return Promise.resolve(mockUser);
      }
      return Promise.resolve(null);
    });
  });

  const mockUser = {
    id: 2,
    fullname: "John Doe",
    image: "old-image.jpg",
    update: jest.fn().mockResolvedValue(true),
  };

  it("should update user successfully", async () => {
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
        userId: 99,
        action: "Mengubah Data Pengguna",
        description: expect.stringContaining("berhasil memperbaharui"),
      })
    );
  });
  it("should return 404 if user not found", async () => {
    Users.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .patch("/api/v1/user/999")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message", "Pengguna tidak ditemukan");
  });
  it("should return 400 if fullname contains profanity", async () => {
    containsProfanity.mockImplementation((text) => text.includes("badword"));

    const response = await request(app)
      .patch("/api/v1/user/2")
      .set("Authorization", `Bearer ${mockToken}`)
      .send({
        fullname: "badword name", // Memicu filter kata tidak pantas
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty(
      "message",
      expect.stringContaining("fullname")
    );
  });
  it("should update user and replace old image if file uploaded", async () => {
    containsProfanity.mockReturnValue(false);
    mockUser.image = "old-image.jpg";
    mockUser.update = jest.fn().mockResolvedValue(mockUser);
    fs.unlink.mockImplementation((path, cb) => cb(null));

    console.log("Starting PATCH test with file upload");

    const response = await request(app)
      .patch("/api/v1/user/2")
      .set("Authorization", `Bearer ${mockToken}`)
      .set("user-agent", "jest-test-agent")
      .attach("image", Buffer.from("fake image content"), "new-image.jpg")
      .field("fullname", "Updated Name");

    console.log("Response status:", response.status);
    console.log("Response body:", response.body);
    console.log("fs.unlink calls:", fs.unlink.mock.calls);
    console.log("mockUser.update calls:", mockUser.update.mock.calls);

    expect(response.status).toBe(200);
    expect(fs.unlink).toHaveBeenCalledWith(
      expect.stringContaining("old-image.jpg"),
      expect.any(Function)
    );
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        image: expect.any(String),
      })
    );
  });
  it("should log error if fs.unlink fails but continue", async () => {
    containsProfanity.mockReturnValue(false);
    mockUser.image = "old-image.jpg";
    const unlinkError = new Error("unlink failed");

    fs.unlink.mockImplementation((path, cb) => cb(unlinkError));
    jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await request(app)
      .patch("/api/v1/user/2")
      .set("Authorization", `Bearer ${mockToken}`)
      .attach("image", Buffer.from("image"), "image.jpg");

    expect(response.status).toBe(200);
    expect(console.error).toHaveBeenCalledWith(
      "Gagal menghapus gambar lama:",
      "unlink failed"
    );

    console.error.mockRestore();
  });
  it("should return 500 if an error is thrown", async () => {
    Users.findByPk.mockImplementation(() => {
      throw new Error("Database down");
    });

    const response = await request(app)
      .patch("/api/v1/user/2")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message", "Database down");
  });
});

describe("DELETE /api/v1/user/:id", () => {
  const mockToken = "dummy-token";

  beforeAll(() => {
    jwt.verify.mockReturnValue({
      id: 1,
      fullname: "Admin User",
      email: "admin@example.com",
      role: "admin",
    });
  });

  beforeEach(() => {
    Users.findByPk.mockResolvedValue({
      id: 1,
      fullname: "Admin User",
      email: "admin@example.com",
      role: "admin",
    });

    logActivity.mockReset();
  });

  it("should delete the user successfully", async () => {
    const mockUserToDelete = {
      id: 2,
      fullname: "User to Delete",
      destroy: jest.fn().mockResolvedValue(),
    };

    Users.findByPk.mockImplementation((id) => {
      if (id === "2") return Promise.resolve(mockUserToDelete);
      if (id === 1)
        return Promise.resolve({
          id: 1,
          fullname: "Admin User",
          email: "admin@example.com",
          role: "admin",
        });
      return null;
    });

    const response = await request(app)
      .delete("/api/v1/user/2")
      .set("Authorization", `Bearer ${mockToken}`)
      .set("User-Agent", "jest-test-agent");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "Penggunas berhasil dihapus"
    );
    expect(Users.findByPk).toHaveBeenCalledWith("2");
    expect(mockUserToDelete.destroy).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Menghapus Pengguna",
        description: expect.stringContaining("berhasil menghapus pengguna"),
        device: expect.any(String),
        ipAddress: expect.any(String),
      })
    );
  });

  it("should return 404 if user not found", async () => {
    Users.findByPk.mockImplementation((id) => {
      if (id === 1)
        return Promise.resolve({
          id: 1,
          fullname: "Admin User",
          email: "admin@example.com",
          role: "admin",
        });
      return null;
    });

    const response = await request(app)
      .delete("/api/v1/user/999")
      .set("Authorization", `Bearer ${mockToken}`);

    console.log("Response body:", response.body);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message", "Pengguna tidak ditemukan");
    expect(Users.findByPk).toHaveBeenCalledWith("999");
  });

  it("should handle server error", async () => {
    Users.findByPk.mockRejectedValue(new Error("DB error"));

    const response = await request(app)
      .delete("/api/v1/user/3")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message", "DB error");
  });
});

describe("PATCH /api/v1/user/active/:id", () => {
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
    Users.findOne.mockReset();
    logActivity.mockReset();
  });

  it("should restore a soft-deleted user successfully", async () => {
    Users.findByPk.mockResolvedValue({
      id: 1,
      fullname: "Admin User",
      email: "admin@example.com",
      role: "admin",
    });

    const mockUserToRestore = {
      id: 2,
      fullname: "Deleted User",
      deletedAt: new Date(),
      restore: jest.fn().mockResolvedValue(),
    };

    Users.findOne.mockResolvedValue(mockUserToRestore);

    const response = await request(app)
      .patch("/api/v1/user/active/2")
      .set("Authorization", `Bearer ${mockToken}`)
      .set("User-Agent", "jest-agent");

    console.log("Restore response:", response.body);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "Pengguna berhasil dipulihkan"
    );
    expect(Users.findOne).toHaveBeenCalledWith({
      where: { id: "2" },
      paranoid: false,
    });
    expect(mockUserToRestore.restore).toHaveBeenCalled();

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Merestore Pengguna",
        description: expect.stringContaining("berhasil merestore pengguna"),
        device: "jest-agent",
        ipAddress: expect.any(String),
      })
    );
  });

  it("should return 404 if user is not found", async () => {
    Users.findByPk.mockResolvedValue({
      id: 1,
      fullname: "Admin User",
      email: "admin@example.com",
      role: "admin",
    });
    Users.findOne.mockResolvedValue(null);

    const response = await request(app)
      .patch("/api/v1/user/active/999")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message", "Pengguna tidak ditemukan");
  });

  it("should return 400 if user is not soft deleted", async () => {
    Users.findByPk.mockResolvedValue({
      id: 1,
      fullname: "Admin User",
      email: "admin@example.com",
      role: "admin",
    });
    const mockUser = {
      id: 2,
      fullname: "User",
      deletedAt: null,
    };

    Users.findOne.mockResolvedValue(mockUser);

    const response = await request(app)
      .patch("/api/v1/user/active/2")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message", "Pengguna belum dihapus");
  });
});
