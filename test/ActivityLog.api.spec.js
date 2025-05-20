const request = require("supertest");
const app = require("../app/index");
const { ActivityLogs } = require("../app/models");

jest.mock("../app/models", () => ({
  ActivityLogs: {
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
  },
}));

jest.mock("../utils/apiError", () => {
  return jest.fn().mockImplementation((message, statusCode) => {
    return { message, statusCode };
  });
});

const ApiError = require("../utils/apiError");

describe("GET /api/v1/activity-log", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 200 and all activity logs when limit is 0", async () => {
    const mockLogs = [
      { id: 1, activity: "Login", user: { id: 1, name: "John Doe" } },
    ];

    ActivityLogs.findAll.mockResolvedValue(mockLogs);

    const res = await request(app).get("/api/v1/activity-log?limit=0");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "success",
      activityLogs: mockLogs,
    });

    expect(ActivityLogs.findAll).toHaveBeenCalledWith({
      order: [["createdAt", "DESC"]],
      include: ["user"],
    });
  });

  it("should return paginated activity logs when limit > 0", async () => {
    const mockLogs = [
      { id: 1, activity: "Login", user: { id: 1, name: "Jane Doe" } },
    ];

    ActivityLogs.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: mockLogs,
    });

    const res = await request(app).get("/api/v1/activity-log?page=1&limit=10");

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

  it("should handle internal server error", async () => {
    ActivityLogs.findAndCountAll.mockRejectedValue(new Error("DB failed"));

    const res = await request(app).get("/api/v1/activity-log?page=1&limit=10");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      message: "DB failed",
      statusCode: 500,
    });

    expect(ApiError).toHaveBeenCalledWith("DB failed", 500);
  });
});
