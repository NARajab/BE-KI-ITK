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

describe("POST /api/v1/brand/type", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 201 and success message when brand type is created", async () => {
    BrandTypes.create.mockResolvedValue({ id: 1, title: "Elektronik" });

    const response = await request(app)
      .post("/api/v1/brand/type")
      .send({ title: "Elektronik" })
      .expect(201);

    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Kategori merek berhasil dibuat");

    expect(BrandTypes.create).toHaveBeenCalledWith({ title: "Elektronik" });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Menambah Kategori Merek",
        description: "Admin User berhasil menambah kategori merek.",
        device: undefined,
        ipAddress: "::ffff:127.0.0.1",
      })
    );
  });

  it("should return 500 if BrandTypes.create throws an error", async () => {
    BrandTypes.create.mockRejectedValue(new Error("Database error"));

    const response = await request(app)
      .post("/api/v1/brand/type")
      .send({ title: "Elektronik" })
      .expect(500);

    expect(response.body.message).toBe("Database error");
    expect(BrandTypes.create).toHaveBeenCalled();
    expect(logActivity).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/brand", () => {
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

describe("PATCH /api/v1/brand/type/:id", () => {
  it("should update brand type and return 200", async () => {
    // Arrange
    const mockId = "1";
    const mockTitle = "Updated Brand Type";

    BrandTypes.update.mockResolvedValue([1]);

    const response = await request(app)
      .patch(`/api/v1/brand/type/${mockId}`)
      .send({ title: mockTitle });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      message: "Kategori merek berhasil diperbarui",
    });

    expect(BrandTypes.update).toHaveBeenCalledWith(
      { title: mockTitle },
      { where: { id: mockId } }
    );
  });

  it("should handle errors and return 500", async () => {
    const mockId = "1";
    BrandTypes.update.mockRejectedValue(new Error("Database error"));

    const response = await request(app)
      .patch(`/api/v1/brand/type/${mockId}`)
      .send({ title: "Error Test" });

    expect(response.status).toBe(500);
    expect(response.body.status).toBe("Error");
    expect(response.body.message).toBe("Database error");
  });
});

describe("PATCH /api/v1/brand/:id", () => {
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

describe("GET /api/v1/brand/type", () => {
  const mockBrandTypes = [
    { id: 1, title: "Wordmark" },
    { id: 2, title: "Pictorial" },
  ];

  beforeEach(() => {
    BrandTypes.findAndCountAll.mockResolvedValue({
      count: mockBrandTypes.length,
      rows: mockBrandTypes,
    });
  });

  it("should return a list of brand types with pagination", async () => {
    const response = await request(app).get(
      "/api/v1/brand/type?page=1&limit=10"
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: "success",
        currentPage: 1,
        totalPages: 1,
        totalTypes: 2,
        limit: 10,
        brandTypes: mockBrandTypes,
      })
    );

    expect(BrandTypes.findAndCountAll).toHaveBeenCalledWith({
      where: {},
      limit: 10,
      offset: 0,
      order: [["id", "ASC"]],
    });
  });

  it("should support search by title", async () => {
    const response = await request(app).get("/api/v1/brand/type?search=word");

    expect(response.statusCode).toBe(200);
    expect(BrandTypes.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          title: {
            [Op.iLike]: `%word%`,
          },
        },
      })
    );
  });

  it("should default to page 1 and limit 10 if not provided", async () => {
    const response = await request(app).get("/api/v1/brand/type");

    expect(response.statusCode).toBe(200);
    expect(response.body.currentPage).toBe(1);
    expect(response.body.limit).toBe(10);
  });

  it("should return 500 if an error is thrown", async () => {
    BrandTypes.findAndCountAll.mockRejectedValueOnce(
      new Error("Database error")
    );

    const response = await request(app).get("/api/v1/brand/type");

    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty("message", "Database error");
  });
});

