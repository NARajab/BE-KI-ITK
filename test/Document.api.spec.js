jest.mock("../app/models", () => ({
  Documents: {
    create: jest.fn(),
    findByPk: jest.fn(),
  },
  Users: {
    findByPk: jest.fn(),
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
jest.mock("../app/helpers/activityLogs", () => jest.fn());

const request = require("supertest");
const app = require("../app/index");
const { Documents, Users } = require("../app/models");
const jwt = require("jsonwebtoken");
const logActivity = require("../app/helpers/activityLogs");

describe("POST /api/v1/document", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Users.findByPk.mockImplementation((id) => {
      if (id === 1) {
        return Promise.resolve({
          id: 1,
          fullname: "Admin User",
          email: "admin@example.com",
          role: "admin",
        });
      }
      return Promise.resolve(null);
    });
  });

  it("should create a document type successfully", async () => {
    Documents.create.mockResolvedValue({ id: 1, type: "Test Type" });
    logActivity.mockResolvedValue();

    const response = await request(app)
      .post("/api/v1/document")
      .set("User-Agent", "jest-agent")
      .set("Accept", "application/json")
      .set("Authorization", "Bearer mock-token")
      .send({ type: "Test Type" })
      .expect(201);

    expect(Documents.create).toHaveBeenCalledWith({ type: "Test Type" });

    expect(logActivity).toHaveBeenCalledWith({
      userId: 1,
      action: "Menambah Kategori Unduhan",
      description: `Admin User berhasil menambahkan kategori unduhan: Test Type.`,
      device: "jest-agent",
      ipAddress: expect.any(String),
    });

    expect(response.body).toEqual({
      status: "success",
      message: "Dokumen berhasil ditambahkan",
    });
  });

  it("should call next with error if Documents.create fails", async () => {
    const error = new Error("DB error");
    Documents.create.mockRejectedValue(error);

    // Import langsung controller createDocumentType
    const {
      createDocumentType,
    } = require("../app/controllers/document.controller");

    // Mock objek req, res, dan next untuk unit test controller langsung
    const req = {
      body: { type: "Test Type" },
      user: { id: 123, fullname: "Test User" },
      headers: { "user-agent": "jest-agent" },
      ip: "::1",
    };
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(),
    };
    const next = jest.fn();

    // Panggil fungsi controller
    await createDocumentType(req, res, next);

    // Pastikan next dipanggil dengan error
    expect(next).toHaveBeenCalledWith(error);
  });
});
