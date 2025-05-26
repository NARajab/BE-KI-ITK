jest.mock("../app/models", () => ({
  IndustrialDesigns: {
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  Progresses: {
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  },
  Users: {
    findAll: jest.fn(),
  },
  PersonalDatas: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    bulkCreate: jest.fn(),
  },
  TypeDesigns: {
    create: jest.fn(),
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
  },
  SubTypeDesigns: {
    create: jest.fn(),
    update: jest.fn(),
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
  Submissions: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
  },
  UserSubmissions: {
    create: jest.fn(),
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
jest.mock("../emails/services/sendMail", () => jest.fn());
jest.mock("fs", () => {
  const fsActual = jest.requireActual("fs");
  return {
    ...fsActual,
    unlink: jest.fn((path, cb) => cb(null)),
    existsSync: jest.fn(() => true),
    unlinkSync: jest.fn(),
    mkdirSync: jest.fn(),
  };
});

const request = require("supertest");
const app = require("../app/index");
const {
  UserSubmissions,
  Submissions,
  IndustrialDesigns,
  PersonalDatas,
  TypeDesigns,
  SubTypeDesigns,
  Progresses,
  Users,
} = require("../app/models");
const fs = require("fs");
const { Op } = require("sequelize");
const logActivity = require("../app/helpers/activityLogs");
const sendEmail = require("../emails/services/sendMail");

describe("POST /api/v1/design-industri/type", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a new TypeDesign successfully", async () => {
    TypeDesigns.create = jest
      .fn()
      .mockResolvedValue({ id: 1, title: "New Design" });
    logActivity.mockResolvedValue();

    const res = await request(app)
      .post("/api/v1/design-industri/type")
      .send({ title: "New Design" })
      .set("Authorization", "Bearer mock-token")
      .set("user-agent", "jest-test-agent")
      .set("Accept", "application/json");

    expect(TypeDesigns.create).toHaveBeenCalledWith({ title: "New Design" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Kategori Desain Industri berhasil ditambahkan",
    });
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: expect.any(Number),
        action: "Menambah Kategori Desain Industri",
        description: expect.stringContaining(
          "berhasil menambah kategori desain industri"
        ),
        device: "jest-test-agent",
        ipAddress: expect.any(String),
      })
    );
  });

  it("should respond with 500 when create fails", async () => {
    TypeDesigns.create = jest
      .fn()
      .mockRejectedValue(new Error("DB create error"));

    const res = await request(app)
      .post("/api/v1/design-industri/type")
      .send({ title: "New Design" })
      .set("Authorization", "Bearer mock-token")
      .set("user-agent", "jest-test-agent")
      .set("Accept", "application/json");

    expect(TypeDesigns.create).toHaveBeenCalled();
    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("message", "DB create error");
  });
});

describe("POST /api/v1/design-industri/sub-type/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a new SubTypeDesign successfully", async () => {
    SubTypeDesigns.create = jest
      .fn()
      .mockResolvedValue({ id: 1, typeDesignId: 1, title: "New SubType" });

    logActivity.mockResolvedValue();

    const res = await request(app)
      .post("/api/v1/design-industri/sub-type/1")
      .send({ title: "New SubType" })
      .set("Authorization", "Bearer mock-token")
      .set("user-agent", "jest-test-agent")
      .set("Accept", "application/json");

    expect(SubTypeDesigns.create).toHaveBeenCalledWith({
      typeDesignId: "1", // karena params.id itu string
      title: "New SubType",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil ditambahkan",
    });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: expect.any(Number),
        action: "Menambah Sub Kategori Desain Industri",
        description: expect.stringContaining(
          "berhasil menambah sub kategori desain industri"
        ),
        device: "jest-test-agent",
        ipAddress: expect.any(String),
      })
    );
  });

  it("should respond with 500 when create fails", async () => {
    SubTypeDesigns.create = jest
      .fn()
      .mockRejectedValue(new Error("DB create error"));

    const res = await request(app)
      .post("/api/v1/design-industri/sub-type/1")
      .send({ title: "New SubType" })
      .set("Authorization", "Bearer mock-token")
      .set("user-agent", "jest-test-agent")
      .set("Accept", "application/json");

    expect(SubTypeDesigns.create).toHaveBeenCalled();
    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("message", "DB create error");
  });
});

