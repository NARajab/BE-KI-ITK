jest.mock("../app/models", () => ({
  Documents: {
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
jest.mock("fs", () => {
  const fsActual = jest.requireActual("fs");
  return {
    ...fsActual,
    unlink: jest.fn((path, cb) => cb(null)),
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
  };
});
jest.mock("../app/helpers/activityLogs", () => jest.fn());

const request = require("supertest");
const app = require("../app/index");
const fs = require("fs");
const { Documents, Users } = require("../app/models");
const {
  getAllDoc,
  getAllDocWoutPagination,
} = require("../app/controllers/documentController");
const { Op } = require("sequelize");
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

  it("should return 500 and not create document if Documents.create fails", async () => {
    const error = new Error("DB error");
    Documents.create.mockRejectedValue(error);

    const response = await request(app)
      .post("/api/v1/document")
      .set("User-Agent", "jest-agent")
      .set("Accept", "application/json")
      .set("Authorization", "Bearer mock-token")
      .send({ type: "Test Type" });

    expect(Documents.create).toHaveBeenCalledWith({ type: "Test Type" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      status: "Error",
      message: "DB error",
      statusCode: 500,
    });
  });
});

describe("PATCH /api/v1/document/type", () => {
  const mockToken = "mock-token";

  beforeEach(() => {
    jest.clearAllMocks();
    Users.findByPk.mockResolvedValue({
      id: 1,
      fullname: "Admin User",
      email: "admin@example.com",
      role: "admin",
    });
  });

  it("should update document type successfully", async () => {
    const oldType = "Old Type";
    const newType = "New Type";

    Documents.findAll.mockResolvedValue([{ id: 1, type: oldType }]);
    Documents.update.mockResolvedValue([1]);
    logActivity.mockResolvedValue();

    const response = await request(app)
      .patch("/api/v1/document/type")
      .set("Authorization", `Bearer ${mockToken}`)
      .set("User-Agent", "jest-agent")
      .send({ oldType, newType });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      message: `Semua dokumen dengan type '${oldType}' berhasil diubah menjadi '${newType}'`,
    });

    expect(Documents.findAll).toHaveBeenCalledWith({
      where: { type: oldType },
    });
    expect(Documents.update).toHaveBeenCalledWith(
      { type: newType },
      { where: { type: oldType } }
    );

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Mengubah Kategori Unduhan",
        description: expect.stringContaining(
          "berhasil memperbaharui kategori unduhan"
        ),
        device: "jest-agent",
        ipAddress: expect.any(String),
      })
    );
  });

  it("should return 404 if no documents match the old type", async () => {
    Documents.findAll.mockResolvedValue([]);

    const response = await request(app)
      .patch("/api/v1/document/type")
      .set("Authorization", `Bearer ${mockToken}`)
      .set("User-Agent", "jest-agent")
      .send({ oldType: "Nonexistent", newType: "New Type" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      status: "Failed",
      message: "Tidak ada dokumen dengan tipe tersebut",
      statusCode: 404,
    });

    expect(Documents.findAll).toHaveBeenCalledWith({
      where: { type: "Nonexistent" },
    });
    expect(Documents.update).not.toHaveBeenCalled();
    expect(logActivity).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/document/by-type/:type", () => {
  const mockToken = "mock-token";

  beforeEach(() => {
    jest.clearAllMocks();
    Users.findByPk.mockResolvedValue({
      id: 1,
      fullname: "Admin User",
      email: "admin@example.com",
      role: "admin",
    });
  });

  it("should create a document successfully by type", async () => {
    Documents.findOne.mockResolvedValue({ id: 1, type: "guides" });
    Documents.create.mockResolvedValue({
      id: 2,
      type: "guides",
      title: "Panduan App",
      document: "document.pdf",
      cover: "cover.jpg",
    });
    logActivity.mockResolvedValue();

    const response = await request(app)
      .post("/api/v1/document/by-type/guides")
      .set("Authorization", `Bearer ${mockToken}`)
      .set("User-Agent", "jest-agent")
      .field("title", "Panduan App")
      .attach("document", Buffer.from("file-content"), "document.pdf")
      .attach("cover", Buffer.from("cover-content"), "cover.jpg");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Faq berhasil ditambahkan");

    expect(Documents.findOne).toHaveBeenCalledWith({
      where: { type: "guides" },
    });
    expect(Documents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "guides",
        title: "Panduan App",
        document: expect.stringMatching(/\.pdf$/),
        cover: expect.stringMatching(/\.jpg$/),
      })
    );

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Menambah Unduhan",
        description: expect.stringContaining("berhasil menambahkan unduhan"),
        device: "jest-agent",
        ipAddress: expect.any(String),
      })
    );
  });

  it("should return 404 if document type is not found", async () => {
    Documents.findOne.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/v1/document/by-type/unknown-type")
      .set("Authorization", `Bearer ${mockToken}`)
      .set("User-Agent", "jest-agent")
      .field("title", "Panduan App");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      status: "Failed",
      message: "Kategori faq tidak ditemukan",
      statusCode: 404,
    });

    expect(Documents.findOne).toHaveBeenCalledWith({
      where: { type: "unknown-type" },
    });
    expect(Documents.create).not.toHaveBeenCalled();
    expect(logActivity).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/v1/document/:id", () => {
  const mockToken = "mock-token";

  beforeEach(() => {
    jest.clearAllMocks();

    Users.findByPk.mockResolvedValue({
      id: 1,
      fullname: "Admin User",
      email: "admin@example.com",
      role: "admin",
    });

    Documents.findOne.mockReset();

    logActivity.mockResolvedValue();
  });

  it("should update document title successfully", async () => {
    const mockDoc = {
      id: 1,
      title: "Old Title",
      document: "old-doc.pdf",
      cover: "old-cover.jpg",
      save: jest.fn().mockResolvedValue(true),
    };
    Documents.findOne.mockResolvedValue(mockDoc);

    const response = await request(app)
      .patch("/api/v1/document/1")
      .set("Authorization", `Bearer ${mockToken}`)
      .set("User-Agent", "jest-agent")
      .send({ title: "New Title" });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Dokumen berhasil diperbarui");
    expect(response.body.updatedDoc.title).toBe("New Title");

    expect(Documents.findOne).toHaveBeenCalledWith({ where: { id: "1" } });
    expect(mockDoc.save).toHaveBeenCalled();

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Mengubah Unduhan",
        description: expect.stringContaining("berhasil memperbaharui unduhan"),
        device: expect.any(String),
        ipAddress: expect.any(String),
      })
    );
  });

  it("should update document and replace old files", async () => {
    const mockDoc = {
      id: 1,
      title: "Old Title",
      document: "old-doc.pdf",
      cover: "old-cover.jpg",
      save: jest.fn().mockResolvedValue(true),
    };
    Documents.findOne.mockResolvedValue(mockDoc);

    // Mock fs.existsSync dan fs.unlinkSync untuk hapus file lama
    jest.spyOn(fs, "existsSync").mockImplementation((path) => true);
    jest.spyOn(fs, "unlinkSync").mockImplementation(() => {});

    const response = await request(app)
      .patch("/api/v1/document/1")
      .set("Authorization", `Bearer ${mockToken}`)
      .attach("document", Buffer.from("new document content"), "new-doc.pdf")
      .attach("cover", Buffer.from("new cover content"), "new-cover.jpg")
      .field("title", "Updated Title");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.updatedDoc.title).toBe("Updated Title");

    // File lama harus dihapus
    expect(fs.existsSync).toHaveBeenCalledWith(
      expect.stringContaining("old-doc.pdf")
    );
    expect(fs.existsSync).toHaveBeenCalledWith(
      expect.stringContaining("old-cover.jpg")
    );
    expect(fs.unlinkSync).toHaveBeenCalledTimes(2);

    // Properti dokumen dan cover harus update dengan filename baru
    expect(typeof mockDoc.document).toBe("string");
    expect(mockDoc.document).toMatch(/\.pdf$/);

    expect(typeof mockDoc.cover).toBe("string");
    expect(mockDoc.cover).toMatch(/\.jpg$/);

    expect(mockDoc.save).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalled();
  });

  it("should return 404 if document not found", async () => {
    Documents.findOne.mockResolvedValue(null);

    const response = await request(app)
      .patch("/api/v1/document/999")
      .set("Authorization", `Bearer ${mockToken}`)
      .attach("document", Buffer.from("new document content"), "new-doc.pdf")
      .attach("cover", Buffer.from("new cover content"), "new-cover.jpg")
      .field("title", "Updated Title");

    console.log(response.body);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Kategori faq tidak ditemukan");
  });

  it("should return 500 on unexpected errors", async () => {
    Documents.findOne.mockImplementation(() => {
      throw new Error("Database error");
    });

    const response = await request(app)
      .patch("/api/v1/document/1")
      .set("Authorization", `Bearer ${mockToken}`)
      .attach("document", Buffer.from("new document content"), "new-doc.pdf")
      .attach("cover", Buffer.from("new cover content"), "new-cover.jpg")
      .field("title", "Updated Title");

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Database error");
  });
});

