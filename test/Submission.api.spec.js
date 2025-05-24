jest.mock("../app/models", () => ({
  Patents: {
    findByPk: jest.fn(),
  },
  Users: {
    findByPk: jest.fn(),
  },
  Copyrights: {
    findByPk: jest.fn(),
  },
  Brands: {
    findByPk: jest.fn(),
  },
  IndustrialDesigns: {
    findByPk: jest.fn(),
  },
  PersonalDatas: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  SubmissionTypes: {
    findAndCountAll: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
  },
  Submissions: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
  },
  UserSubmissions: {
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
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
  SubmissionTypes,
  PersonalDatas,
  Patents,
  Copyrights,
  Brands,
  IndustrialDesigns,
  Users,
} = require("../app/models");
const fs = require("fs");
const { Op } = require("sequelize");
const logActivity = require("../app/helpers/activityLogs");

describe("GET /api/v1/submission/type", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 200 and a paginated list of submission types", async () => {
    SubmissionTypes.findAndCountAll.mockResolvedValue({
      count: 3,
      rows: [
        { id: 1, name: "Paten" },
        { id: 2, name: "Merek" },
        { id: 3, name: "Desain Industri" },
      ],
    });

    const res = await request(app).get(
      "/api/v1/submission/type?page=1&limit=10"
    );

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.totalTypes).toBe(3);
    expect(res.body.submissionsType.length).toBe(3);
    expect(SubmissionTypes.findAndCountAll).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
      where: {},
    });
  });

  it("should apply default pagination when no query params are given", async () => {
    SubmissionTypes.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [{ id: 1, name: "Hak Cipta" }],
    });

    const res = await request(app).get("/api/v1/submission/type");

    expect(res.status).toBe(200);
    expect(res.body.currentPage).toBe(1);
    expect(res.body.limit).toBe(10);
    expect(res.body.submissionsType.length).toBe(1);
    expect(SubmissionTypes.findAndCountAll).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
      where: {},
    });
  });

  it("should return 500 if there is a server error", async () => {
    SubmissionTypes.findAndCountAll.mockRejectedValue(new Error("DB Error"));

    const res = await request(app).get("/api/v1/submission/type");

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("DB Error");
  });
});

describe("GET /api/v1/submission/get", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 200 and submissions when data exists", async () => {
    UserSubmissions.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [
        {
          id: 1,
          reviewStatus: "Diterima",
          createdAt: "2024-05-01T00:00:00.000Z",
          submission: {
            id: 10,
            submissionScheme: "Pendanaan",
            submissionType: {
              title: "Hak Cipta",
            },
            personalDatas: [
              {
                name: "Budi",
                isLeader: true,
                institution: "Universitas Indonesia",
              },
            ],
          },
        },
      ],
    });

    const res = await request(app).get("/api/v1/submission/get");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.totalSubmissions).toBe(1);
    expect(res.body.submissions).toHaveLength(1);
    expect(res.body.submissions[0]).toMatchObject({
      namaPengguna: "Budi",
      jenisPengajuan: "Hak Cipta",
      skemaPengajuan: "Pendanaan",
      progressPengajuan: "Diterima",
      peran: "Ketua",
    });
  });

  it("should return 200 with empty submissions if no data found", async () => {
    UserSubmissions.findAndCountAll.mockResolvedValue({
      count: 0,
      rows: [],
    });

    const res = await request(app).get("/api/v1/submission/get");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.totalSubmissions).toBe(0);
    expect(res.body.submissions).toEqual([]);
  });

  it("should return 500 if an error occurs", async () => {
    UserSubmissions.findAndCountAll.mockRejectedValue(
      new Error("Database error")
    );

    const res = await request(app).get("/api/v1/submission/get");

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Database error");
  });
});