describe("GET /api/v1/brand/type/not-pagination", () => {
  const mockBrandTypes = [
    { id: 1, title: "Wordmark" },
    { id: 2, title: "Pictorial" },
  ];

  beforeEach(() => {
    BrandTypes.findAll.mockResolvedValue(mockBrandTypes);
  });

  it("should return all brand types without pagination", async () => {
    const response = await request(app).get(
      "/api/v1/brand/type/not-pagination"
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      brandTypes: mockBrandTypes,
    });

    expect(BrandTypes.findAll).toHaveBeenCalledWith({
      order: [["id", "ASC"]],
    });
  });

  it("should return 500 if an error is thrown", async () => {
    BrandTypes.findAll.mockRejectedValueOnce(new Error("Unexpected error"));

    const response = await request(app).get(
      "/api/v1/brand/type/not-pagination"
    );

    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty("message", "Unexpected error");
  });
});

describe("GET /api/v1/brand/type/:id", () => {
  const mockBrandType = {
    id: 1,
    title: "Wordmark",
  };

  it("should return brand type by ID", async () => {
    BrandTypes.findByPk.mockResolvedValue(mockBrandType);

    const response = await request(app).get("/api/v1/brand/type/1");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      brandType: mockBrandType,
    });

    expect(BrandTypes.findByPk).toHaveBeenCalledWith("1");
  });

  it("should return 404 if brand type is not found", async () => {
    BrandTypes.findByPk.mockResolvedValue(null);

    const response = await request(app).get("/api/v1/brand/type/999");

    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty(
      "message",
      "BrandType tidak ditemukan"
    );
  });

  it("should return 500 if an error is thrown", async () => {
    BrandTypes.findByPk.mockRejectedValueOnce(new Error("Unexpected error"));

    const response = await request(app).get("/api/v1/brand/type/1");

    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty("message", "Unexpected error");
  });
});

describe("GET /api/v1/brand", () => {
  const mockAdditionalDatas = [
    { id: 1, title: "Has Logo", type: "yesNo" },
    { id: 2, title: "Have Guideline", type: "yesNo" },
  ];

  it("should return all additional datas", async () => {
    AdditionalDatas.findAll.mockResolvedValue(mockAdditionalDatas);

    const response = await request(app).get("/api/v1/brand");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      additionalDatas: mockAdditionalDatas,
    });

    expect(AdditionalDatas.findAll).toHaveBeenCalled();
  });

  it("should return 500 if an error is thrown", async () => {
    AdditionalDatas.findAll.mockRejectedValueOnce(
      new Error("Unexpected error")
    );

    const response = await request(app).get("/api/v1/brand");

    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty("message", "Unexpected error");
  });
});

