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
  const mockOldYear = 2022;
  const mockNewYear = 2023;

  beforeEach(() => {
    jest.clearAllMocks();
    logActivity.mockResolvedValue();
  });

  it("should return 404 if period with oldYear is not found", async () => {
    Periods.findOne.mockResolvedValueOnce(null);

    const response = await request(app)
      .patch("/api/v1/period/year")
      .set("User-Agent", "jest-agent")
      .send({
        oldYear: mockOldYear,
        newYear: mockNewYear,
      });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message", "Periode tidak ditemukan.");
  });

  it("should return 400 if newYear already exists in another period", async () => {
    const existingPeriod = { id: 1, year: mockOldYear };
    const duplicatePeriod = { id: 2, year: mockNewYear };

    // 1st call = find oldYear, 2nd call = find duplicate
    Periods.findOne
      .mockResolvedValueOnce(existingPeriod)
      .mockResolvedValueOnce(duplicatePeriod);

    const response = await request(app)
      .patch("/api/v1/period/year")
      .set("User-Agent", "jest-agent")
      .send({
        oldYear: mockOldYear,
        newYear: mockNewYear,
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty(
      "message",
      "Periode dengan tahun ini sudah ada."
    );
  });

  it("should update the period successfully", async () => {
    const existingPeriod = { id: 1, year: mockOldYear };

    // 1st call = find oldYear, 2nd call = find duplicate (null = not found)
    Periods.findOne
      .mockResolvedValueOnce(existingPeriod)
      .mockResolvedValueOnce(null);
    Periods.update.mockResolvedValueOnce([1]); // return affected rows

    const response = await request(app)
      .patch("/api/v1/period/year")
      .set("User-Agent", "jest-agent")
      .send({
        oldYear: mockOldYear,
        newYear: mockNewYear,
      });

    expect(Periods.update).toHaveBeenCalledWith(
      { year: mockNewYear },
      { where: { year: mockOldYear } }
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "success");
    expect(response.body).toHaveProperty(
      "message",
      "Periode berhasil diperbarui"
    );
    expect(response.body).toHaveProperty("period");
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Mengubah Periode",
        description: "Admin User berhasil memperbaharui periode.",
        device: "jest-agent", // sesuaikan dengan header yang dikirim
        ipAddress: "::ffff:127.0.0.1",
      })
    );
  });

  it("should return 500 if an error occurs", async () => {
    Periods.findOne.mockRejectedValue(new Error("DB failure"));

    const response = await request(app)
      .patch("/api/v1/period/year")
      .set("User-Agent", "jest-agent")
      .send({
        oldYear: mockOldYear,
        newYear: mockNewYear,
      });

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message", "DB failure");
  });
});

describe("POST /api/v1/period/group/:id", () => {
  const mockGroupData = {
    group: "Gelombang A",
    startDate: "2025-01-01",
    endDate: "2025-01-31",
  };
  const mockUser = {
    id: 1,
    fullname: "Admin User",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    logActivity.mockResolvedValue();
  });

  it("should return 404 if period with given id is not found", async () => {
    Periods.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .post(`/api/v1/period/group/1`)
      .send(mockGroupData);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message", "Periode tidak ditemukan.");
  });

  it("should return 400 if group name is already used in the same period", async () => {
    Periods.findByPk.mockResolvedValue({ id: 1 });
    Groups.findOne.mockResolvedValue({ id: 2, group: mockGroupData.group });

    const response = await request(app)
      .post(`/api/v1/period/group/1`)
      .send(mockGroupData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty(
      "message",
      "Nama gelombang sudah digunakan oleh gelombang lain."
    );
  });

  it("should create new group and quota successfully", async () => {
    Periods.findByPk.mockResolvedValue({ id: 1 });
    Groups.findOne.mockResolvedValue(null);
    const createdGroup = { id: 10, ...mockGroupData, periodId: 1 };
    Groups.create.mockResolvedValue(createdGroup);
    const createdQuota = { id: 20, groupId: createdGroup.id };
    Quotas.create.mockResolvedValue(createdQuota);

    const response = await request(app)
      .post(`/api/v1/period/group/1`)
      .set("User-Agent", "jest-agent")
      .set("Authorization", "Bearer mocktoken") // optional if auth middleware used
      .send(mockGroupData);

    console.log(response.body);

    expect(Groups.create).toHaveBeenCalledWith({
      periodId: String(1),
      group: mockGroupData.group,
      startDate: mockGroupData.startDate,
      endDate: mockGroupData.endDate,
    });

    expect(Quotas.create).toHaveBeenCalledWith({
      groupId: createdGroup.id,
    });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: expect.any(Number), // sesuaikan jika userId mock tersedia
        action: "Menambah Gelombang",
        description: expect.stringContaining("berhasil menambah gelombang"),
        device: "jest-agent",
        ipAddress: "::ffff:127.0.0.1",
      })
    );

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("status", "success");
    expect(response.body).toHaveProperty(
      "message",
      "Gelombang berhasil ditambahkan"
    );
    expect(response.body).toHaveProperty("newGroup");
    expect(response.body).toHaveProperty("newQuota");
  });

  it("should return 500 if an error occurs", async () => {
    Periods.findByPk.mockRejectedValue(new Error("DB failure"));

    const response = await request(app)
      .post(`/api/v1/period/group/1`)
      .send(mockGroupData);

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message", "DB failure");
  });
});