describe("GET /api/v1/submission/type/:id", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 200 and submission type data when found", async () => {
    const mockType = {
      id: 1,
      title: "Hak Cipta",
      description: "Pengajuan hak cipta karya ilmiah",
    };

    SubmissionTypes.findByPk.mockResolvedValue(mockType);

    const res = await request(app).get("/api/v1/submission/type/1");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.type).toEqual(mockType);
  });

  it("should return 404 if submission type not found", async () => {
    SubmissionTypes.findByPk.mockResolvedValue(null);

    const res = await request(app).get("/api/v1/submission/type/999");

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Jenis pengajuan tidak ditemukan");
  });

  it("should return 500 if an error occurs", async () => {
    SubmissionTypes.findByPk.mockRejectedValue(new Error("Database error"));

    const res = await request(app).get("/api/v1/submission/type/1");

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Database error");
  });
});

describe("POST /api/v1/submission/type", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should create a new submission type and return 201", async () => {
    SubmissionTypes.create.mockResolvedValue({});
    logActivity.mockResolvedValue();
    const res = await request(app)
      .post("/api/v1/submission/type")
      .set("User-Agent", "jest-agent")
      .send({
        title: "Paten",
        isPublish: true,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.message).toBe("Jenis pengajuan berhasil ditambahkan");

    expect(SubmissionTypes.create).toHaveBeenCalledWith({
      title: "Paten",
      isPublish: true,
    });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Menambah Kategori Pengajuan",
        description: expect.stringContaining("berhasil menambah kategori"),
        device: expect.any(String),
        ipAddress: expect.any(String),
      })
    );
  });

  it("should return 500 if an error occurs", async () => {
    SubmissionTypes.create.mockRejectedValue(new Error("Database error"));

    const res = await request(app).post("/api/v1/submission/type").send({
      title: "Paten",
      isPublish: true,
    });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Database error");
  });
});

describe("PATCH /api/v1/submission/type/:id", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should update the submission type and return 200", async () => {
    SubmissionTypes.findByPk.mockResolvedValue({ id: 1 }); // Simulasi data ditemukan
    SubmissionTypes.update.mockResolvedValue([1]); // Simulasi update berhasil
    logActivity.mockResolvedValue();

    const res = await request(app)
      .patch("/api/v1/submission/type/1")
      .set("User-Agent", "jest-agent")
      .send({
        title: "Perubahan Kategori",
        isPublish: false,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.message).toBe("Jenis pengajuan berhasil diperbaharui");

    expect(SubmissionTypes.findByPk).toHaveBeenCalledWith("1");
    expect(SubmissionTypes.update).toHaveBeenCalledWith(
      {
        title: "Perubahan Kategori",
        isPublish: false,
      },
      { where: { id: "1" } }
    );

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: "Mengubah Jenis Pengajuan",
        description: expect.stringContaining("berhasil memperbaharui"),
        device: expect.any(String),
        ipAddress: expect.any(String),
      })
    );
  });

  it("should return 404 if the submission type is not found", async () => {
    SubmissionTypes.findByPk.mockResolvedValue(null); // Simulasi tidak ditemukan

    const res = await request(app).patch("/api/v1/submission/type/99").send({
      title: "Tidak Ada",
    });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Jenis pengajuan tidak ditemukan");
  });

  it("should return 500 if an error occurs", async () => {
    SubmissionTypes.findByPk.mockRejectedValue(new Error("DB error"));

    const res = await request(app).patch("/api/v1/submission/type/1").send({
      title: "Error Update",
    });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("DB error");
  });
});

