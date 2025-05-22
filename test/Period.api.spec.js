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
  const mockIp = "::1";

  beforeEach(() => {
    jest.clearAllMocks();
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
    Groups.findOne.mockResolvedValueOnce(duplicateGroup); // duplicate check for group name

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
    const mockGroupId = "1";
    const existingGroup = {
      id: mockGroupId,
      group: "Gelombang A",
      update: jest.fn(),
    };

    Groups.findByPk.mockResolvedValue(existingGroup);

    Groups.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 2,
      startDate: new Date("2025-01-01").toISOString(),
      endDate: new Date("2025-01-31").toISOString(),
    });

    const response = await request(app)
      .patch(`/api/v1/period/group/${mockGroupId}`)
      .set("User-Agent", "jest-agent")
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
    Groups.findOne.mockResolvedValueOnce(null); // no duplicate group name
    Groups.findOne.mockResolvedValueOnce(null); // no duplicate date range

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
        userId: undefined, // pastikan mock req.user di middleware kalau diperlukan
        action: "Mengubah Periode",
        description: expect.stringContaining("berhasil memperbaharui periode"),
        device: mockHeaders["user-agent"],
        ipAddress: expect.any(String),
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
