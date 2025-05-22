jest.mock("../app/models", () => ({
  HelpCenters: {
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
    findOne: jest.fn(),
    findAll: jest.fn(),
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

jest.mock("../emails/services/sendMail", () => jest.fn());
jest.mock("../app/helpers/notifications", () => jest.fn());
jest.mock("../emails/templates/helpCenterMailUser", () =>
  jest.fn(() => "<p>Email content</p>")
);

const sendEmail = require("../emails/services/sendMail");
const sendNotification = require("../app/helpers/notifications");
const request = require("supertest");
const app = require("../app/index");
const { HelpCenters, Users } = require("../app/models");
const { Op } = require("sequelize");
const logActivity = require("../app/helpers/activityLogs");

describe("POST /api/v1/help-center", () => {
  it("should create a new HelpCenter entry and notify admins", async () => {
    const mockRequestData = {
      email: "user@example.com",
      phoneNumber: "08123456789",
      problem: "Login Error",
      message: "I can't login to my account",
    };

    const mockUser = {
      id: 123,
      fullname: "John Doe",
      email: mockRequestData.email,
    };

    const mockHelpCenter = {
      ...mockRequestData,
      id: 1,
      document: null,
      status: false,
    };

    const mockAdmins = [
      { email: "admin1@example.com" },
      { email: "admin2@example.com" },
    ];

    Users.findOne.mockResolvedValue(mockUser);
    Users.findAll.mockResolvedValue(mockAdmins);
    HelpCenters.create.mockResolvedValue(mockHelpCenter);

    const response = await request(app)
      .post("/api/v1/help-center")
      .send(mockRequestData)
      .set("User-Agent", "jest-test");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Help Center berhasil ditambahkan");
    expect(HelpCenters.create).toHaveBeenCalledWith({
      ...mockRequestData,
      document: null,
      status: false,
    });

    expect(logActivity).toHaveBeenCalledWith({
      userId: mockUser.id,
      action: "Mengajukan Pertanyaan di Help Center",
      description: `${mockUser.fullname} berhasil mengajukan pertanyaan di Help Center.`,
      device: "jest-test",
      ipAddress: expect.any(String),
    });

    expect(sendEmail).toHaveBeenCalledWith({
      to: ["admin1@example.com", "admin2@example.com"],
      subject: "Pertanyaan di Pusat Bantuan",
      html: "<p>Email content</p>",
    });
  });

  it("should still log and send email even if user is not found", async () => {
    const mockRequestData = {
      email: "user@example.com",
      phoneNumber: "08123456789",
      problem: "Login Error",
      message: "I can't login to my account",
    };
    Users.findOne.mockResolvedValue(null); // no user found
    Users.findAll.mockResolvedValue([{ email: "admin@example.com" }]);
    HelpCenters.create.mockResolvedValue({ id: 1, ...mockRequestData });

    const response = await request(app)
      .post("/api/v1/help-center")
      .send(mockRequestData)
      .set("User-Agent", "jest-test");

    expect(response.statusCode).toBe(200);
    expect(logActivity).toHaveBeenCalledWith({
      userId: null,
      action: "Mengajukan Pertanyaan di Help Center",
      description: `${mockRequestData.email} berhasil mengajukan pertanyaan di Help Center.`,
      device: "jest-test",
      ipAddress: expect.any(String),
    });
  });
});

describe("PATCH /api/v1/help-center/:id", () => {
  const mockHelpCenter = {
    id: 1,
    email: "user@example.com",
    phoneNumber: "08123456789",
    problem: "Login Error",
    message: "I can't login",
    answer: null,
    status: false,
    update: jest.fn().mockResolvedValue(true),
  };

  const mockUser = {
    id: 10,
    fullname: "Test User",
    email: "user@example.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update HelpCenter with answer and notify the user", async () => {
    HelpCenters.findByPk.mockResolvedValue(mockHelpCenter);
    Users.findOne.mockResolvedValue(mockUser);

    const response = await request(app)
      .patch("/api/v1/help-center/1")
      .send({ answer: "Silakan coba reset password Anda." })
      .set("User-Agent", "jest-agent");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Help Center berhasil diperbarui");

    expect(mockHelpCenter.update).toHaveBeenCalledWith({
      answer: "Silakan coba reset password Anda.",
      status: true,
    });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Menjawab Pertanyaan di Help Center",
        description: expect.stringContaining("berhasil menjawab"),
      })
    );

    expect(sendEmail).toHaveBeenCalledWith({
      to: mockUser.email,
      subject: "Pertanyaan di Pusat Bantuan",
      html: expect.any(String),
    });

    expect(sendNotification).toHaveBeenCalledWith(
      mockUser.id,
      "Pertanyaan di Pusat Bantuan",
      "Pertanyaan di Pusat Bantuan telah dijawab"
    );
  });

  it("should return 404 if HelpCenter not found", async () => {
    HelpCenters.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .patch("/api/v1/help-center/999")
      .send({ answer: "Some answer" });

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("Help Center tidak ditemukan");
  });

  it("should return 400 if user ID is invalid", async () => {
    HelpCenters.findByPk.mockResolvedValue(mockHelpCenter);
    Users.findOne.mockResolvedValue({ id: NaN, email: "invalid@example.com" });

    const response = await request(app)
      .patch("/api/v1/help-center/1")
      .send({ answer: "Some answer" });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("ID pengguna tidak valid");
  });
});

describe("GET /api/v1/help-center", () => {
  const mockHelpCenters = [
    {
      id: 1,
      email: "user1@example.com",
      phoneNumber: "08123456789",
      problem: "Masalah login",
      message: "Tidak bisa login",
      answer: null,
      status: false,
    },
    {
      id: 2,
      email: "user2@example.com",
      phoneNumber: "08123456780",
      problem: "Error aplikasi",
      message: "Aplikasi sering error",
      answer: "Silakan update aplikasi",
      status: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return paginated help center data with default pagination", async () => {
    HelpCenters.findAndCountAll.mockResolvedValue({
      count: mockHelpCenters.length,
      rows: mockHelpCenters,
    });

    const response = await request(app).get("/api/v1/help-center").query({});

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Help Center berhasil ditemukan");
    expect(response.body.currentPage).toBe(1);
    expect(response.body.limit).toBe(10);
    expect(response.body.totalPages).toBe(
      Math.ceil(mockHelpCenters.length / 10)
    );
    expect(response.body.helpCenter).toEqual(mockHelpCenters);

    expect(HelpCenters.findAndCountAll).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
      order: [["id", "ASC"]],
    });
  });

  it("should return paginated help center data with specified page and limit", async () => {
    HelpCenters.findAndCountAll.mockResolvedValue({
      count: 50,
      rows: mockHelpCenters,
    });

    const response = await request(app)
      .get("/api/v1/help-center")
      .query({ page: 3, limit: 5 });

    expect(response.statusCode).toBe(200);
    expect(response.body.currentPage).toBe(3);
    expect(response.body.limit).toBe(5);
    expect(response.body.totalPages).toBe(Math.ceil(50 / 5));
    expect(response.body.helpCenter).toEqual(mockHelpCenters);

    expect(HelpCenters.findAndCountAll).toHaveBeenCalledWith({
      limit: 5,
      offset: 10, // (3 - 1) * 5
      order: [["id", "ASC"]],
    });
  });

  it("should handle errors and return 500", async () => {
    HelpCenters.findAndCountAll.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/api/v1/help-center");

    expect(response.statusCode).toBe(500);
    expect(response.body.status).toBe("Error");
    expect(response.body.message).toBe("Database error");
  });
});