describe("PATCH /api/v1/submission/personal-data/:id", () => {
  const mockSubmissionId = "123";
  const mockUser = { id: 1, fullname: "John Doe" };
  const personalDatas = [
    {
      id: 10,
      fullName: "Jane Doe",
      nik: "1234567890123456",
    },
    {
      fullName: "Alex Doe",
      nik: "6543210987654321",
    },
  ];

  beforeEach(() => {
    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should update or create personal data and return 200", async () => {
    Submissions.findByPk.mockResolvedValue({ id: mockSubmissionId });

    PersonalDatas.findOne.mockImplementation(({ where }) =>
      where.id === 10
        ? Promise.resolve({
            id: 10,
            ktp: "old_ktp.png",
            update: jest.fn(),
          })
        : Promise.resolve(null)
    );

    PersonalDatas.create.mockResolvedValue({});
    logActivity.mockResolvedValue();

    const res = await request(app)
      .patch(`/api/v1/submission/personal-data/${mockSubmissionId}`)
      .field("personalDatas", JSON.stringify(personalDatas))
      .attach("ktpFiles", Buffer.from("dummy file"), { filename: "ktp1.png" })
      .attach("ktpFiles", Buffer.from("dummy file"), { filename: "ktp2.png" });

    console.log("Response body:", res.body);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.message).toMatch(/berhasil diupdate/);

    expect(fs.unlinkSync).toHaveBeenCalled();
  });

  it("should return 404 if submission not found", async () => {
    Submissions.findByPk.mockResolvedValue(null);

    const res = await request(app)
      .patch(`/api/v1/submission/personal-data/${mockSubmissionId}`)
      .send({ personalDatas });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/tidak ditemukan/);
  });

  it("should return 400 if no submissionId or personalDatas", async () => {
    const res = await request(app)
      .patch(`/api/v1/submission/personal-data/${mockSubmissionId}`)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/diperlukan/);
  });

  it("should return 500 if an error occurs", async () => {
    Submissions.findByPk.mockRejectedValue(new Error("Unexpected error"));

    const res = await request(app)
      .patch(`/api/v1/submission/personal-data/${mockSubmissionId}`)
      .send({ personalDatas });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Unexpected error");
  });
});

describe("PATCH /api/v1/submission/personal-data-brand/:id", () => {
  const mockSubmissionId = "123";
  const mockUser = { id: 1, fullname: "John Doe" };

  const personalDatas = [
    { id: 10, fullName: "Jane Doe", nik: "1234567890123456" },
    { fullName: "Alex Doe", nik: "6543210987654321" },
  ];

  beforeEach(() => {
    // Middleware simulasi user
    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });

    fs.existsSync.mockReturnValue(true);
    fs.unlinkSync.mockClear();

    jest.clearAllMocks();
  });

  it("should update or create personal data and update brand files, return 200", async () => {
    Submissions.findByPk.mockResolvedValue({
      id: mockSubmissionId,
      brandId: 99,
    });

    PersonalDatas.findOne.mockImplementation(({ where }) =>
      where.id === 10
        ? Promise.resolve({
            id: 10,
            ktp: "old_ktp.png",
            update: jest.fn().mockResolvedValue(true),
          })
        : Promise.resolve(null)
    );

    PersonalDatas.create.mockResolvedValue({});
    Brands.findByPk.mockResolvedValue({
      id: 99,
      labelBrand: "old_label.png",
      signature: "old_signature.png",
      fileUploade: "old_file.pdf",
      InformationLetter: "old_info.pdf",
      letterStatment: "old_letter.pdf",
      update: jest.fn().mockResolvedValue(true),
    });

    logActivity.mockResolvedValue();

    const res = await request(app)
      .patch(`/api/v1/submission/personal-data-brand/${mockSubmissionId}`)
      .field("personalDatas", JSON.stringify(personalDatas))
      .attach("ktpFiles", Buffer.from("dummy file"), { filename: "ktp1.png" })
      .attach("ktpFiles", Buffer.from("dummy file"), { filename: "ktp2.png" })
      .attach("labelBrand", Buffer.from("dummy file"), {
        filename: "label.png",
      })
      .attach("signature", Buffer.from("dummy file"), { filename: "sign.png" })
      .attach("fileUploade", Buffer.from("dummy file"), {
        filename: "file.pdf",
      })
      .attach("InformationLetter", Buffer.from("dummy file"), {
        filename: "info.pdf",
      })
      .attach("letterStatment", Buffer.from("dummy file"), {
        filename: "letter.pdf",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.message).toMatch(/berhasil diupdate/);

    // unlinkSync dipanggil karena ada file lama yang dihapus
    expect(fs.unlinkSync).toHaveBeenCalled();

    // Pastikan logActivity dipanggil
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser.id,
        action: "Update Data Diri dan Merek",
      })
    );
  });

  it("should return 404 if submission not found", async () => {
    Submissions.findByPk.mockResolvedValue(null);

    const res = await request(app)
      .patch(`/api/v1/submission/personal-data-brand/${mockSubmissionId}`)
      .send({ personalDatas });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/Submission tidak ditemukan/);
  });

  it("should return 404 if brand not found", async () => {
    Submissions.findByPk.mockResolvedValue({
      id: mockSubmissionId,
      brandId: 99,
    });
    Brands.findByPk.mockResolvedValue(null);

    const res = await request(app)
      .patch(`/api/v1/submission/personal-data-brand/${mockSubmissionId}`)
      .field("personalDatas", JSON.stringify(personalDatas));

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/Brand tidak ditemukan/);
  });

  it("should return 400 if submissionId or personalDatas missing", async () => {
    const res = await request(app)
      .patch(`/api/v1/submission/personal-data-brand/${mockSubmissionId}`)
      .send({}); // personalDatas kosong

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/diperlukan/);
  });

  it("should return 500 if error occurs", async () => {
    Submissions.findByPk.mockRejectedValue(new Error("Unexpected error"));

    const res = await request(app)
      .patch(`/api/v1/submission/personal-data-brand/${mockSubmissionId}`)
      .send({ personalDatas });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Unexpected error");
  });
});