describe("GET /api/v1/document", () => {
  const mockDocs = [
    {
      id: 1,
      title: "Dokumen 1",
      document: "doc1.pdf",
      cover: "cover1.jpg",
    },
    {
      id: 2,
      title: "Dokumen 2",
      document: "doc2.pdf",
      cover: "cover2.jpg",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return paginated list of documents with default pagination", async () => {
    Documents.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: mockDocs,
    });

    const response = await request(app).get("/api/v1/document").expect(200);

    expect(response.body.status).toBe("success");
    expect(response.body.currentPage).toBe(1);
    expect(response.body.limit).toBe(10);
    expect(response.body.totalDocs).toBe(2);
    expect(response.body.totalPages).toBe(1);
    expect(Array.isArray(response.body.docs)).toBe(true);
    expect(response.body.docs.length).toBe(2);

    expect(Documents.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
        offset: 0,
        where: {
          title: {
            [Op.ne]: null,
          },
        },
      })
    );
  });

  it("should accept page and limit query params", async () => {
    Documents.findAndCountAll.mockResolvedValue({
      count: 50,
      rows: mockDocs,
    });

    const response = await request(app)
      .get("/api/v1/document?page=3&limit=5")
      .expect(200);

    expect(response.body.currentPage).toBe(3);
    expect(response.body.limit).toBe(5);
    expect(response.body.totalDocs).toBe(50);
    expect(response.body.totalPages).toBe(Math.ceil(50 / 5));
    expect(Array.isArray(response.body.docs)).toBe(true);

    expect(Documents.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 5,
        offset: 10, // (3 - 1) * 5
      })
    );
  });

  it("should call next with error when something goes wrong", async () => {
    const errorMessage = "Database error";
    Documents.findAndCountAll.mockRejectedValue(new Error(errorMessage));

    const next = jest.fn();

    const req = { query: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await getAllDoc(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: errorMessage,
        statusCode: 500,
      })
    );
  });
});

