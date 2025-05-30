jest.mock("../app/models", () => ({
  Brands: {
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
  AdditionalDatas: {
    bulkCreate: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    destroy: jest.fn(),
  },
  PersonalDatas: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    bulkCreate: jest.fn(),
  },
  BrandTypes: {
    create: jest.fn(),
    update: jest.fn(),
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
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
jest.mock("../emails/templates/brandSubmissionMail", () => jest.fn());
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
  Brands,
  Progresses,
  BrandTypes,
  PersonalDatas,
  AdditionalDatas,
  Users,
} = require("../app/models");
const fs = require("fs");
const { Op } = require("sequelize");
const ApiError = require("../utils/apiError");
const logActivity = require("../app/helpers/activityLogs");
const sendEmail = require("../emails/services/sendMail");
const brandSubmissionMail = require("../emails/templates/brandSubmissionMail");

describe("POST Create Brand Submission", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create brand, submission, and return 200", async () => {
    // Mock input and output
    const mockBrand = { id: 1, labelBrand: "label.png" };
    const mockSubmission = { id: 2 };
    const mockUserSubmission = { id: 3 };
    const mockAdmins = [{ email: "admin@example.com" }];

    Brands.create.mockResolvedValue(mockBrand);
    AdditionalDatas.bulkCreate.mockResolvedValue([]);
    Submissions.create.mockResolvedValue(mockSubmission);
    PersonalDatas.bulkCreate.mockResolvedValue([]);
    UserSubmissions.create.mockResolvedValue(mockUserSubmission);
    Progresses.create.mockResolvedValue({});
    Users.findAll.mockResolvedValue(mockAdmins);
    brandSubmissionMail.mockReturnValue("<p>Email Template</p>");

    const response = await request(app)
      .post("/api/v1/brand")
      .field("submissionTypeId", "1")
      .field("applicationType", "Perorangan")
      .field("brandTypeId", "1")
      .field("referenceName", "Brand ABC")
      .field("elementColor", "Merah")
      .field("translate", "Translation")
      .field("pronunciation", "Pronun")
      .field("disclaimer", "Disclaimer")
      .field("description", "Deskripsi")
      .field("documentType", "Doc")
      .field("information", "Info")
      .field(
        "personalDatas",
        JSON.stringify([
          {
            fullname: "John Doe",
            email: "john@example.com",
            address: "Jl. Jakarta",
          },
        ])
      )
      .attach("labelBrand", Buffer.from("fake"), { filename: "label.png" })
      .attach("ktp", Buffer.from("fake"), { filename: "ktp.png" })
      .set("Content-Type", "multipart/form-data")
      .expect(200);

    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Brand berhasil dibuat");

    expect(Brands.create).toHaveBeenCalled();
    expect(Submissions.create).toHaveBeenCalledWith({
      submissionTypeId: "1",
      brandId: mockBrand.id,
    });

    expect(PersonalDatas.bulkCreate).toHaveBeenCalled();
    expect(UserSubmissions.create).toHaveBeenCalled();
    expect(Progresses.create).toHaveBeenCalled();

    expect(sendEmail).toHaveBeenCalled();

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "Menambah Pengajuan Merek",
        description: expect.any(String),
      })
    );
  });

  it("should return 500 on failure", async () => {
    Brands.create.mockRejectedValue(new Error("Database failed"));

    const response = await request(app)
      .post("/api/v1/brand")
      .field("submissionTypeId", "1")
      .field("applicationType", "Perorangan")
      .field("brandTypeId", "1")
      .field("referenceName", "Brand ABC")
      .field("elementColor", "Merah")
      .field("translate", "Translation")
      .field("pronunciation", "Pronun")
      .field("disclaimer", "Disclaimer")
      .field("description", "Deskripsi")
      .field("documentType", "Doc")
      .field("information", "Info")
      .field("personalDatas", JSON.stringify([]))
      .expect(500);

    expect(response.body.message).toBe("Database failed");
    expect(Brands.create).toHaveBeenCalled();
    expect(logActivity).not.toHaveBeenCalled();
  });
});