describe("POST /api/v1/design-industri", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a new Industrial Design submission successfully", async () => {
    // Mock files
    const mockDraftFile = { filename: "draft-file.pdf" };
    const mockKtpFiles = [{ filename: "ktp1.jpg" }, { filename: "ktp2.jpg" }];

    // Mock data
    IndustrialDesigns.create = jest.fn().mockResolvedValue({
      id: 1,
      draftDesainIndustriApplicationFile: "draft-file.pdf",
    });

    Submissions.create = jest.fn().mockResolvedValue({
      id: 10,
      submissionTypeId: 5,
      industrialDesignId: 1,
    });

    PersonalDatas.bulkCreate = jest.fn().mockResolvedValue(true);

    UserSubmissions.create = jest.fn().mockResolvedValue({
      id: 100,
      userId: 1,
      submissionId: 10,
      centralStatus: "Draft",
    });

    Progresses.create = jest.fn().mockResolvedValue(true);

    Users.findAll = jest
      .fn()
      .mockResolvedValue([
        { email: "admin1@example.com" },
        { email: "admin2@example.com" },
      ]);

    const mockSendEmail = jest.fn().mockResolvedValue(true);
    jest.mock("../emails/services/sendMail", () => mockSendEmail);

    const SendEmail = require("../emails/services/sendMail");
    SendEmail.mockResolvedValue(true);

    logActivity.mockResolvedValue();

    const personalDatas = [
      { name: "User 1", age: 30 },
      { name: "User 2", age: 25 },
    ];

    const res = await request(app)
      .post("/api/v1/design-industri")
      .field("submissionTypeId", 5)
      .field("personalDatas", JSON.stringify(personalDatas))
      .attach(
        "draftDesainIndustriApplicationFile",
        Buffer.from("file content"),
        {
          filename: "draft-file.pdf",
        }
      )
      .attach("ktp", Buffer.from("ktp1 content"), { filename: "ktp1.jpg" })
      .attach("ktp", Buffer.from("ktp2 content"), { filename: "ktp2.jpg" })
      .set("Authorization", "Bearer mock-token")
      .set("user-agent", "jest-test-agent")
      .set("Accept", "application/json");

    expect(IndustrialDesigns.create).toHaveBeenCalledWith({
      draftDesainIndustriApplicationFile: expect.any(String),
    });

    expect(Submissions.create).toHaveBeenCalledWith({
      submissionTypeId: "5",
      industrialDesignId: 1,
    });

    expect(PersonalDatas.bulkCreate).toHaveBeenCalledWith([
      {
        name: "User 1",
        age: 30,
        submissionId: 10,
        ktp: expect.any(String),
        isLeader: true,
      },
      {
        name: "User 2",
        age: 25,
        submissionId: 10,
        ktp: expect.any(String),
        isLeader: false,
      },
    ]);

    expect(UserSubmissions.create).toHaveBeenCalledWith({
      userId: 1,
      submissionId: 10,
      centralStatus: "Draft",
    });

    expect(Progresses.create).toHaveBeenCalledWith({
      userSubmissionId: 100,
      status: "Menunggu",
      createdBy: "Admin User",
    });

    expect(Users.findAll).toHaveBeenCalledWith({ where: { role: "admin" } });

    expect(SendEmail).toHaveBeenCalledWith({
      to: ["admin1@example.com", "admin2@example.com"],
      subject: "Pengajuan Desain Industri Baru",
      html: expect.any(String),
    });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Menambah Pengajuan Desain Industri",
        description: expect.stringContaining(
          "berhasil menambah pengajuan desain industri"
        ),
        device: "jest-test-agent",
        ipAddress: expect.any(String),
      })
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Pengajuan Desain Industri berhasil ditambahkan",
      userSubmissions: expect.objectContaining({
        id: 100,
        userId: 1,
        submissionId: 10,
        centralStatus: "Draft",
      }),
    });
  });

  it("should call next with error when create fails", async () => {
    IndustrialDesigns.create = jest
      .fn()
      .mockRejectedValue(new Error("DB create error"));

    const res = await request(app)
      .post("/api/v1/design-industri")
      .send({ submissionTypeId: 5, personalDatas: JSON.stringify([]) })
      .set("Authorization", "Bearer mock-token")
      .set("user-agent", "jest-test-agent")
      .set("Accept", "application/json");

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("message", "DB create error");
  });
});