describe("GET /api/v1/document/not-pagination", () => {
  it("should return all documents without pagination", async () => {
    const mockDocs = [
      { id: 1, title: "Doc 1", document: "doc1.pdf", cover: "cover1.jpg" },
      { id: 2, title: "Doc 2", document: "doc2.pdf", cover: "cover2.jpg" },
    ];

    Documents.findAll.mockResolvedValue(mockDocs);

    const res = await request(app).get("/api/v1/document/not-pagination");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.docs).toHaveLength(2);
    expect(res.body.docs).toEqual(expect.arrayContaining(mockDocs));

    expect(Documents.findAll).toHaveBeenCalledWith({
      where: {
        title: { [Op.ne]: null },
      },
    });
  });

  it("should call next with error when something goes wrong", async () => {
    const errorMessage = "Database error";
    Documents.findAll.mockRejectedValue(new Error(errorMessage));

    const next = jest.fn();

    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await getAllDocWoutPagination(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: errorMessage,
        statusCode: 500,
      })
    );
  });
});

describe("GET /api/v1/document/by-type", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return a list of document types with pagination and totalTypeDigunakan", async () => {
    const mockDocs = [
      {
        id: 1,
        type: "Surat Pernyataan",
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: function () {
          return this;
        },
      },
    ];

    Documents.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: mockDocs,
    });

    Documents.count.mockResolvedValue(2);

    const response = await request(app).get("/api/v1/document/by-type");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.docs).toBeInstanceOf(Array);
    expect(response.body.docs[0]).toHaveProperty("type");
    expect(response.body.docs[0]).toHaveProperty("totalTypeDigunakan", 1);
  });

  it("should handle errors and return status 500", async () => {
    Documents.findAndCountAll.mockRejectedValue(new Error("DB error"));

    const response = await request(app).get("/api/v1/document/by-type");

    expect(response.statusCode).toBe(500);
    expect(response.body.status).toBe("Error");
  });
});