describe("GET /api/v1/help-center/:id", () => {
  const mockHelpCenter = {
    id: 1,
    email: "user@example.com",
    phoneNumber: "08123456789",
    problem: "Login Error",
    message: "I can't login to my account",
    answer: null,
    status: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return help center data when found", async () => {
    HelpCenters.findByPk.mockResolvedValue(mockHelpCenter);

    const response = await request(app).get("/api/v1/help-center/1");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Help Center berhasil ditemukan");
    expect(response.body.helpCenter).toEqual(mockHelpCenter);

    expect(HelpCenters.findByPk).toHaveBeenCalledWith("1");
  });

  it("should return 404 if help center not found", async () => {
    HelpCenters.findByPk.mockResolvedValue(null);

    const response = await request(app).get("/api/v1/help-center/999");

    expect(response.statusCode).toBe(404);
    expect(response.body.status).toBe("Failed");
    expect(response.body.message).toBe("Help Center tidak ditemukan");
  });

  it("should return 500 on server error", async () => {
    HelpCenters.findByPk.mockRejectedValue(new Error("Database failure"));

    const response = await request(app).get("/api/v1/help-center/1");

    expect(response.statusCode).toBe(500);
    expect(response.body.status).toBe("Error");
    expect(response.body.message).toBe("Database failure");
  });
});