describe("GET /api/v1/design-industri/type", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return paginated type designs successfully", async () => {
    // Mock response data
    const mockTypeDesigns = [
      { id: 1, title: "Design A" },
      { id: 2, title: "Design B" },
    ];
    const mockCount = 2;

    TypeDesigns.findAndCountAll = jest.fn().mockResolvedValue({
      count: mockCount,
      rows: mockTypeDesigns,
    });

    const res = await request(app)
      .get("/api/v1/design-industri/type")
      .query({ page: 1, limit: 10, search: "Design" })
      .set("Authorization", "Bearer mock-token")
      .set("Accept", "application/json");

    expect(TypeDesigns.findAndCountAll).toHaveBeenCalledWith({
      where: {
        title: {
          [Op.iLike]: `%Design%`,
        },
      },
      limit: 10,
      offset: 0,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Kategori Desain Industri berhasil ditemukan",
      currentPage: 1,
      totalPages: 1,
      limit: 10,
      typeDesigns: mockTypeDesigns,
    });
  });

  it("should use default pagination if query params are missing", async () => {
    TypeDesigns.findAndCountAll = jest.fn().mockResolvedValue({
      count: 0,
      rows: [],
    });

    const res = await request(app)
      .get("/api/v1/design-industri/type")
      .set("Authorization", "Bearer mock-token")
      .set("Accept", "application/json");

    expect(TypeDesigns.findAndCountAll).toHaveBeenCalledWith({
      where: {},
      limit: 10,
      offset: 0,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Kategori Desain Industri berhasil ditemukan",
      currentPage: 1,
      totalPages: 0,
      limit: 10,
      typeDesigns: [],
    });
  });

  it("should call next with error on failure", async () => {
    TypeDesigns.findAndCountAll = jest
      .fn()
      .mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .get("/api/v1/design-industri/type")
      .set("Authorization", "Bearer mock-token")
      .set("Accept", "application/json");

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("message", "DB error");
  });
});

describe("GET /api/v1/design-industri/type/not-pagination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return all type designs without pagination successfully", async () => {
    const mockTypeDesigns = [
      { id: 1, title: "Design A" },
      { id: 2, title: "Design B" },
    ];

    TypeDesigns.findAll = jest.fn().mockResolvedValue(mockTypeDesigns);

    const res = await request(app)
      .get("/api/v1/design-industri/type/not-pagination")
      .set("Authorization", "Bearer mock-token")
      .set("Accept", "application/json");

    expect(TypeDesigns.findAll).toHaveBeenCalled();

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Kategori Desain Industri berhasil ditemukan",
      typeDesigns: mockTypeDesigns,
    });
  });

  it("should call next with error on failure", async () => {
    TypeDesigns.findAll = jest.fn().mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .get("/api/v1/design-industri/type/not-pagination")
      .set("Authorization", "Bearer mock-token")
      .set("Accept", "application/json");

    expect(res.statusCode).toBe(500);
  });
});