describe("PATCH /api/v1/submission/personal-data-copyright/:id", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 if submissionId or personalDatas is missing", async () => {
    const res = await request(app)
      .patch("/api/v1/submission/personal-data-copyright/1")
      .send({}); // no personalDatas

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/diperlukan/);
  });

  it("should return 404 if submission not found", async () => {
    Submissions.findByPk.mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/v1/submission/personal-data-copyright/999")
      .send({ personalDatas: JSON.stringify([]) });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/Submission tidak ditemukan/);
  });

  it("should return 404 if copyright not found", async () => {
    Submissions.findByPk.mockResolvedValue({
      id: 1,
      copyrightId: 123,
    });
    Copyrights.findByPk.mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/v1/submission/personal-data-copyright/1")
      .send({ personalDatas: JSON.stringify([]) });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/Data hak cipta tidak ditemukan/);
  });

  it("should update personalDatas and copyright successfully", async () => {
    Submissions.findByPk.mockResolvedValue({
      id: 1,
      copyrightId: 123,
    });

    PersonalDatas.findOne
      .mockResolvedValueOnce({
        id: 1,
        ktp: "oldKtp.jpg",
        update: jest.fn().mockResolvedValue(true),
      })
      .mockResolvedValueOnce({
        id: 2,
        ktp: "oldKtp2.jpg",
        update: jest.fn().mockResolvedValue(true),
      });

    PersonalDatas.create.mockResolvedValue(true);

    const mockUpdate = jest.fn().mockResolvedValue(true);
    Copyrights.findByPk.mockResolvedValue({
      id: 123,
      statementLetter: "oldStatement.pdf",
      letterTransferCopyright: "oldTransfer.pdf",
      exampleCreation: "oldExample.pdf",
      update: mockUpdate,
    });

    const personalDatas = [{ id: 1, name: "User 1" }, { name: "User 2" }];

    const res = await request(app)
      .patch("/api/v1/submission/personal-data-copyright/1")
      .send({
        titleInvention: "New Title",
        typeCreationId: 2,
        subTypeCreationId: 3,
        countryFirstAnnounced: "Indonesia",
        cityFirstAnnounced: "Jakarta",
        timeFirstAnnounced: "2025-05-24",
        briefDescriptionCreation: "Description text",
        personalDatas: JSON.stringify(personalDatas),
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.message).toMatch(/berhasil diupdate/);

    expect(PersonalDatas.findOne).toHaveBeenCalledTimes(1);
    expect(PersonalDatas.create).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("should catch errors and return 500", async () => {
    Submissions.findByPk.mockImplementation(() => {
      throw new Error("Unexpected error");
    });

    const res = await request(app)
      .patch("/api/v1/submission/personal-data-copyright/1")
      .send({ personalDatas: JSON.stringify([]) });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toMatch(/Unexpected error/);
  });
});

describe("PATCH /api/v1/submission/personal-data-patent/:id", () => {
  it("should update existing personalDatas and create new ones, then update patent file successfully", async () => {
    // Mock data for submission found
    Submissions.findByPk.mockResolvedValue({
      id: 1,
      patentId: 123,
    });

    // Mock findOne for PersonalDatas
    PersonalDatas.findOne
      .mockResolvedValueOnce({
        id: 1,
        ktp: "oldKtp.jpg",
        update: jest.fn().mockResolvedValue(true),
      })
      .mockResolvedValueOnce(null); // For the new personalData without id

    // Mock create for new PersonalDatas
    PersonalDatas.create.mockResolvedValue(true);

    // Mock Patents findByPk and update
    const mockUpdatePatent = jest.fn().mockResolvedValue(true);
    Patents.findByPk.mockResolvedValue({
      id: 123,
      draftPatentApplicationFile: "oldDraft.pdf",
      update: mockUpdatePatent,
    });

    // Mock fs.existsSync and unlinkSync for file deletion
    const fs = require("fs");
    fs.existsSync = jest.fn(() => true);
    fs.unlinkSync = jest.fn();

    // Mock logActivity (already mocked)
    const logActivity = require("../app/helpers/activityLogs");

    const personalDatas = [
      { id: 1, name: "User 1" }, // should trigger update
      { name: "User 2" }, // should trigger create
    ];

    const ktpFiles = [
      { filename: "newKtp1.jpg" }, // for update existing
      { filename: "newKtp2.jpg" }, // for new create
    ];

    const draftPatentApplicationFile = [{ filename: "newDraftPatent.pdf" }];

    // Supertest request
    const res = await request(app)
      .patch("/api/v1/submission/personal-data-patent/1")
      .field("personalDatas", JSON.stringify(personalDatas))
      .attach("ktpFiles", Buffer.from("fake file 1"), "newKtp1.jpg")
      .attach("ktpFiles", Buffer.from("fake file 2"), "newKtp2.jpg")
      .attach(
        "draftPatentApplicationFile",
        Buffer.from("fake draft file"),
        "newDraftPatent.pdf"
      );

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.message).toMatch(/berhasil diupdate/);

    // PersonalDatas.findOne called once for id=1 only
    expect(PersonalDatas.findOne).toHaveBeenCalledTimes(1);

    // PersonalDatas.create called once for new data
    expect(PersonalDatas.create).toHaveBeenCalledTimes(1);

    // Patent update called once
    expect(mockUpdatePatent).toHaveBeenCalledTimes(1);

    // fs.existsSync and unlinkSync should have been called for old files
    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.unlinkSync).toHaveBeenCalled();

    // logActivity should be called once
    expect(logActivity).toHaveBeenCalledTimes(1);
  });

  it("should return 400 if submissionId or personalDatas missing", async () => {
    const res = await request(app)
      .patch("/api/v1/submission/personal-data-patent/1") // no id
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(
      /submissionId dan personalDatas diperlukan/
    );
  });

  it("should return 404 if submission not found", async () => {
    Submissions.findByPk.mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/v1/submission/personal-data-patent/999")
      .send({ personalDatas: JSON.stringify([]) });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/Submission tidak ditemukan/);
  });

  it("should return 404 if patent not found when updating draft file", async () => {
    Submissions.findByPk.mockResolvedValue({
      id: 1,
      patentId: 123,
    });

    // PersonalDatas findOne returns null so no update/create in this test
    PersonalDatas.findOne.mockResolvedValue(null);

    PersonalDatas.create.mockResolvedValue(true);

    Patents.findByPk.mockResolvedValue(null); // Patent not found

    const personalDatas = [{ name: "User 1" }];
    const draftPatentApplicationFile = [{ filename: "newDraftPatent.pdf" }];

    const res = await request(app)
      .patch("/api/v1/submission/personal-data-patent/1")
      .field("personalDatas", JSON.stringify(personalDatas))
      .attach(
        "draftPatentApplicationFile",
        Buffer.from("fake draft file"),
        "newDraftPatent.pdf"
      );

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/Paten tidak ditemukan/);
  });
});