describe("PATCH /api/v1/help-center/active/:id", () => {
  const mockUser = {
    id: 1,
    fullname: "Admin User",
  };

  const mockHelpCenterDeleted = {
    id: 1,
    deletedAt: new Date(),
    restore: jest.fn().mockResolvedValue(),
  };

  const mockHelpCenterNotDeleted = {
    id: 2,
    deletedAt: null,
    restore: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should restore a deleted Help Center entry", async () => {
    // Mock req.user injected by auth middleware
    // Mock HelpCenters.findOne returns deleted entry
    HelpCenters.findOne.mockResolvedValue(mockHelpCenterDeleted);

    // Mock logActivity to resolve immediately
    logActivity.mockResolvedValue();

    // Simulate request with user-agent and ip
    const response = await request(app)
      .patch("/api/v1/help-center/active/1")
      .set("User-Agent", "jest-test")
      .set("X-Forwarded-For", "127.0.0.1") // or .set("X-Real-IP", "127.0.0.1")
      .send();

    expect(HelpCenters.findOne).toHaveBeenCalledWith({
      where: { id: "1" },
      paranoid: false,
    });

    expect(mockHelpCenterDeleted.restore).toHaveBeenCalled();

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser.id,
        action: "Mengembalikan Pertanyaan di Help Center",
        description: expect.stringContaining("berhasil mengembalikan"),
        device: "jest-test",
        ipAddress: expect.any(String),
      })
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Help Center berhasil dikembalikan");
  });

  it("should return 404 if Help Center not found", async () => {
    HelpCenters.findOne.mockResolvedValue(null);

    const response = await request(app).patch("/api/v1/help-center/active/999");

    expect(response.statusCode).toBe(404);
    expect(response.body.status).toBe("Failed");
    expect(response.body.message).toBe("Help Center tidak ditemukan");
  });

  it("should return 400 if Help Center is not deleted", async () => {
    HelpCenters.findOne.mockResolvedValue(mockHelpCenterNotDeleted);

    const response = await request(app).patch("/api/v1/help-center/active/2");

    expect(response.statusCode).toBe(400);
    expect(response.body.status).toBe("Failed");
    expect(response.body.message).toBe(
      "Help Center ini belum dihapus, jadi tidak bisa direstore"
    );
  });

  it("should return 500 on server error", async () => {
    HelpCenters.findOne.mockRejectedValue(new Error("Database failure"));

    const response = await request(app).patch("/api/v1/help-center/active/1");

    expect(response.statusCode).toBe(500);
    expect(response.body.status).toBe("Error");
    expect(response.body.message).toBe("Database failure");
  });
});

describe("DELETE /api/v1/help-center/:id", () => {
  const mockUser = {
    id: 1,
    fullname: "Admin User",
  };

  const mockHelpCenter = {
    id: 1,
    destroy: jest.fn().mockResolvedValue(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete a Help Center entry successfully", async () => {
    HelpCenters.findByPk.mockResolvedValue(mockHelpCenter);
    logActivity.mockResolvedValue();

    const response = await request(app)
      .delete("/api/v1/help-center/1")
      .set("User-Agent", "jest-test")
      .set("X-Forwarded-For", "127.0.0.1") // optional for IP
      .send();

    expect(HelpCenters.findByPk).toHaveBeenCalledWith("1");
    expect(mockHelpCenter.destroy).toHaveBeenCalled();

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser.id,
        action: "Menghapus Pertanyaan di Help Center",
        description: expect.stringContaining("berhasil menghapus"),
        device: "jest-test",
        ipAddress: expect.any(String),
      })
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Help Center berhasil dihapus");
  });

  it("should return 404 if Help Center not found", async () => {
    HelpCenters.findByPk.mockResolvedValue(null);

    const response = await request(app).delete("/api/v1/help-center/999");

    expect(response.statusCode).toBe(404);
    expect(response.body.status).toBe("Failed");
    expect(response.body.message).toBe("Help Center tidak ditemukan");
  });

  it("should return 500 on server error", async () => {
    HelpCenters.findByPk.mockRejectedValue(new Error("Database failure"));

    const response = await request(app).delete("/api/v1/help-center/1");

    expect(response.statusCode).toBe(500);
    expect(response.body.status).toBe("Error");
    expect(response.body.message).toBe("Database failure");
  });
});