describe("GET /api/v1/design-industri/type/2", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return the type design with id 2 successfully", async () => {
    const mockTypeDesign = { id: 2, title: "Design B" };

    TypeDesigns.findByPk = jest.fn().mockResolvedValue(mockTypeDesign);

    const res = await request(app)
      .get("/api/v1/design-industri/type/2")
      .set("Authorization", "Bearer mock-token")
      .set("Accept", "application/json");

    expect(TypeDesigns.findByPk).toHaveBeenCalledWith("2");
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Kategori Desain Industri berhasil ditemukan",
      typeDesign: mockTypeDesign,
    });
  });

  it("should return 404 error if type design with id 2 is not found", async () => {
    TypeDesigns.findByPk = jest.fn().mockResolvedValue(null);

    const res = await request(app)
      .get("/api/v1/design-industri/type/2")
      .set("Authorization", "Bearer mock-token")
      .set("Accept", "application/json");

    expect(TypeDesigns.findByPk).toHaveBeenCalledWith("2");
    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({
      status: "Failed",
      message: "Kategori Desain Industri tidak ditemukan",
    });
  });

  it("should handle server error and return 500", async () => {
    TypeDesigns.findByPk = jest.fn().mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .get("/api/v1/design-industri/type/2")
      .set("Authorization", "Bearer mock-token")
      .set("Accept", "application/json");

    expect(TypeDesigns.findByPk).toHaveBeenCalledWith("2");
    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({
      status: "Error",
      message: "DB error",
    });
  });
});

describe("GET /api/v1/design-industri/sub-type/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return paginated subtype designs successfully", async () => {
    const mockSubTypes = [
      { id: 1, typeDesignId: "2", title: "Sub Design 1" },
      { id: 2, typeDesignId: "2", title: "Sub Design 2" },
    ];
    SubTypeDesigns.findAndCountAll = jest.fn().mockResolvedValue({
      count: 2,
      rows: mockSubTypes,
    });

    const res = await request(app)
      .get("/api/v1/design-industri/sub-type/2?page=1&limit=10&search=Design")
      .set("Authorization", "Bearer mock-token")
      .set("Accept", "application/json");

    expect(SubTypeDesigns.findAndCountAll).toHaveBeenCalledWith({
      where: {
        typeDesignId: "2",
        title: { [Op.iLike]: "%Design%" },
      },
      limit: 10,
      offset: 0,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil ditemukan",
      currentPage: 1,
      totalPages: 1,
      limit: 10,
      subTypeDesign: mockSubTypes,
    });
  });

  it("should return empty list when no subtype designs found", async () => {
    SubTypeDesigns.findAndCountAll = jest.fn().mockResolvedValue({
      count: 0,
      rows: [],
    });

    const res = await request(app)
      .get("/api/v1/design-industri/sub-type/2")
      .set("Authorization", "Bearer mock-token")
      .set("Accept", "application/json");

    expect(SubTypeDesigns.findAndCountAll).toHaveBeenCalledWith({
      where: { typeDesignId: "2" },
      limit: 10,
      offset: 0,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      currentPage: 1,
      totalPages: 0,
      limit: 10,
      subTypeCreation: [],
    });
  });

  it("should return 404 if typeDesign with id not found", async () => {
    TypeDesigns.findByPk = jest.fn().mockResolvedValue(null);

    const res = await request(app)
      .get("/api/v1/design-industri/type/99999")
      .set("Accept", "application/json");

    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({
      status: "Failed",
      message: "Kategori Desain Industri tidak ditemukan",
    });
  });

  it("should handle server error and return 500", async () => {
    SubTypeDesigns.findAndCountAll = jest
      .fn()
      .mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .get("/api/v1/design-industri/sub-type/2")
      .set("Authorization", "Bearer mock-token")
      .set("Accept", "application/json");

    expect(SubTypeDesigns.findAndCountAll).toHaveBeenCalledWith({
      where: { typeDesignId: "2" },
      limit: 10,
      offset: 0,
    });

    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({
      status: "Error",
      message: "DB error",
    });
  });
});