describe("PATCH /api/v1/period/group/:id", () => {
  const mockGroupId = "1";
  const mockUser = { id: 1, fullname: "Admin User" };
  const mockHeaders = { "user-agent": "jest-agent" };
  const mockIp = "::ffff:127.0.0.1";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Middleware mock user
  beforeAll(() => {
    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });
  });

  it("should return 404 if group not found", async () => {
    Groups.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/v1/period/group/${mockGroupId}`)
      .set(mockHeaders)
      .send({
        group: "Gelombang B",
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty(
      "message",
      "Gelombang tidak ditemukan."
    );
  });

  it("should return 400 if new group name already exists in another group", async () => {
    const existingGroup = {
      id: mockGroupId,
      group: "Gelombang A",
      update: jest.fn(),
    };

    const duplicateGroup = { id: 2, group: "Gelombang B" };

    Groups.findByPk.mockResolvedValue(existingGroup);
    Groups.findOne.mockResolvedValueOnce(duplicateGroup); // group name duplicate

    const response = await request(app)
      .patch(`/api/v1/period/group/${mockGroupId}`)
      .set(mockHeaders)
      .send({ group: "Gelombang B" });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty(
      "message",
      "Nama gelombang sudah digunakan oleh gelombang lain."
    );
  });

  it("should return 400 if startDate and endDate already used by another group", async () => {
    const existingGroup = {
      id: mockGroupId,
      group: "Gelombang A",
      update: jest.fn(),
    };

    Groups.findByPk.mockResolvedValue(existingGroup);

    // Only one call to findOne (for date check)
    Groups.findOne.mockResolvedValueOnce({
      id: 2,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-31"),
    });

    const response = await request(app)
      .patch(`/api/v1/period/group/${mockGroupId}`)
      .set(mockHeaders)
      .send({
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty(
      "message",
      "Tanggal mulai dan akhir sudah digunakan oleh gelombang lain."
    );
  });

  it("should update group successfully", async () => {
    const existingGroup = {
      id: mockGroupId,
      group: "Gelombang A",
      update: jest.fn().mockResolvedValue(true),
    };

    Groups.findByPk.mockResolvedValue(existingGroup);

    Groups.findOne
      .mockResolvedValueOnce(null) // no group name conflict
      .mockResolvedValueOnce(null); // no date conflict

    const updatePayload = {
      group: "Gelombang Baru",
      startDate: "2025-01-01",
      endDate: "2025-01-31",
    };

    const response = await request(app)
      .patch(`/api/v1/period/group/${mockGroupId}`)
      .set(mockHeaders)
      .set("X-Forwarded-For", mockIp)
      .send(updatePayload);

    expect(existingGroup.update).toHaveBeenCalledWith({
      group: updatePayload.group,
      startDate: new Date(updatePayload.startDate),
      endDate: new Date(updatePayload.endDate),
    });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser.id,
        action: "Mengubah Periode",
        description: `${mockUser.fullname} berhasil memperbaharui periode.`,
        device: mockHeaders["user-agent"],
        ipAddress: mockIp,
      })
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "success");
    expect(response.body).toHaveProperty(
      "message",
      "Gelombang berhasil diperbarui"
    );
    expect(response.body).toHaveProperty("group");
  });

  it("should update only endDate if only that field is provided", async () => {
    const existingGroup = {
      id: mockGroupId,
      group: "Gelombang A",
      update: jest.fn().mockResolvedValue(true),
    };

    Groups.findByPk.mockResolvedValue(existingGroup);
    Groups.findOne.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/v1/period/group/${mockGroupId}`)
      .set(mockHeaders)
      .send({
        endDate: "2025-01-31",
      });

    expect(existingGroup.update).toHaveBeenCalledWith(
      expect.objectContaining({
        endDate: new Date("2025-01-31"),
      })
    );
    expect(response.status).toBe(200);
  });

  it("should return 500 if an error occurs", async () => {
    Groups.findByPk.mockRejectedValue(new Error("DB failure"));

    const response = await request(app)
      .patch(`/api/v1/period/group/${mockGroupId}`)
      .set(mockHeaders)
      .send({ group: "Gelombang C" });

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message", "DB failure");
  });
});