describe("GET /api/v1/document/by-type/:type", () => {
  it("should return a paginated list of documents filtered by type", async () => {
    const mockDocs = [
      {
        id: 1,
        type: "Surat Pernyataan",
        title: "Dokumen A",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    Documents.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: mockDocs,
    });

    const response = await request(app).get(
      "/api/v1/document/by-type/Surat Pernyataan"
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.docs).toBeInstanceOf(Array);
    expect(response.body.docs[0]).toHaveProperty("type", "Surat Pernyataan");
    expect(response.body.totalDocs).toBe(1);
  });

  it("should handle errors gracefully", async () => {
    Documents.findAndCountAll.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get(
      "/api/v1/document/by-type/Surat Pernyataan"
    );

    expect(response.statusCode).toBe(500);
    expect(response.body.status).toBe("Error");
    expect(response.body.message).toBe("Database error");
  });
});

describe("GET /api/v1/document/:id", () => {
  it("should return a document by id", async () => {
    const mockDoc = {
      id: 1,
      type: "Surat Pernyataan",
      title: "Dokumen A",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    Documents.findByPk = jest.fn().mockResolvedValue(mockDoc);

    const response = await request(app).get("/api/v1/document/1");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.doc).toHaveProperty("id", 1);
    expect(response.body.doc).toHaveProperty("type", "Surat Pernyataan");
  });

  it("should return 404 if document not found", async () => {
    Documents.findByPk = jest.fn().mockResolvedValue(null);

    const response = await request(app).get("/api/v1/document/999");

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("Document tidak ditemukan");
  });

  it("should handle server errors gracefully", async () => {
    Documents.findByPk = jest.fn().mockRejectedValue(new Error("DB Error"));

    const response = await request(app).get("/api/v1/document/1");

    expect(response.statusCode).toBe(500);
    expect(response.body.status).toBe("Error");
    expect(response.body.message).toBe("DB Error");
  });
});

describe("PATCH /api/v1/document/active/:id", () => {
  const mockUser = {
    id: 1,
    fullname: "John Doe",
  };

  const mockDoc = {
    id: 123,
    deletedAt: new Date(),
    restore: jest.fn().mockResolvedValue(),
  };

  beforeEach(() => {
    Documents.findByPk = jest.fn();
    logActivity.mockResolvedValue();
  });

  it("should restore a deleted document", async () => {
    Documents.findByPk.mockResolvedValue(mockDoc);

    const response = await request(app)
      .patch("/api/v1/document/active/123")
      .set("Authorization", "Bearer valid-token")
      .set("User-Agent", "Jest Test");

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Document berhasil di-restore");
    expect(mockDoc.restore).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser.id,
        action: "Restore Unduhan",
        description: expect.stringContaining("berhasil me-restore"),
      })
    );
  });

  it("should return 404 if document not found", async () => {
    Documents.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .patch("/api/v1/document/active/999")
      .set("Authorization", "Bearer valid-token");

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("Document tidak ditemukan");
  });

  it("should return 400 if document is not deleted", async () => {
    const notDeletedDoc = { ...mockDoc, deletedAt: null };
    Documents.findByPk.mockResolvedValue(notDeletedDoc);

    const response = await request(app)
      .patch("/api/v1/document/active/123")
      .set("Authorization", "Bearer valid-token");

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Document belum dihapus");
  });

  it("should handle server error", async () => {
    Documents.findByPk.mockRejectedValue(new Error("DB error"));

    const response = await request(app)
      .patch("/api/v1/document/active/123")
      .set("Authorization", "Bearer valid-token");

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("DB error");
  });
});