describe("PATCH Update Brand Submission", () => {
  const mockBrand = {
    id: 1,
    labelBrand: "old-label.png",
    fileUploade: "old-doc.pdf",
    signature: "old-signature.png",
    InformationLetter: "old-letter.pdf",
    letterStatment: "old-statement.pdf",
    update: jest.fn().mockResolvedValue(true),
  };

  const mockSubmission = {
    id: 10,
    brandId: 1,
  };

  const mockUserSubmission = {
    id: 100,
    submissionId: 10,
  };

  const mockProgress = {
    id: 1000,
  };

  const mockAdmins = [
    { email: "admin1@example.com" },
    { email: "admin2@example.com" },
  ];

  beforeEach(() => {
    Brands.findByPk.mockResolvedValue(mockBrand);
    Submissions.findOne.mockResolvedValue(mockSubmission);
    UserSubmissions.findOne.mockResolvedValue(mockUserSubmission);
    Progresses.findOne.mockResolvedValue(mockProgress);
    Users.findAll.mockResolvedValue(mockAdmins);
    Progresses.update.mockResolvedValue([1]);
    AdditionalDatas.findAll.mockResolvedValue([
      {
        file: "old-image.png",
        fileType: "image",
      },
      {
        file: "old-doc.pdf",
        fileType: "documents",
      },
    ]);
    AdditionalDatas.destroy.mockResolvedValue(1);
    AdditionalDatas.bulkCreate.mockResolvedValue(true);
    brandSubmissionMail.mockReturnValue("<p>Email content</p>");
    sendEmail.mockResolvedValue(true);
    logActivity.mockResolvedValue(true);
  });

  it("should update brand and return success", async () => {
    const response = await request(app)
      .patch("/api/v1/brand/1")
      .field("applicationType", "merek")
      .field("brandType", "combined")
      .field("referenceName", "Example Brand")
      .field("elementColor", "Red")
      .field("translate", "Contoh")
      .field("pronunciation", "Eksampel")
      .field("disclaimer", "All rights reserved.")
      .field("description", "Brand description")
      .field("documentType", "official")
      .field("information", "some information")
      .field(
        "additionalDatas",
        JSON.stringify([
          {
            description: "Logo tambahan",
          },
          {
            description: "File tambahan 2",
          },
        ])
      )
      .attach("labelBrand", Buffer.from("label"), "label.png")
      .attach("fileUploade", Buffer.from("file"), "file.pdf")
      .attach("signature", Buffer.from("signature"), "sign.png")
      .attach("InformationLetter", Buffer.from("info"), "info.pdf")
      .attach("letterStatment", Buffer.from("statement"), "state.pdf")
      .attach("additionalDataFiles", Buffer.from("add1"), "add1.png")
      .attach("additionalDataFiles", Buffer.from("add2"), "add2.pdf");

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("status", "success");
    expect(response.body).toHaveProperty("message", "Brand berhasil diupdate");

    expect(Brands.findByPk).toHaveBeenCalledWith("1");
    expect(mockBrand.update).toHaveBeenCalled();
    expect(AdditionalDatas.bulkCreate).toHaveBeenCalled();
    expect(Progresses.update).toHaveBeenCalledWith(
      { isStatus: true },
      { where: { id: mockProgress.id } }
    );
    expect(sendEmail).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalled();
  });

  it("should return 404 if brand not found", async () => {
    Brands.findByPk.mockResolvedValueOnce(null);
    const response = await request(app).patch("/api/v1/brand/999");
    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("Brand tidak ditemukan");
  });

  it("should return 404 if submission not found", async () => {
    Brands.findByPk.mockResolvedValueOnce(mockBrand);
    Submissions.findOne.mockResolvedValueOnce(null);

    const response = await request(app).patch("/api/v1/brand/1");
    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("Submission tidak ditemukan");
  });

  it("should return 404 if user submission not found", async () => {
    Brands.findByPk.mockResolvedValueOnce(mockBrand);
    Submissions.findOne.mockResolvedValueOnce(mockSubmission);
    UserSubmissions.findOne.mockResolvedValueOnce(null);

    const response = await request(app).patch("/api/v1/brand/1");
    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("UserSubmission tidak ditemukan");
  });

  it("should return 404 if progress not found", async () => {
    Brands.findByPk.mockResolvedValueOnce(mockBrand);
    Submissions.findOne.mockResolvedValueOnce(mockSubmission);
    UserSubmissions.findOne.mockResolvedValueOnce(mockUserSubmission);
    Progresses.findOne.mockResolvedValueOnce(null);

    const response = await request(app).patch("/api/v1/brand/1");
    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("Progress tidak ditemukan");
  });
});