describe("PATCH /api/v1/period/quota/:id - updateQuota", () => {
  const mockQuotaId = 1;
  const mockUser = {
    id: 123,
    fullname: "John Doe",
  };

  const mockHeaders = {
    "user-agent": "jest-agent",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 404 if quota not found", async () => {
    Quotas.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/v1/period/quota/${mockQuotaId}`)
      .set(mockHeaders)
      .send({
        quota: 100,
        remainingQuota: 50,
      })
      .set("Authorization", "Bearer mocktoken")
      .expect(404);

    expect(response.body).toHaveProperty("message", "Quota tidak ditemukan.");
  });

  it("should update quota successfully and log activity", async () => {
    const fakeQuotaInstance = {
      id: mockQuotaId,
      quota: 100,
      remainingQuota: 50,
      update: jest.fn().mockResolvedValue(true),
    };

    Quotas.findByPk.mockResolvedValue(fakeQuotaInstance);

    const agent = request.agent(app);

    const response = await agent
      .patch(`/api/v1/period/quota/${mockQuotaId}`)
      .set(mockHeaders)
      .send({
        quota: 100,
        remainingQuota: 50,
      });

    expect(Quotas.findByPk).toHaveBeenCalledWith(String(mockQuotaId));
    expect(fakeQuotaInstance.update).toHaveBeenCalledWith({
      quota: 100,
      remainingQuota: 50,
    });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: expect.any(Number),
        action: "Mengubah Kuota",
        description: expect.stringContaining("berhasil memperbaharui kuota"),
        device: "jest-agent",
        ipAddress: expect.any(String),
      })
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: "success",
        message: "Kuota berhasil diperbarui",
        kuota: expect.objectContaining({
          id: mockQuotaId,
          quota: 100,
          remainingQuota: 50,
        }),
      })
    );
  });

  it("should call next with ApiError on unexpected error", async () => {
    const errorMessage = "DB error";
    Quotas.findByPk.mockRejectedValue(new Error(errorMessage));

    // To test next called with error, we mock next
    const next = jest.fn();

    const req = {
      params: { id: mockQuotaId },
      body: { quota: 10, remainingQuota: 5 },
      user: mockUser,
      headers: { "user-agent": "jest-agent" },
      ip: "127.0.0.1",
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const updateQuota =
      require("../app/controllers/periodController").updateQuota;

    await updateQuota(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: errorMessage,
        statusCode: 500,
      })
    );
  });
});

describe("GET /api/v1/period/group/:id", () => {
  const mockPeriodId = "1";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return groups with pagination data", async () => {
    const mockGroups = [
      { id: 1, group: "Gelombang A", periodId: mockPeriodId },
      { id: 2, group: "Gelombang B", periodId: mockPeriodId },
    ];

    Groups.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: mockGroups,
    });

    const response = await request(app)
      .get(`/api/v1/period/group/${mockPeriodId}`)
      .query({ page: 1, limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: "success",
        currentPage: 1,
        totalPages: 1,
        totalPeriods: 2,
        limit: 10,
        groups: expect.any(Array),
      })
    );

    expect(Groups.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
        offset: 0,
        order: [["id", "ASC"]],
        where: { periodId: mockPeriodId },
      })
    );
  });

  it("should use default page and limit if query params are invalid", async () => {
    const mockGroups = [
      { id: 3, group: "Gelombang C", periodId: mockPeriodId },
    ];

    Groups.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: mockGroups,
    });

    const response = await request(app)
      .get(`/api/v1/period/group/${mockPeriodId}`)
      .query({ page: "abc", limit: "xyz" });

    expect(response.status).toBe(200);
    expect(response.body.currentPage).toBe(1);
    expect(response.body.limit).toBe(10);
  });

  it("should handle internal server error", async () => {
    Groups.findAndCountAll.mockRejectedValue(new Error("DB error"));

    const response = await request(app).get(
      `/api/v1/period/group/${mockPeriodId}`
    );

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message");
  });
});

describe("GET /api/v1/period/group/not-pagination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return groups for current year without pagination", async () => {
    const currentYear = new Date().getFullYear().toString();

    const mockGroups = [
      {
        id: 1,
        group: "Gelombang A",
        period: { id: 10, year: currentYear },
      },
      {
        id: 2,
        group: "Gelombang B",
        period: { id: 11, year: currentYear },
      },
    ];

    Groups.findAll.mockResolvedValue(mockGroups);

    const response = await request(app).get(
      "/api/v1/period/group/not-pagination"
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: "success",
        groups: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            group: expect.any(String),
            period: expect.objectContaining({
              year: currentYear,
            }),
          }),
        ]),
      })
    );

    expect(Groups.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        include: [
          {
            model: Periods,
            as: "period",
            where: { year: currentYear },
          },
        ],
        order: [["id", "ASC"]],
      })
    );
  });

  it("should handle internal server error", async () => {
    Groups.findAll.mockRejectedValue(new Error("DB error"));

    const response = await request(app).get(
      "/api/v1/period/group/not-pagination"
    );

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message");
  });
});

describe("GET /api/v1/period", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return paginated list of periods", async () => {
    const mockPeriods = [
      { id: 1, year: 2025 },
      { id: 2, year: 2024 },
    ];
    const count = 2;

    Periods.findAndCountAll.mockResolvedValue({
      count,
      rows: mockPeriods,
    });

    const response = await request(app).get("/api/v1/period?page=1&limit=10");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "success",
      currentPage: 1,
      totalPages: 1,
      totalPeriods: 2,
      limit: 10,
      periods: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(Number),
          year: expect.any(Number),
        }),
      ]),
    });

    expect(Periods.findAndCountAll).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
      order: [["year", "DESC"]],
    });
  });

  it("should use default pagination if page and limit are not provided", async () => {
    const mockPeriods = [{ id: 3, year: 2023 }];
    Periods.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: mockPeriods,
    });

    const response = await request(app).get("/api/v1/period");

    expect(response.status).toBe(200);
    expect(response.body.currentPage).toBe(1);
    expect(response.body.limit).toBe(10);
  });

  it("should handle errors and return 500", async () => {
    Periods.findAndCountAll.mockRejectedValue(new Error("DB failure"));

    const response = await request(app).get("/api/v1/period");

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message");
  });
});

describe("GET /api/v1/period/group/group-id/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return group data if found", async () => {
    const mockGroup = { id: 1, name: "Gelombang 1" };
    Groups.findOne.mockResolvedValue(mockGroup);

    const response = await request(app).get("/api/v1/period/group/group-id/1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      group: mockGroup,
    });

    expect(Groups.findOne).toHaveBeenCalledWith({ where: { id: "1" } });
  });

  it("should return 404 if group not found", async () => {
    Groups.findOne.mockResolvedValue(null);

    const response = await request(app).get(
      "/api/v1/period/group/group-id/999"
    );

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      status: "Failed",
      message: "Gelombang tidak ditemukan.",
    });

    expect(Groups.findOne).toHaveBeenCalledWith({ where: { id: "999" } });
  });

  it("should handle server errors", async () => {
    Groups.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/api/v1/period/group/group-id/1");

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      status: "Error",
      message: "Database error",
    });
  });
});

describe("GET /api/v1/period/group/by-id/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return group and paginated quotas if group exists", async () => {
    const mockGroup = { id: 1, name: "Gelombang 1" };
    const mockQuotas = [
      { id: 1, groupId: 1, kuota: 50 },
      { id: 2, groupId: 1, kuota: 60 },
    ];

    Groups.findOne.mockResolvedValue(mockGroup);
    Quotas.count.mockResolvedValue(2);
    Quotas.findAll.mockResolvedValue(mockQuotas);

    const response = await request(app).get(
      "/api/v1/period/group/by-id/1?page=1&limit=10"
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      group: mockGroup,
      quota: mockQuotas,
      currentPage: 1,
      totalPages: 1,
      totalQuota: 2,
      limit: 10,
    });

    expect(Groups.findOne).toHaveBeenCalledWith({ where: { id: "1" } });
    expect(Quotas.count).toHaveBeenCalledWith({ where: { groupId: "1" } });
    expect(Quotas.findAll).toHaveBeenCalledWith({
      where: { groupId: "1" },
      limit: 10,
      offset: 0,
      order: [["id", "ASC"]],
    });
  });

  it("should return 404 if group not found", async () => {
    Groups.findOne.mockResolvedValue(null);

    const response = await request(app).get("/api/v1/period/group/by-id/999");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      status: "Failed",
      message: "Gelombang tidak ditemukan.",
    });

    expect(Groups.findOne).toHaveBeenCalledWith({ where: { id: "999" } });
  });

  it("should handle server errors", async () => {
    Groups.findOne.mockRejectedValue(new Error("DB Error"));

    const response = await request(app).get("/api/v1/period/group/by-id/1");

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      status: "Error",
      message: "DB Error",
    });
  });
});

describe("GET /api/v1/period/quota", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return paginated list of quotas", async () => {
    const mockQuotas = [
      { id: 1, kuota: 50, groupId: 1 },
      { id: 2, kuota: 40, groupId: 2 },
    ];
    const count = 2;

    Quotas.findAndCountAll.mockResolvedValue({
      count,
      rows: mockQuotas,
    });

    const response = await request(app).get(
      "/api/v1/period/quota?page=1&limit=10"
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      currentPage: 1,
      totalPages: 1,
      totalPeriods: 2,
      limit: 10,
      quotas: mockQuotas,
    });

    expect(Quotas.findAndCountAll).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
      order: [["id", "ASC"]],
    });
  });

  it("should handle internal server errors", async () => {
    Quotas.findAndCountAll.mockRejectedValue(new Error("DB error"));

    const response = await request(app).get("/api/v1/period/quota");

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      status: "Error",
      message: "DB error",
    });
  });
});

describe("GET /api/v1/period/quota/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a quota by id", async () => {
    const mockQuota = { id: 1, kuota: 50, groupId: 1 };

    Quotas.findByPk.mockResolvedValue(mockQuota);

    const response = await request(app).get("/api/v1/period/quota/1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      message: "Data quota berhasil diambil",
      quotas: mockQuota,
    });

    expect(Quotas.findByPk).toHaveBeenCalledWith("1"); // params are strings
  });

  it("should return 404 if quota not found", async () => {
    Quotas.findByPk.mockResolvedValue(null);

    const response = await request(app).get("/api/v1/period/quota/999");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      status: "Failed",
      message: "Quota tidak ditemukan.",
    });
  });

  it("should handle internal server error", async () => {
    Quotas.findByPk.mockRejectedValue(new Error("DB error"));

    const response = await request(app).get("/api/v1/period/quota/1");

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      status: "Error",
      message: "DB error",
    });
  });
});

describe("GET /api/v1/period/quota/by-groupid/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return quotas by groupId", async () => {
    const mockQuotas = [
      { id: 1, kuota: 50, groupId: 1 },
      { id: 2, kuota: 30, groupId: 1 },
    ];

    Quotas.findAll.mockResolvedValue(mockQuotas);

    const response = await request(app).get(
      "/api/v1/period/quota/by-groupid/1"
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      message: "Data quota berhasil diambil",
      quotas: mockQuotas,
    });

    expect(Quotas.findAll).toHaveBeenCalledWith({
      where: { groupId: "1" }, // karena req.params.id adalah string
    });
  });

  it("should return 404 if no quotas found", async () => {
    Quotas.findAll.mockResolvedValue([]);

    const response = await request(app).get(
      "/api/v1/period/quota/by-groupid/999"
    );

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      status: "Failed",
      message: "Quota tidak ditemukan.",
    });
  });

  it("should handle internal server error", async () => {
    Quotas.findAll.mockRejectedValue(new Error("DB error"));

    const response = await request(app).get(
      "/api/v1/period/quota/by-groupid/1"
    );

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      status: "Error",
      message: "DB error",
    });
  });
});

describe("GET /api/v1/period/all", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return all periods with nested groups and quotas", async () => {
    const mockPeriods = [
      {
        id: 1,
        year: 2024,
        group: [
          {
            id: 1,
            name: "Group A",
            quota: [
              { id: 1, kuota: 30 },
              { id: 2, kuota: 20 },
            ],
          },
        ],
      },
      {
        id: 2,
        year: 2025,
        group: [],
      },
    ];

    Periods.findAll.mockResolvedValue(mockPeriods);

    const response = await request(app).get("/api/v1/period/all");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      periods: mockPeriods,
    });

    expect(Periods.findAll).toHaveBeenCalledWith({
      order: [["id", "ASC"]],
      include: [
        {
          model: expect.anything(),
          as: "group",
          separate: true,
          order: [["id", "ASC"]],
          include: [
            {
              model: expect.anything(),
              as: "quota",
            },
          ],
        },
      ],
    });
  });

  it("should handle internal server error", async () => {
    Periods.findAll.mockRejectedValue(new Error("Database Error"));

    const response = await request(app).get("/api/v1/period/all");

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      status: "Error",
      message: "Database Error",
    });
  });
});

describe("GET /api/v1/period/this-year", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return all periods for the current year with groups and quotas", async () => {
    const currentYear = new Date().getFullYear().toString();

    const mockPeriods = [
      {
        id: 1,
        year: currentYear,
        group: [
          {
            id: 1,
            name: "Group A",
            quota: [
              { id: 1, kuota: 50 },
              { id: 2, kuota: 30 },
            ],
          },
        ],
      },
    ];

    Periods.findAll.mockResolvedValue(mockPeriods);

    const response = await request(app).get("/api/v1/period/this-year");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      periods: mockPeriods,
    });

    expect(Periods.findAll).toHaveBeenCalledWith({
      where: { year: currentYear },
      order: [["id", "ASC"]],
      include: [
        {
          model: expect.anything(),
          as: "group",
          separate: true,
          order: [["id", "ASC"]],
          include: [
            {
              model: expect.anything(),
              as: "quota",
            },
          ],
        },
      ],
    });
  });

  it("should handle internal server error", async () => {
    Periods.findAll.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/api/v1/period/this-year");

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      status: "Error",
      message: "Database error",
    });
  });
});

describe("PATCH /api/v1/period/year/active/:id", () => {
  const mockUser = {
    id: 1,
    fullname: "Admin User",
  };

  const mockHeaders = {
    "user-agent": "Mozilla/5.0",
  };

  const mockRequest = (id = "1") =>
    request(app)
      .patch(`/api/v1/period/year/active/${id}`)
      .set("User-Agent", mockHeaders["user-agent"])
      .set("Authorization", "Bearer fake-token")
      .set("X-Forwarded-For", "127.0.0.1");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should restore a period and all related groups and quotas", async () => {
    const mockPeriod = {
      id: 1,
      restore: jest.fn(),
    };

    const mockGroups = [
      {
        id: 101,
        restore: jest.fn(),
      },
      {
        id: 102,
        restore: jest.fn(),
      },
    ];

    const mockQuotas = {
      101: [
        { id: 201, restore: jest.fn() },
        { id: 202, restore: jest.fn() },
      ],
      102: [{ id: 203, restore: jest.fn() }],
    };

    Periods.findOne.mockResolvedValue(mockPeriod);
    Groups.findAll.mockResolvedValue(mockGroups);
    Quotas.findAll.mockImplementation(({ where }) =>
      Promise.resolve(mockQuotas[where.groupId] || [])
    );

    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });

    const res = await mockRequest("1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "success",
      message: "Periode dan semua data terkait berhasil dikembalikan.",
    });

    expect(Periods.findOne).toHaveBeenCalledWith({
      where: { id: "1" },
      paranoid: false,
    });

    expect(Groups.findAll).toHaveBeenCalledWith({
      where: { periodId: "1" },
      paranoid: false,
    });

    for (const group of mockGroups) {
      expect(Quotas.findAll).toHaveBeenCalledWith({
        where: { groupId: group.id },
        paranoid: false,
      });
    }

    for (const group of mockGroups) {
      expect(group.restore).toHaveBeenCalled();
    }

    for (const groupId in mockQuotas) {
      for (const quota of mockQuotas[groupId]) {
        expect(quota.restore).toHaveBeenCalled();
      }
    }

    expect(mockPeriod.restore).toHaveBeenCalled();

    expect(logActivity).toHaveBeenCalledWith({
      userId: mockUser.id,
      action: "Mengembalikan Periode",
      description: `${mockUser.fullname} berhasil mengembalikan periode.`,
      device: mockHeaders["user-agent"],
      ipAddress: "::ffff:127.0.0.1",
    });
  });

  it("should return 404 if period not found", async () => {
    Periods.findOne.mockResolvedValue(null);

    const res = await mockRequest("99");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      status: "Failed",
      message: "Periode dengan ID tersebut tidak ditemukan.",
      statusCode: 404,
    });
  });

  it("should return 500 if an error occurs", async () => {
    Periods.findOne.mockRejectedValue(new Error("Unexpected error"));

    const res = await mockRequest("1");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      status: "Error",
      message: "Unexpected error",
      statusCode: 500,
    });
  });
});

describe("PATCH /api/v1/period/active/:id", () => {
  const mockUser = {
    id: 1,
    fullname: "Admin User",
  };

  const mockHeaders = {
    "user-agent": "Mozilla/5.0",
  };

  const mockRequest = (id = "1") =>
    request(app)
      .patch(`/api/v1/period/active/${id}`)
      .set("User-Agent", mockHeaders["user-agent"])
      .set("Authorization", "Bearer fake-token")
      .set("X-Forwarded-For", "127.0.0.1");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should restore group and related quotas successfully", async () => {
    const mockGroup = {
      id: 1,
      restore: jest.fn(),
    };

    const mockQuotas = [
      { id: 10, restore: jest.fn() },
      { id: 11, restore: jest.fn() },
    ];

    Groups.findOne.mockResolvedValue(mockGroup);
    Quotas.findAll.mockResolvedValue(mockQuotas);

    // Middleware simulasi user
    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });

    const res = await mockRequest("1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "success",
      message: "Gelombang dan quota terkait berhasil dikembalikan",
    });

    expect(Groups.findOne).toHaveBeenCalledWith({
      where: { id: "1" },
      paranoid: false,
    });

    expect(Quotas.findAll).toHaveBeenCalledWith({
      where: { groupId: "1" },
      paranoid: false,
    });

    expect(mockGroup.restore).toHaveBeenCalled();
    for (const quota of mockQuotas) {
      expect(quota.restore).toHaveBeenCalled();
    }

    expect(logActivity).toHaveBeenCalledWith({
      userId: mockUser.id,
      action: "Mengembalikan Gelombang",
      description: `${mockUser.fullname} berhasil mengembalikan gelombang.`,
      device: mockHeaders["user-agent"],
      ipAddress: "::ffff:127.0.0.1",
    });
  });

  it("should return 404 if group not found", async () => {
    Groups.findOne.mockResolvedValue(null);

    const res = await mockRequest("999");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      status: "Failed",
      message: "Gelombang tidak ditemukan.",
      statusCode: 404,
    });
  });

  it("should return 500 if an error occurs", async () => {
    Groups.findOne.mockRejectedValue(new Error("Unexpected error"));

    const res = await mockRequest("1");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      status: "Error",
      message: "Unexpected error",
      statusCode: 500,
    });
  });
});

describe("DELETE /api/v1/period/:id", () => {
  const mockUser = {
    id: 1,
    fullname: "Admin User",
  };

  const mockHeaders = {
    "user-agent": "Mozilla/5.0",
  };

  const mockRequest = (id = "1") =>
    request(app)
      .delete(`/api/v1/period/${id}`)
      .set("User-Agent", mockHeaders["user-agent"])
      .set("Authorization", "Bearer fake-token")
      .set("X-Forwarded-For", "127.0.0.1");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete group and related quotas successfully", async () => {
    const mockGroup = {
      id: 1,
      destroy: jest.fn(),
    };

    Groups.findByPk.mockResolvedValue(mockGroup);
    Quotas.destroy.mockResolvedValue(2); // asumsi 2 data quota dihapus

    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });

    const res = await mockRequest("1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "success",
      message: "Gelombang dan quota terkait berhasil dihapus",
    });

    expect(Groups.findByPk).toHaveBeenCalledWith("1");
    expect(Quotas.destroy).toHaveBeenCalledWith({
      where: { groupId: "1" },
    });
    expect(mockGroup.destroy).toHaveBeenCalled();

    expect(logActivity).toHaveBeenCalledWith({
      userId: mockUser.id,
      action: "Menghapus Gelombang",
      description: `${mockUser.fullname} berhasil menghapus gelombang.`,
      device: mockHeaders["user-agent"],
      ipAddress: "::ffff:127.0.0.1",
    });
  });

  it("should return 404 if group not found", async () => {
    Groups.findByPk.mockResolvedValue(null);

    const res = await mockRequest("999");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      status: "Failed",
      message: "Gelombang tidak ditemukan.",
      statusCode: 404,
    });
  });

  it("should return 500 if an error occurs", async () => {
    Groups.findByPk.mockRejectedValue(new Error("Unexpected error"));

    const res = await mockRequest("1");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      status: "Error",
      message: "Unexpected error",
      statusCode: 500,
    });
  });
});

describe("DELETE /api/v1/period/year/:id", () => {
  const mockUser = {
    id: 1,
    fullname: "Admin User",
  };

  const mockHeaders = {
    "user-agent": "Mozilla/5.0",
  };

  const mockRequest = (id = "1") =>
    request(app)
      .delete(`/api/v1/period/year/${id}`)
      .set("User-Agent", mockHeaders["user-agent"])
      .set("Authorization", "Bearer fake-token")
      .set("X-Forwarded-For", "127.0.0.1");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete period, related groups, and quotas successfully", async () => {
    const mockPeriod = {
      id: 1,
      destroy: jest.fn(),
    };

    const mockGroups = [
      { id: 101, destroy: jest.fn() },
      { id: 102, destroy: jest.fn() },
    ];

    const mockQuotas = {
      101: [
        { id: 201, destroy: jest.fn() },
        { id: 202, destroy: jest.fn() },
      ],
      102: [{ id: 203, destroy: jest.fn() }],
    };

    Periods.findByPk.mockResolvedValue(mockPeriod);
    Groups.findAll.mockResolvedValue(mockGroups);
    Quotas.findAll.mockImplementation(({ where }) =>
      Promise.resolve(mockQuotas[where.groupId] || [])
    );

    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });

    const res = await mockRequest("1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "success",
      message: "Periode dan semua data terkait berhasil dihapus.",
    });

    expect(Periods.findByPk).toHaveBeenCalledWith("1");
    expect(Groups.findAll).toHaveBeenCalledWith({ where: { periodId: "1" } });

    for (const group of mockGroups) {
      expect(Quotas.findAll).toHaveBeenCalledWith({
        where: { groupId: group.id },
      });
    }

    for (const groupId in mockQuotas) {
      for (const quota of mockQuotas[groupId]) {
        expect(quota.destroy).toHaveBeenCalled();
      }
    }

    for (const group of mockGroups) {
      expect(group.destroy).toHaveBeenCalled();
    }

    expect(mockPeriod.destroy).toHaveBeenCalled();

    expect(logActivity).toHaveBeenCalledWith({
      userId: mockUser.id,
      action: "Menghapus Periode",
      description: `${mockUser.fullname} berhasil menghapus periode.`,
      device: mockHeaders["user-agent"],
      ipAddress: "::ffff:127.0.0.1",
    });
  });

  it("should return 404 if period not found", async () => {
    Periods.findByPk.mockResolvedValue(null);

    const res = await mockRequest("999");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      status: "Failed",
      message: "Periode dengan ID tersebut tidak ditemukan.",
      statusCode: 404,
    });
  });

  it("should return 500 if an error occurs", async () => {
    Periods.findByPk.mockRejectedValue(new Error("Unexpected error"));

    const res = await mockRequest("1");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      status: "Error",
      message: "Unexpected error",
      statusCode: 500,
    });
  });
});