describe("GET /api/v1/design-industri/sub-type/not-pagination/:id", () => {
  const route = "/api/v1/design-industri/sub-type/not-pagination";

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 404 error if no sub types found", async () => {
    SubTypeDesigns.findAll.mockResolvedValue([]);

    const res = await request(app).get(`${route}/9999`);

    expect(SubTypeDesigns.findAll).toHaveBeenCalledWith({
      where: { typeDesignId: "9999" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil ditemukan",
      subTypeDesign: [],
    });
  });

  it("should return sub type designs successfully", async () => {
    const mockSubTypes = [
      { id: 1, typeDesignId: 2, title: "SubType 1" },
      { id: 2, typeDesignId: 2, title: "SubType 2" },
    ];

    SubTypeDesigns.findAll.mockResolvedValue(mockSubTypes);

    const res = await request(app).get(`${route}/2`);

    expect(SubTypeDesigns.findAll).toHaveBeenCalledWith({
      where: { typeDesignId: "2" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil ditemukan",
      subTypeDesign: mockSubTypes,
    });
  });

  it("should handle errors and call next with ApiError", async () => {
    const errorMessage = "Database error";
    SubTypeDesigns.findAll.mockRejectedValue(new Error(errorMessage));

    const next = jest.fn();

    const req = { params: { id: "1" } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const handler =
      require("../app/controllers/industrialDesignController").getSubTypeDesignIndustriWtoPagination;

    await handler(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].message).toBe(errorMessage);
  });
});

describe("GET /api/v1/design-industri/sub-type/by-id/:id", () => {
  const route = "/api/v1/design-industri/sub-type/by-id";

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 404 if subtype design with given id is not found", async () => {
    SubTypeDesigns.findByPk.mockResolvedValue(null);

    const res = await request(app).get(`${route}/9999`);

    expect(SubTypeDesigns.findByPk).toHaveBeenCalledWith("9999");
    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({
      status: "Failed",
      message: "Sub Kategori Desain Industri tidak ditemukan",
    });
  });

  it("should return subtype design if found", async () => {
    const mockSubType = {
      id: 1,
      typeDesignId: 2,
      title: "SubType Example",
    };
    SubTypeDesigns.findByPk.mockResolvedValue(mockSubType);

    const res = await request(app).get(`${route}/1`);

    expect(SubTypeDesigns.findByPk).toHaveBeenCalledWith("1");
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil ditemukan",
      subTypeDesign: mockSubType,
    });
  });

  it("should handle internal server error and call next with ApiError", async () => {
    const errorMessage = "DB failure";
    SubTypeDesigns.findByPk.mockRejectedValue(new Error(errorMessage));

    const next = jest.fn();

    // Mock req, res objects
    const req = { params: { id: "1" } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Import handler directly
    const {
      getSubTypeById,
    } = require("../app/controllers/industrialDesignController");

    await getSubTypeById(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].message).toBe(errorMessage);
  });
});

describe("PATCH /api/v1/design-industri/type/:id", () => {
  const route = "/api/v1/design-industri/type";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update the type design successfully and log activity", async () => {
    TypeDesigns.update.mockResolvedValue([1]);

    logActivity.mockResolvedValue();

    const user = {
      id: 123,
      fullname: "John Doe",
    };

    const res = await request(app)
      .patch(`${route}/1`)
      .send({ title: "Updated Title" })
      .set("user-agent", "jest-test-agent")
      .set("Accept", "application/json")
      .set("x-user-id", user.id)
      .set("x-user-fullname", user.fullname)
      .expect(200);

    expect(TypeDesigns.update).toHaveBeenCalledWith(
      { title: "Updated Title" },
      { where: { id: "1" } }
    );

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Mengubah Kategori Desain Industri",
        description: "Admin User berhasil mengubah kategori desain industri.",
        device: "jest-test-agent",
        ipAddress: "::ffff:127.0.0.1",
      })
    );

    expect(res.body).toMatchObject({
      status: "success",
      message: "Kategori Desain Industri berhasil diperbarui",
    });
  });

  it("should call next with ApiError on failure", async () => {
    const errorMessage = "DB update failed";
    TypeDesigns.update.mockRejectedValue(new Error(errorMessage));

    const next = jest.fn();

    const req = {
      params: { id: "1" },
      body: { title: "Test" },
      user: { id: 1, fullname: "Tester" },
      headers: { "user-agent": "jest-agent" },
      ip: "127.0.0.1",
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const {
      updateTypeDesignIndustri,
    } = require("../app/controllers/industrialDesignController");

    await updateTypeDesignIndustri(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].message).toBe(errorMessage);
  });
});