describe("PATCH /api/v1/submission/personal-data-design-industri/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it("should update existing personalDatas and create new ones, then update desain industri file successfully", async () => {
    Submissions.findByPk.mockResolvedValue({
      id: 1,
      industrialDesignId: 456,
    });

    PersonalDatas.findOne
      .mockResolvedValueOnce({
        id: 1,
        ktp: "oldKtp.jpg",
        update: jest.fn().mockResolvedValue(true),
      })
      .mockResolvedValueOnce(null);

    PersonalDatas.create.mockResolvedValue(true);

    const mockUpdateDesign = jest.fn().mockResolvedValue(true);
    IndustrialDesigns.findByPk.mockResolvedValue({
      id: 456,
      draftDesainIndustriApplicationFile: "oldDraft.pdf",
      update: mockUpdateDesign,
    });

    const fs = require("fs");
    fs.existsSync = jest.fn(() => true);
    fs.unlinkSync = jest.fn();

    const personalDatas = [{ id: 1, name: "User 1" }, { name: "User 2" }];

    const ktpFiles = [{ filename: "newKtp1.jpg" }, { filename: "newKtp2.jpg" }];

    const draftDesainIndustriApplicationFile = [
      { filename: "newDraftDesign.pdf" },
    ];

    const res = await request(app)
      .patch("/api/v1/submission/personal-data-design-industri/1")
      .field("personalDatas", JSON.stringify(personalDatas))
      .attach("ktpFiles", Buffer.from("fake file 1"), "newKtp1.jpg")
      .attach("ktpFiles", Buffer.from("fake file 2"), "newKtp2.jpg")
      .attach(
        "draftDesainIndustriApplicationFile",
        Buffer.from("fake draft file"),
        "newDraftDesign.pdf"
      );

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.message).toMatch(/berhasil diupdate/);

    expect(PersonalDatas.findOne).toHaveBeenCalledTimes(1);
    expect(PersonalDatas.create).toHaveBeenCalledTimes(1);

    expect(mockUpdateDesign).toHaveBeenCalledTimes(1);

    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.unlinkSync).toHaveBeenCalled();

    expect(logActivity).toHaveBeenCalledTimes(1);
  });

  it("should return 400 if submissionId or personalDatas missing", async () => {
    const res = await request(app)
      .patch("/api/v1/submission/personal-data-design-industri/1") // no id
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(
      /submissionId dan personalDatas diperlukan/
    );
  });

  it("should return 404 if submission not found", async () => {
    Submissions.findByPk.mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/v1/submission/personal-data-design-industri/999")
      .send({ personalDatas: JSON.stringify([]) });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/Submission tidak ditemukan/);
  });

  it("should return 404 if desain industri not found when updating draft file", async () => {
    Submissions.findByPk.mockResolvedValue({
      id: 1,
      industrialDesignId: 456,
    });

    PersonalDatas.findOne.mockResolvedValue(null);
    PersonalDatas.create.mockResolvedValue(true);

    IndustrialDesigns.findByPk.mockResolvedValue(null); // not found

    const personalDatas = [{ name: "User 1" }];
    const draftFiles = [{ filename: "newDraftDesign.pdf" }];

    const res = await request(app)
      .patch("/api/v1/submission/personal-data-design-industri/1")
      .field("personalDatas", JSON.stringify(personalDatas))
      .attach(
        "draftDesainIndustriApplicationFile",
        Buffer.from("fake draft file"),
        "newDraftDesign.pdf"
      );

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/Desain Industri tidak ditemukan/);
  });
});

