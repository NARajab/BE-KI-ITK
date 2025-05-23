jest.mock("../app/models", () => ({
  Payments: {
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
    findAll: jest.fn(),
  },
  Progresses: {
    update: jest.fn(),
    findOne: jest.fn(),
  },
  Submissions: {
    findOne: jest.fn(),
  },
  UserSubmissions: {
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
const {
  Payments,
  Users,
  Progresses,
  Submissions,
  UserSubmissions,
} = require("../app/models");
const { Op } = require("sequelize");
const logActivity = require("../app/helpers/activityLogs");
const SendEmail = require("../emails/services/sendMail");

jest.mock("../emails/services/sendMail", () => jest.fn());

describe("GET /api/v1/payment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return paginated payments data with default pagination", async () => {
    const mockPayments = [
      { id: 1, amount: 1000 },
      { id: 2, amount: 2000 },
    ];
    const mockCount = 20;

    Payments.findAndCountAll.mockResolvedValue({
      count: mockCount,
      rows: mockPayments,
    });

    const res = await request(app)
      .get("/api/v1/payment")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "success",
      currentPage: 1,
      totalPages: Math.ceil(mockCount / 10),
      totalPayments: mockCount,
      limit: 10,
      payments: mockPayments,
    });

    expect(Payments.findAndCountAll).toHaveBeenCalledWith({
      distinct: true,
      limit: 10,
      offset: 0,
    });
  });

  it("should return paginated payments data with custom page and limit", async () => {
    const mockPayments = [{ id: 3, amount: 3000 }];
    const mockCount = 15;

    Payments.findAndCountAll.mockResolvedValue({
      count: mockCount,
      rows: mockPayments,
    });

    const res = await request(app)
      .get("/api/v1/payment?page=2&limit=5")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "success",
      currentPage: 2,
      totalPages: Math.ceil(mockCount / 5),
      totalPayments: mockCount,
      limit: 5,
      payments: mockPayments,
    });

    expect(Payments.findAndCountAll).toHaveBeenCalledWith({
      distinct: true,
      limit: 5,
      offset: 5, // (page 2 - 1) * 5
    });
  });

  it("should call next with ApiError on failure", async () => {
    const errorMessage = "Database failure";
    Payments.findAndCountAll.mockRejectedValue(new Error(errorMessage));

    const next = jest.fn();

    const res = await request(app)
      .get("/api/v1/payment")
      .set("Authorization", "Bearer fake-token")
      .catch(() => {});
  });
});

describe("GET /api/v1/payment/by-id/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a payment by id if it exists", async () => {
    const mockPayment = { id: 1, amount: 1000 };

    Payments.findByPk.mockResolvedValue(mockPayment);

    const res = await request(app)
      .get("/api/v1/payment/by-id/1")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "success",
      payment: mockPayment,
    });

    expect(Payments.findByPk).toHaveBeenCalledWith("1");
  });

  it("should return 404 if payment not found", async () => {
    Payments.findByPk.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/v1/payment/by-id/999")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      status: "Failed",
      message: "Pembayaran tidak ditemukan",
      statusCode: 404,
    });

    expect(Payments.findByPk).toHaveBeenCalledWith("999");
  });

  it("should handle internal server error", async () => {
    Payments.findByPk.mockRejectedValue(new Error("Database error"));

    const res = await request(app)
      .get("/api/v1/payment/by-id/1")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      status: "Error",
      message: "Database error",
      statusCode: 500,
    });

    expect(Payments.findByPk).toHaveBeenCalledWith("1");
  });
});

describe("GET /api/v1/payment/by-user-id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return paginated payments for authenticated user", async () => {
    const mockPayments = [
      { id: 1, userId: 1, amount: 1000 },
      { id: 2, userId: 1, amount: 2000 },
    ];

    Payments.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: mockPayments,
    });

    const res = await request(app)
      .get("/api/v1/payment/by-user-id?page=1&limit=2")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "success",
      currentPage: 1,
      totalPages: 1,
      totalPayments: 2,
      limit: 2,
      payments: mockPayments,
    });

    expect(Payments.findAndCountAll).toHaveBeenCalledWith({
      where: { userId: 1 },
      distinct: true,
      limit: 2,
      offset: 0,
    });
  });

  it("should handle internal server error", async () => {
    Payments.findAndCountAll.mockRejectedValue(new Error("Database error"));

    const res = await request(app)
      .get("/api/v1/payment/by-user-id")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      status: "Error",
      message: "Database error",
      statusCode: 500,
    });

    expect(Payments.findAndCountAll).toHaveBeenCalledWith({
      where: { userId: 1 },
      distinct: true,
      limit: 10,
      offset: 0,
    });
  });
});

describe("PATCH /api/v1/payment/payment-proof/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update payment and send email to admins", async () => {
    const mockPayment = {
      id: 1,
      submissionId: 10,
      billingCode: "BILL123",
    };
    const mockSubmission = { id: 10 };
    const mockUserSubmission = { id: 20 };
    const mockProgress = { id: 30 };
    const mockAdmins = [
      { email: "admin1@example.com" },
      { email: "admin2@example.com" },
    ];

    Payments.findByPk.mockResolvedValue(mockPayment);
    Submissions.findOne.mockResolvedValue(mockSubmission);
    UserSubmissions.findOne.mockResolvedValue(mockUserSubmission);
    Progresses.findOne.mockResolvedValue(mockProgress);
    Payments.update.mockResolvedValue([1]);
    Progresses.update.mockResolvedValue([1]);
    Users.findAll.mockResolvedValue(mockAdmins);

    const res = await request(app)
      .patch("/api/v1/payment/payment-proof/1")
      .field("paymentStatus", "true");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.message).toBe("Data pembayaran berhasil diupdate.");
    expect(res.body.updatedFields).toEqual({ paymentStatus: true });

    expect(Payments.update).toHaveBeenCalledWith(
      { paymentStatus: true },
      { where: { id: "1" } }
    );
    expect(Progresses.update).toHaveBeenCalledWith(
      { isStatus: true },
      { where: { id: mockProgress.id } }
    );
    expect(SendEmail).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalled();
  });

  it("should return 404 if payment not found", async () => {
    Payments.findByPk.mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/v1/payment/payment-proof/99")
      .field("paymentStatus", "true");

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Pembayaran tidak ditemukan");
  });

  it("should return 400 if no update data provided", async () => {
    Payments.findByPk.mockResolvedValue({
      id: 1,
      submissionId: 10,
      billingCode: "BILL123",
    });
    Submissions.findOne.mockResolvedValue({ id: 10 });
    UserSubmissions.findOne.mockResolvedValue({ id: 20 });
    Progresses.findOne.mockResolvedValue({ id: 30 });

    const res = await request(app)
      .patch("/api/v1/payment/payment-proof/1")
      .send({}); // memastikan req.body bukan undefined

    console.log(res.body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      "Tidak ada data yang diberikan untuk update."
    );
  });

  it("should return 500 if an error occurs", async () => {
    Payments.findByPk.mockRejectedValue(new Error("Unexpected Error"));

    const res = await request(app)
      .patch("/api/v1/payment/payment-proof/1")
      .field("paymentStatus", "true");

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Unexpected Error");
  });
});