describe("PATCH /api/v1/design-industri/sub-type/:id", () => {
  const route = "/api/v1/design-industri/sub-type";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update the sub type design successfully and log activity", async () => {
    SubTypeDesigns.update.mockResolvedValue([1]); // Sequelize returns [numberOfAffectedRows]
    logActivity.mockResolvedValue();

    const user = {
      id: 456,
      fullname: "Jane Doe",
    };

    const res = await request(app)
      .patch(`${route}/1`)
      .send({ title: "Updated Sub Type Title" })
      .set("user-agent", "jest-test-agent")
      .set("Accept", "application/json")
      .set("x-user-id", user.id)
      .set("x-user-fullname", user.fullname)
      .expect(200);

    expect(SubTypeDesigns.update).toHaveBeenCalledWith(
      { title: "Updated Sub Type Title" },
      { where: { id: "1" } }
    );

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Mengubah Sub Kategori Desain Industri",
        description:
          "Admin User berhasil mengubah sub kategori desain industri.",
        device: "jest-test-agent",
        ipAddress: "::ffff:127.0.0.1",
      })
    );

    expect(res.body).toMatchObject({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil diperbarui",
    });
  });

  it("should call next with ApiError on failure", async () => {
    const errorMessage = "DB update error";
    SubTypeDesigns.update.mockRejectedValue(new Error(errorMessage));

    const next = jest.fn();

    const req = {
      params: { id: "1" },
      body: { title: "Test Sub Type" },
      user: { id: 1, fullname: "Tester" },
      headers: { "user-agent": "jest-agent" },
      ip: "127.0.0.1",
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const {
      updateSubTypeDesignIndustri,
    } = require("../app/controllers/industrialDesignController");

    await updateSubTypeDesignIndustri(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].message).toBe(errorMessage);
  });
});