describe("PATCH /api/v1/submission/type/active/:id", () => {
  const route = "/api/v1/submission/type/active/123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 404 if submission type is not found", async () => {
    SubmissionTypes.findOne.mockResolvedValue(null);

    const res = await request(app).patch(route);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty(
      "message",
      "Jenis pengajuan tidak ditemukan"
    );
    expect(SubmissionTypes.findOne).toHaveBeenCalledWith({
      where: { id: "123" },
      paranoid: false,
    });
  });

  it("should return 400 if submission type is not deleted (deletedAt is null)", async () => {
    SubmissionTypes.findOne.mockResolvedValue({
      deletedAt: null,
    });

    const res = await request(app).patch(route);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty(
      "message",
      "Jenis pengajuan ini belum dihapus"
    );
  });

  it("should successfully restore the submission type and log activity", async () => {
    const mockRestore = jest.fn().mockResolvedValue(true);

    SubmissionTypes.findOne.mockResolvedValue({
      id: 123,
      deletedAt: new Date(),
      restore: mockRestore,
    });

    const res = await request(app).patch(route).set("User-Agent", "jest-agent");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.message).toBe("Jenis pengajuan berhasil direstore");

    expect(SubmissionTypes.findOne).toHaveBeenCalledWith({
      where: { id: "123" },
      paranoid: false,
    });
    expect(mockRestore).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalledWith({
      userId: 1,
      action: "Restore Jenis Pengajuan",
      description: "Admin User berhasil merestore jenis pengajuan.",
      device: "jest-agent",
      ipAddress: "::ffff:127.0.0.1",
    });
  });

  it("should return 500 if unexpected error occurs", async () => {
    SubmissionTypes.findOne.mockRejectedValue(new Error("DB Error"));

    const res = await request(app).patch(route);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("DB Error");
  });
});

