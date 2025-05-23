const request = require("supertest");
const app = require("../app/index");
const { ActivityLogs } = require("../app/models");
const ApiError = require("../utils/apiError");

jest.mock("../utils/apiError", () =>
  jest.fn().mockImplementation(function ApiError(message, statusCode) {
    this.message = message;
    this.statusCode = statusCode;
  })
);

describe("GET /api/v1/activity-log", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 200 and paginated activity logs", async () => {
    const mockLogs = [
      { id: 1, activity: "Login", user: { id: 1, name: "John Doe" } },
    ];

    ActivityLogs.findAndCountAll = jest.fn().mockResolvedValue({
      count: 1,
      rows: mockLogs,
    });

    const res = await request(app).get("/api/v1/activity-log?limit=10&page=1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "success",
      currentPage: 1,
      totalPages: 1,
      totalTypes: 1,
      limit: 10,
      activityLogs: mockLogs,
    });

    expect(ActivityLogs.findAndCountAll).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
      order: [["createdAt", "DESC"]],
      include: ["user"],
    });
  });

  it("should return 500 and handle internal server error", async () => {
    const ApiError = require("../utils/apiError");

    ActivityLogs.findAndCountAll = jest
      .fn()
      .mockRejectedValue(new Error("DB failed"));

    const res = await request(app).get("/api/v1/activity-log?limit=10&page=1");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      message: "DB failed",
      statusCode: 500,
    });

    expect(ApiError).toHaveBeenCalledWith("DB failed", 500);
  });
});