describe("PATCH /api/v1/design-industri/:id", () => {
  const dummyId = "1";
  const dummyUser = {
    id: 10,
    fullname: "John Doe",
    email: "john@example.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update industrial design successfully", async () => {
    IndustrialDesigns.findByPk.mockResolvedValue({
      id: dummyId,
      looksPerspective: "old_looks.jpg",
      frontView: "old_front.jpg",
      backView: null,
      rightSideView: null,
      lefttSideView: null,
      topView: null,
      downView: null,
      moreImages: null,
      letterTransferDesignRights: null,
      designOwnershipLetter: null,
      update: jest.fn().mockResolvedValue(true),
    });

    Submissions.findOne.mockResolvedValue({ id: 101 });
    UserSubmissions.findOne.mockResolvedValue({ id: 201 });

    Progresses.findOne.mockResolvedValue({
      id: 301,
    });

    Progresses.update.mockResolvedValue([1]);

    Users.findAll.mockResolvedValue([{ email: "admin@example.com" }]);

    fs.existsSync.mockReturnValue(true);
    fs.unlinkSync.mockReturnValue();

    const response = await request(app)
      .patch(`/api/v1/design-industri/${dummyId}`)
      .set("Content-Type", "multipart/form-data")
      .set("Authorization", `Bearer mockToken`)
      .field("titleDesign", "Updated Design Title")
      .field("type", "some-type")
      .field("typeDesignId", "2")
      .field("subtypeDesignId", "3")
      .field("claim", JSON.stringify(["claim1", "claim2"]))
      .attach("looksPerspective", Buffer.from("file"), "plook.jpg")
      .attach("frontView", Buffer.from("file"), "front.jpg");

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "Desain Industri berhasil diperbarui"
    );

    expect(IndustrialDesigns.findByPk).toHaveBeenCalledWith(dummyId);
    expect(Submissions.findOne).toHaveBeenCalledWith({
      where: { industrialDesignId: dummyId },
    });
    expect(UserSubmissions.findOne).toHaveBeenCalledWith({
      where: { submissionId: 101 },
    });
    expect(Progresses.findOne).toHaveBeenCalledWith({
      where: { userSubmissionId: 201 },
      order: [["id", "DESC"]],
    });

    expect(Progresses.update).toHaveBeenCalledWith(
      { isStatus: true },
      { where: { id: 301 } }
    );

    expect(Users.findAll).toHaveBeenCalledWith({ where: { role: "admin" } });
  });

  it("should return 404 if industrial design not found", async () => {
    IndustrialDesigns.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/v1/design-industri/${dummyId}`)
      .set("Authorization", `Bearer mockToken`)
      .field("titleDesign", "New Title");

    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty(
      "message",
      "Desain Industri tidak ditemukan"
    );
  });

  it("should return 500 on unexpected error", async () => {
    IndustrialDesigns.findByPk.mockRejectedValue(new Error("Unexpected error"));

    const response = await request(app)
      .patch(`/api/v1/design-industri/${dummyId}`)
      .set("Authorization", `Bearer mockToken`)
      .field("titleDesign", "Any");

    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty("message", "Unexpected error");
  });
});

describe("PATCH /api/v1/design-industri/type/active/:id", () => {
  const dummyId = 1;
  const mockTypeDesign = {
    id: dummyId,
    deletedAt: new Date(),
    restore: jest.fn().mockResolvedValue(true),
  };
  const mockSubTypes = [
    {
      id: 101,
      deletedAt: new Date(),
      restore: jest.fn().mockResolvedValue(true),
    },
    {
      id: 102,
      deletedAt: null, // tidak perlu di-restore
      restore: jest.fn(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should restore a deleted type design and its deleted subtypes", async () => {
    TypeDesigns.findByPk.mockResolvedValue(mockTypeDesign);
    SubTypeDesigns.findAll.mockResolvedValue(mockSubTypes);

    const response = await request(app)
      .patch(`/api/v1/design-industri/type/active/${dummyId}`)
      .set("Authorization", `Bearer mockToken`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      message:
        "Kategori Desain Industri dan semua subkategori berhasil direstore",
    });

    expect(TypeDesigns.findByPk).toHaveBeenCalledWith("1", {
      paranoid: false,
    });
    expect(mockTypeDesign.restore).toHaveBeenCalled();

    expect(SubTypeDesigns.findAll).toHaveBeenCalledWith({
      where: { typeDesignId: "1" },
      paranoid: false,
    });

    expect(mockSubTypes[0].restore).toHaveBeenCalled();
    expect(mockSubTypes[1].restore).not.toHaveBeenCalled();
  });

  it("should return 404 if type design not found", async () => {
    TypeDesigns.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/v1/design-industri/type/active/${dummyId}`)
      .set("Authorization", `Bearer mockToken`);

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe(
      "Kategori Desain Industri tidak ditemukan"
    );
  });

  it("should return 500 if an error occurs", async () => {
    TypeDesigns.findByPk.mockRejectedValue(new Error("Something failed"));

    const response = await request(app)
      .patch(`/api/v1/design-industri/type/active/${dummyId}`)
      .set("Authorization", `Bearer mockToken`);

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("Something failed");
  });
});