describe("DELETE /api/v1/submission/type/:id - deleteSubmissionType", () => {
  const route = "/api/v1/submission/type/123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 404 if submission type is not found", async () => {
    SubmissionTypes.findByPk.mockResolvedValue(null);

    const res = await request(app).delete(route);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty(
      "message",
      "Jenis pengajuan tidak ditemukan"
    );
    expect(SubmissionTypes.findByPk).toHaveBeenCalledWith("123");
  });

  it("should successfully delete the submission type and log activity", async () => {
    const mockDestroy = jest.fn().mockResolvedValue(true);

    SubmissionTypes.findByPk.mockResolvedValue({
      id: 123,
      destroy: mockDestroy,
    });

    const res = await request(app)
      .delete(route)
      .set("User-Agent", "jest-agent");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("status", "success");
    expect(res.body).toHaveProperty(
      "message",
      "Jenis pengajuan berhasil dihapus"
    );

    expect(SubmissionTypes.findByPk).toHaveBeenCalledWith("123");
    expect(mockDestroy).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalledWith({
      userId: 1,
      action: "Menghapus Jenis Pengajuan",
      description: "Admin User berhasil menghapus jenis pengajuan.",
      device: "jest-agent",
      ipAddress: "::ffff:127.0.0.1",
    });
  });

  it("should return 500 if unexpected error occurs", async () => {
    SubmissionTypes.findByPk.mockRejectedValue(new Error("DB Error"));

    const res = await request(app).delete(route);

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("message", "DB Error");
  });
});

describe("DELETE /api/v1/submission/personal-data/:id - deletePersonalData", () => {
  const route = "/api/v1/submission/personal-data/456";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 404 if personal data not found", async () => {
    PersonalDatas.findByPk.mockResolvedValue(null);

    const res = await request(app).delete(route);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message", "Data diri tidak ditemukan");
    expect(PersonalDatas.findByPk).toHaveBeenCalledWith("456");
  });

  it("should delete personal data and return 200", async () => {
    const mockDestroy = jest.fn().mockResolvedValue(true);

    PersonalDatas.findByPk.mockResolvedValue({
      id: 456,
      destroy: mockDestroy,
    });

    const res = await request(app).delete(route);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("status", "success");
    expect(res.body).toHaveProperty("message", "Data diri berhasil dihapus");
    expect(PersonalDatas.findByPk).toHaveBeenCalledWith("456");
    expect(mockDestroy).toHaveBeenCalled();
  });

  it("should return 500 if unexpected error occurs", async () => {
    PersonalDatas.findByPk.mockRejectedValue(new Error("Unexpected error"));

    const res = await request(app).delete(route);

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("message", "Unexpected error");
  });
});