describe("PATCH /api/v1/document/type/active/:type", () => {
  const mockUser = {
    id: 1,
    fullname: "John Doe",
  };

  // Dokumen contoh yang sudah dihapus
  const mockDeletedDocs = [
    {
      id: 1,
      type: "Surat Pernyataan",
      deletedAt: new Date(),
      restore: jest.fn().mockResolvedValue(),
    },
    {
      id: 2,
      type: "Surat Pernyataan",
      deletedAt: new Date(),
      restore: jest.fn().mockResolvedValue(),
    },
  ];

  // Dokumen contoh yang tidak dihapus (deletedAt = null)
  const mockNotDeletedDocs = [
    {
      id: 3,
      type: "Surat Pernyataan",
      deletedAt: null,
      restore: jest.fn(),
    },
  ];

  beforeEach(() => {
    Documents.findAll = jest.fn();
    logActivity.mockResolvedValue();
  });

  it("should restore all deleted documents of a given type", async () => {
    Documents.findAll.mockResolvedValue(mockDeletedDocs);

    const response = await request(app)
      .patch("/api/v1/document/type/active/Surat Pernyataan")
      .set("Authorization", "Bearer valid-token")
      .set("User-Agent", "Jest Test");

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe(
      "Semua document dengan type 'Surat Pernyataan' berhasil di-restore"
    );
    // cek restore dipanggil untuk semua dokumen yang dihapus
    mockDeletedDocs.forEach((doc) => {
      expect(doc.restore).toHaveBeenCalled();
    });
    // cek logActivity terpanggil
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser.id,
        action: "Restore Kategori Unduhan",
        description: expect.stringContaining(
          "berhasil me-restore kategori unduhan"
        ),
      })
    );
  });

  it("should return 404 if no deleted documents found for the given type", async () => {
    // Semua dokumen tidak dihapus, jadi tidak ada yang harus di-restore
    Documents.findAll.mockResolvedValue(mockNotDeletedDocs);

    const response = await request(app)
      .patch("/api/v1/document/type/active/Surat Pernyataan")
      .set("Authorization", "Bearer valid-token");

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe(
      "Tidak ada dokumen dengan type tersebut yang perlu di-restore"
    );
  });

  it("should handle server error", async () => {
    Documents.findAll.mockRejectedValue(new Error("DB error"));

    const response = await request(app)
      .patch("/api/v1/document/type/active/Surat Pernyataan")
      .set("Authorization", "Bearer valid-token");

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("DB error");
  });
});

describe("DELETE /api/v1/document/:id", () => {
  const mockUser = {
    id: 1,
    fullname: "John Doe",
  };

  const mockDoc = {
    id: 123,
    destroy: jest.fn().mockResolvedValue(),
  };

  beforeEach(() => {
    Documents.findByPk = jest.fn();
    logActivity.mockResolvedValue();
  });

  it("should delete the document and log activity", async () => {
    Documents.findByPk.mockResolvedValue(mockDoc);

    const response = await request(app)
      .delete("/api/v1/document/123")
      .set("Authorization", "Bearer valid-token")
      .set("User-Agent", "Jest Test");

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Document berhasil dihapus");
    expect(mockDoc.destroy).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser.id,
        action: "Menghapus Unduhan",
        description: expect.stringContaining("berhasil menghapus unduhan"),
      })
    );
  });

  it("should return 404 if document not found", async () => {
    Documents.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .delete("/api/v1/document/999")
      .set("Authorization", "Bearer valid-token");

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("Document tidak ditemukan");
  });

  it("should handle server error", async () => {
    Documents.findByPk.mockRejectedValue(new Error("DB error"));

    const response = await request(app)
      .delete("/api/v1/document/123")
      .set("Authorization", "Bearer valid-token");

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("DB error");
  });
});

describe("DELETE /api/v1/document/type/:type", () => {
  const mockUser = {
    id: 1,
    fullname: "John Doe",
  };

  const mockDocs = [
    { id: 1, destroy: jest.fn().mockResolvedValue() },
    { id: 2, destroy: jest.fn().mockResolvedValue() },
  ];

  beforeEach(() => {
    Documents.findAll = jest.fn();
    logActivity.mockResolvedValue();
  });

  it("should delete all documents with the specified type and log activity", async () => {
    Documents.findAll.mockResolvedValue(mockDocs);

    const response = await request(app)
      .delete("/api/v1/document/type/surat-pernyataan")
      .set("Authorization", "Bearer valid-token")
      .set("User-Agent", "Jest Test");

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe(
      "Semua document dengan type 'surat-pernyataan' berhasil dihapus"
    );

    // Pastikan setiap dokumen dipanggil destroy
    mockDocs.forEach((doc) => {
      expect(doc.destroy).toHaveBeenCalled();
    });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser.id,
        action: "Menghapus Kategori Unduhan",
        description: expect.stringContaining(
          "berhasil menghapus kategori unduhan"
        ),
      })
    );
  });

  it("should return 404 if no documents found with the type", async () => {
    Documents.findAll.mockResolvedValue([]);

    const response = await request(app)
      .delete("/api/v1/document/type/nonexistent-type")
      .set("Authorization", "Bearer valid-token");

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe(
      "Tidak ada document dengan type tersebut"
    );
  });

  it("should handle server error", async () => {
    Documents.findAll.mockRejectedValue(new Error("DB error"));

    const response = await request(app)
      .delete("/api/v1/document/type/surat-pernyataan")
      .set("Authorization", "Bearer valid-token");

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("DB error");
  });
});
