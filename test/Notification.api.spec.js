jest.mock("../app/models", () => ({
  Notifications: {
    update: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
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

const request = require("supertest");
const app = require("../app/index");
const { Notifications, Users } = require("../app/models");
const { Op } = require("sequelize");

describe("GET /api/v1/notification", () => {
  const mockNotifications = [
    {
      id: 1,
      userId: 3,
      title: "Pertanyaan di Pusat Bantuan",
      descripton: "Pertanyaan di Pusat Bantuan telah dijawab",
      isRead: true,
      createdAt: "2025-05-05T02:41:07.720Z",
      updatedAt: "2025-05-19T15:05:03.493Z",
      deletedAt: null,
    },
    {
      id: 2,
      userId: 3,
      title: "Notifikasi Tambahan",
      descripton: "Deskripsi notifikasi lainnya",
      isRead: false,
      createdAt: "2025-05-06T08:30:00.000Z",
      updatedAt: "2025-05-06T08:30:00.000Z",
      deletedAt: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return all notifications successfully", async () => {
    Notifications.findAll.mockResolvedValue(mockNotifications);

    const res = await request(app)
      .get("/api/v1/notification")
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(Array.isArray(res.body.notifications)).toBe(true);
    expect(res.body.notifications).toHaveLength(2);

    // Cek struktur dan nilai
    expect(res.body.notifications[0]).toMatchObject({
      id: 1,
      userId: 3,
      title: "Pertanyaan di Pusat Bantuan",
      descripton: "Pertanyaan di Pusat Bantuan telah dijawab",
      isRead: true,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      deletedAt: null,
    });

    expect(Notifications.findAll).toHaveBeenCalled();
  });

  it("should handle internal server error", async () => {
    Notifications.findAll.mockRejectedValue(new Error("DB Error"));

    const res = await request(app)
      .get("/api/v1/notification")
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(500);
    expect(res.body.status).toBe("Error");
    expect(res.body.message).toBe("DB Error");
  });
});

describe("GET /api/v1/notification/by-user-id", () => {
  const mockNotifications = [
    {
      id: 1,
      userId: 1,
      title: "Notifikasi A",
      descripton: "Deskripsi A",
      isRead: false,
      createdAt: "2025-05-10T08:00:00.000Z",
      updatedAt: "2025-05-10T08:00:00.000Z",
      deletedAt: null,
    },
    {
      id: 2,
      userId: 1,
      title: "Notifikasi B",
      descripton: "Deskripsi B",
      isRead: true,
      createdAt: "2025-05-09T07:00:00.000Z",
      updatedAt: "2025-05-09T07:00:00.000Z",
      deletedAt: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return user notifications and unread count", async () => {
    const mockUnreadCount = 1;

    Notifications.findAll.mockResolvedValue(mockNotifications);
    Notifications.count.mockResolvedValue(mockUnreadCount);

    const res = await request(app)
      .get("/api/v1/notification/by-user-id?limit=10")
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(Array.isArray(res.body.notification)).toBe(true);
    expect(res.body.notification).toHaveLength(2);
    expect(res.body.totalUnread).toBe(mockUnreadCount);

    expect(Notifications.findAll).toHaveBeenCalledWith({
      where: { userId: 1 },
      order: [["createdAt", "DESC"]],
      limit: 10,
    });

    expect(Notifications.count).toHaveBeenCalledWith({
      where: { userId: 1, isRead: false },
    });
  });

  it("should return 404 if no notifications found", async () => {
    Notifications.findAll.mockResolvedValue([]);
    Notifications.count.mockResolvedValue(0);

    const res = await request(app)
      .get("/api/v1/notification/by-user-id")
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Notifikasi tidak ditemukan");
  });

  it("should handle internal server error", async () => {
    Notifications.findAll.mockRejectedValue(new Error("DB Error"));

    const res = await request(app)
      .get("/api/v1/notification/by-user-id")
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(500);
    expect(res.body.status).toBe("Error");
    expect(res.body.message).toBe("DB Error");
  });
});

describe("GET /api/v1/notification/by-id/:id", () => {
  const mockNotification = {
    id: 1,
    userId: 1,
    title: "Notifikasi Contoh",
    descripton: "Deskripsi Notifikasi",
    isRead: false,
    createdAt: "2025-05-10T08:00:00.000Z",
    updatedAt: "2025-05-10T08:00:00.000Z",
    deletedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return the notification by id", async () => {
    Notifications.findByPk.mockResolvedValue(mockNotification);

    const res = await request(app)
      .get("/api/v1/notification/by-id/1")
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.notification).toEqual(mockNotification);
    expect(Notifications.findByPk).toHaveBeenCalledWith("1");
  });

  it("should return 404 if notification not found", async () => {
    Notifications.findByPk.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/v1/notification/by-id/999")
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Notifikasi tidak ditemukan");
    expect(Notifications.findByPk).toHaveBeenCalledWith("999");
  });

  it("should handle internal server error", async () => {
    Notifications.findByPk.mockRejectedValue(new Error("DB Error"));

    const res = await request(app)
      .get("/api/v1/notification/by-id/1")
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(500);
    expect(res.body.status).toBe("Error");
    expect(res.body.message).toBe("DB Error");
  });
});

describe("PATCH /api/v1/notification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should mark all notifications as read for the user", async () => {
    Notifications.update.mockResolvedValue([1]); // 1 baris diperbarui

    const res = await request(app)
      .patch("/api/v1/notification")
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.message).toBe(
      "Semua notifikasi berhasil ditandai sebagai sudah dibaca"
    );
    expect(Notifications.update).toHaveBeenCalledWith(
      { isRead: true },
      { where: { userId: 1 } }
    );
  });

  it("should handle internal server error", async () => {
    Notifications.update.mockRejectedValue(new Error("Database error"));

    const res = await request(app)
      .patch("/api/v1/notification")
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(500);
    expect(res.body.status).toBe("Error");
    expect(res.body.message).toBe("Database error");
  });
});