describe("PATCH /api/v1/brand/additional-data/:id", () => {
  const mockUser = {
    id: 1,
    fullname: "Admin User",
    role: "admin",
  };

  const additionalDataId = 1;

  const mockAdditionalData = {
    id: additionalDataId,
    file: "old-file.pdf",
    update: jest.fn(),
  };

  beforeEach(() => {
    AdditionalDatas.findByPk.mockReset();
    mockAdditionalData.update.mockReset();
  });

  it("should update additional data with description only", async () => {
    AdditionalDatas.findByPk.mockResolvedValue(mockAdditionalData);

    const response = await request(app)
      .patch(`/api/v1/brand/additional-data/${additionalDataId}`)
      .send({ description: "Updated description" });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      message: "AdditionalData berhasil diperbarui",
    });
    expect(mockAdditionalData.update).toHaveBeenCalledWith({
      description: "Updated description",
    });
  });

  it("should update additional data with a new file and delete old file", async () => {
    AdditionalDatas.findByPk.mockResolvedValue({
      ...mockAdditionalData,
      file: "test.pdf",
    });

    const response = await request(app)
      .patch(`/api/v1/brand/additional-data/${additionalDataId}`)
      .attach("file", Buffer.from("file"), "test.pdf");

    expect(response.statusCode).toBe(200);
    expect(mockAdditionalData.update).toHaveBeenCalled();
  });

  it("should return 404 if additional data is not found", async () => {
    AdditionalDatas.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/v1/brand/additional-data/${additionalDataId}`)
      .send({ description: "Updated description" });

    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty(
      "message",
      "AdditionalData tidak ditemukan"
    );
  });

  it("should return 500 if error is thrown", async () => {
    AdditionalDatas.findByPk.mockRejectedValue(
      new Error("Something went wrong")
    );

    const response = await request(app)
      .patch(`/api/v1/brand/additional-data/${additionalDataId}`)
      .send({ description: "test" });

    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty("message", "Something went wrong");
  });
});

describe("PATCH /api/v1/brand/type/active/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logActivity.mockResolvedValue();
  });

  it("should restore a soft-deleted brand type", async () => {
    const mockBrand = {
      id: 1,
      deletedAt: new Date(),
      restore: jest.fn(),
    };

    BrandTypes.findOne.mockResolvedValue(mockBrand);

    const res = await request(app)
      .patch("/api/v1/brand/type/active/1")
      .set("Authorization", "Bearer mock-token");

    console.log(res.body);

    expect(res.statusCode).toBe(200);
    expect(mockBrand.restore).toHaveBeenCalled();
  });

  it("should return 404 if brand type not found", async () => {
    BrandTypes.findOne.mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/v1/brand/type/active/999")
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Kategori merek tidak ditemukan");
  });

  it("should return 400 if brand type is not deleted", async () => {
    const mockBrand = {
      id: 1,
      deletedAt: null,
    };

    BrandTypes.findOne.mockResolvedValue(mockBrand);

    const res = await request(app)
      .patch("/api/v1/brand/type/active/1")
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe(
      "Kategori merek ini tidak dalam status terhapus"
    );
  });

  it("should return 500 on unexpected error", async () => {
    BrandTypes.findOne.mockImplementation(() => {
      throw new Error("Database error");
    });

    const res = await request(app)
      .patch("/api/v1/brand/type/active/1")
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Database error");
  });
});

describe("DELETE /api/v1/brand/type/:id - deleteBrandType controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logActivity.mockResolvedValue(); // supaya tidak error saat await logActivity
  });

  it("should delete brand type and return 200 success", async () => {
    const mockBrand = {
      id: 1,
      destroy: jest.fn().mockResolvedValue(),
    };
    BrandTypes.findByPk.mockResolvedValue(mockBrand);

    const res = await request(app)
      .delete("/api/v1/brand/type/1")
      .set("Authorization", "Bearer mock-token") // jika ada middleware auth
      .set("user-agent", "jest-test-agent")
      .set("Accept", "application/json");

    expect(BrandTypes.findByPk).toHaveBeenCalledWith("1");
    expect(mockBrand.destroy).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: expect.anything(),
        action: "Menghapus Kategori Merek",
        description: expect.stringContaining(
          "berhasil menghapus kategori merek"
        ),
        device: "jest-test-agent",
        ipAddress: expect.anything(),
      })
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "Kategori brand berhasil dihapus",
    });
  });

  it("should return 404 if brand type not found", async () => {
    BrandTypes.findByPk.mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/v1/brand/type/999")
      .set("Authorization", "Bearer mock-token");

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty(
      "message",
      "Kategori merek tidak ditemukan"
    );
  });

  it("should call next with error on exception", async () => {
    const errorMessage = "Database error";
    BrandTypes.findByPk.mockRejectedValue(new Error(errorMessage));

    const next = jest.fn();

    const req = {
      params: { id: "1" },
      user: { id: 1, fullname: "Test User" },
      headers: { "user-agent": "jest-agent" },
      ip: "127.0.0.1",
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const { deleteBrandType } = require("../app/controllers/brandController");

    await deleteBrandType(req, res, next);

    expect(next).toHaveBeenCalled();
    const calledWithError = next.mock.calls[0][0];
    expect(calledWithError).toBeInstanceOf(ApiError);
    expect(calledWithError.message).toBe(errorMessage);
    expect(calledWithError.statusCode).toBe(500);
  });
});