describe("PATCH /api/v1/design-industri/sub-type/active/:id", () => {
  const dummyId = 1;

  const mockSubType = {
    id: dummyId,
    deletedAt: new Date(),
    restore: jest.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should restore a deleted sub type design", async () => {
    SubTypeDesigns.findByPk.mockResolvedValue(mockSubType);

    const response = await request(app)
      .patch(`/api/v1/design-industri/sub-type/active/${dummyId}`)
      .set("Authorization", "Bearer mockToken");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil direstore",
    });

    expect(SubTypeDesigns.findByPk).toHaveBeenCalledWith("1", {
      paranoid: false,
    });
    expect(mockSubType.restore).toHaveBeenCalled();
  });

  it("should not call restore if sub type is not deleted", async () => {
    const notDeletedSubType = {
      ...mockSubType,
      deletedAt: null,
      restore: jest.fn(),
    };
    SubTypeDesigns.findByPk.mockResolvedValue(notDeletedSubType);

    const response = await request(app)
      .patch(`/api/v1/design-industri/sub-type/active/${dummyId}`)
      .set("Authorization", "Bearer mockToken");

    expect(response.statusCode).toBe(200);
    expect(notDeletedSubType.restore).not.toHaveBeenCalled();
  });

  it("should return 404 if sub type not found", async () => {
    SubTypeDesigns.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/v1/design-industri/sub-type/active/${dummyId}`)
      .set("Authorization", "Bearer mockToken");

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe(
      "Sub Kategori Desain Industri tidak ditemukan"
    );
  });

  it("should return 500 if an error occurs", async () => {
    SubTypeDesigns.findByPk.mockRejectedValue(
      new Error("Something went wrong")
    );

    const response = await request(app)
      .patch(`/api/v1/design-industri/sub-type/active/${dummyId}`)
      .set("Authorization", "Bearer mockToken");

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("Something went wrong");
  });
});

describe("DELETE /api/v1/design-industri/type/:id", () => {
  const dummyId = 1;

  const mockTypeDesign = {
    id: dummyId,
    destroy: jest.fn().mockResolvedValue(true),
  };

  const mockSubTypes = [
    { id: 101, destroy: jest.fn().mockResolvedValue(true) },
    { id: 102, destroy: jest.fn().mockResolvedValue(true) },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete type and all related subtypes", async () => {
    TypeDesigns.findByPk.mockResolvedValue(mockTypeDesign);
    SubTypeDesigns.findAll.mockResolvedValue(mockSubTypes);

    const response = await request(app)
      .delete(`/api/v1/design-industri/type/${dummyId}`)
      .set("Authorization", "Bearer mockToken");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      message:
        "Kategori Desain Industri dan semua subkategori berhasil dihapus",
    });

    expect(TypeDesigns.findByPk).toHaveBeenCalledWith("1");
    expect(SubTypeDesigns.findAll).toHaveBeenCalledWith({
      where: { typeDesignId: "1" },
    });

    expect(mockSubTypes[0].destroy).toHaveBeenCalled();
    expect(mockSubTypes[1].destroy).toHaveBeenCalled();
    expect(mockTypeDesign.destroy).toHaveBeenCalled();
  });

  it("should return 404 if type design not found", async () => {
    TypeDesigns.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .delete(`/api/v1/design-industri/type/${dummyId}`)
      .set("Authorization", "Bearer mockToken");

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe(
      "Kategori Desain Industri tidak ditemukan"
    );
  });

  it("should return 500 if error occurs", async () => {
    TypeDesigns.findByPk.mockRejectedValue(new Error("DB error"));

    const response = await request(app)
      .delete(`/api/v1/design-industri/type/${dummyId}`)
      .set("Authorization", "Bearer mockToken");

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("DB error");
  });
});

describe("DELETE /api/v1/design-industri/sub-type/:id", () => {
  const dummyId = 123;

  const mockSubType = {
    id: dummyId,
    destroy: jest.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete sub type successfully", async () => {
    SubTypeDesigns.findByPk.mockResolvedValue(mockSubType);

    const response = await request(app)
      .delete(`/api/v1/design-industri/sub-type/${dummyId}`)
      .set("Authorization", "Bearer mockToken");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil dihapus",
    });

    expect(SubTypeDesigns.findByPk).toHaveBeenCalledWith("123");
    expect(mockSubType.destroy).toHaveBeenCalled();
  });

  it("should return 404 if sub type not found", async () => {
    SubTypeDesigns.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .delete(`/api/v1/design-industri/sub-type/${dummyId}`)
      .set("Authorization", "Bearer mockToken");

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe(
      "Sub Kategori Desain Industri tidak ditemukan"
    );
  });

  it("should return 500 if something went wrong", async () => {
    SubTypeDesigns.findByPk.mockRejectedValue(new Error("Database error"));

    const response = await request(app)
      .delete(`/api/v1/design-industri/sub-type/${dummyId}`)
      .set("Authorization", "Bearer mockToken");

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("Database error");
  });
});
