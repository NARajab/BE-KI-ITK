const {
  UserSubmissions,
  Submissions,
  SubmissionTypes,
  PersonalDatas,
  Patents,
  Copyrights,
  Brands,
  IndustrialDesigns,
} = require("../models");

const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");

const logActivity = require("../helpers/activityLogs");
const ApiError = require("../../utils/apiError");

const getSubmissionType = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    if (limit <= 0) {
      const submissionsType = await SubmissionTypes.findAll();

      res.status(200).json({
        status: "success",
        submissionsType,
      });
    }

    const offset = (page - 1) * limit;

    const { count, rows: submissionsType } =
      await SubmissionTypes.findAndCountAll({
        limit,
        offset,
      });

    res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalTypes: count,
      limit: limit,
      submissionsType,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};
const getAllSubmissions = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    const isExport = req.query.export === "true";
    let limit = isExport ? undefined : parseInt(req.query.limit) || 10;
    const offset = isExport ? undefined : (page - 1) * limit;

    const {
      namaPengguna,
      jenisPengajuan,
      skemaPengajuan,
      progressPengajuan,
      peran,
      instansi,
      startDate,
      endDate,
    } = req.query;

    const submissionWhere = {};
    const userSubmissionWhere = {};

    // Filter skema (Pendanaan/Mandiri)
    if (skemaPengajuan && ["Pendanaan", "Mandiri"].includes(skemaPengajuan)) {
      submissionWhere.submissionScheme = skemaPengajuan;
    }

    // Filter progress pengajuan
    if (progressPengajuan) {
      userSubmissionWhere.reviewStatus = {
        [Op.iLike]: `%${progressPengajuan}%`,
      };
    }

    // Filter tanggal dari createdAt di UserSubmissions
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1); // untuk mencakup tanggal akhir

      userSubmissionWhere.createdAt = {
        [Op.gte]: start,
        [Op.lt]: end,
      };
    }

    const { count, rows: submission } = await UserSubmissions.findAndCountAll({
      where: userSubmissionWhere,
      limit,
      offset,
      order: [["id", "ASC"]],
      include: [
        {
          model: Submissions,
          as: "submission",
          where: submissionWhere,
          include: [
            {
              model: SubmissionTypes,
              as: "submissionType",
              where: jenisPengajuan
                ? {
                    title: { [Op.iLike]: `%${jenisPengajuan}%` },
                  }
                : undefined,
            },
            {
              model: PersonalDatas,
              as: "personalDatas",
              required: false,
              where: {
                ...(namaPengguna && {
                  name: { [Op.iLike]: `%${namaPengguna}%` },
                }),
                ...(peran && {
                  isLeader: peran.toLowerCase() === "ketua",
                }),
                ...(instansi && {
                  institution: { [Op.iLike]: `%${instansi}%` },
                }),
              },
            },
          ],
        },
      ],
    });

    let formatted = [];

    if (!isExport) {
      formatted = submission.flatMap((userSubmission) => {
        const { submission } = userSubmission;

        return submission.personalDatas.map((personalData) => ({
          id: userSubmission.id,
          submissionId: submission.id,
          namaPengguna: personalData.name || "-",
          jenisPengajuan: submission.submissionType?.title || "-",
          skemaPengajuan: submission.submissionScheme || "-",
          progressPengajuan: userSubmission.reviewStatus || "-",
          peran: personalData.isLeader ? "Ketua" : "Anggota",
          waktuPengajuan: userSubmission.createdAt,
        }));
      });
    }

    res.status(200).json({
      status: "success",
      currentPage: isExport ? undefined : page,
      totalPages: isExport ? undefined : Math.ceil(count / limit),
      totalSubmissions: count,
      limit: isExport ? undefined : limit,
      submissions: isExport ? undefined : formatted,
      rawSubmissions: isExport ? submission : undefined,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getSubmissionTypeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const type = await SubmissionTypes.findByPk(id);

    if (!type) {
      return next(new ApiError("Jenis pengajuan tidak ditemukan", 404));
    }

    res.status(200).json({
      status: "success",
      type,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const createSubmissionType = async (req, res, next) => {
  try {
    const { title, isPublish } = req.body;

    await SubmissionTypes.create({
      title,
      isPublish,
    });

    await logActivity({
      userId: req.user.id,
      action: "Menambah Kategori Pengajuan",
      description: `${req.user.fullname} berhasil menambah kategori pengajuan.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(201).json({
      status: "success",
      message: "Jenis pengajuan berhasil ditambahkan",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updateSubmissionType = async (req, res, next) => {
  try {
    const { id } = req.params;

    const type = await SubmissionTypes.findByPk(id);

    if (!type) {
      return next(new ApiError("Jenis pengajuan tidak ditemukan", 404));
    }

    await SubmissionTypes.update(req.body, {
      where: { id },
    });

    await logActivity({
      userId: req.user.id,
      action: "Mengubah Jenis Pengajuan",
      description: `${req.user.fullname} berhasil memperbaharui jenis pengajuan.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Jenis pengajuan berhasil diperbaharui",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updatePersonalData = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { personalDatas } = req.body || {};
    if (!submissionId || !personalDatas) {
      return next(
        new ApiError("submissionId dan personalDatas diperlukan", 400)
      );
    }

    const parsedPersonalDatas =
      typeof personalDatas === "string"
        ? JSON.parse(personalDatas)
        : personalDatas;

    const ktpFiles = req.files?.ktpFiles || [];

    const submission = await Submissions.findByPk(submissionId);
    if (!submission) {
      return next(new ApiError("Submission tidak ditemukan", 404));
    }

    for (let i = 0; i < parsedPersonalDatas.length; i++) {
      const data = parsedPersonalDatas[i];
      const ktpFile = ktpFiles[i]?.filename;

      let existingData = null;
      if (data.id) {
        existingData = await PersonalDatas.findOne({
          where: {
            id: data.id,
            submissionId: submission.id,
          },
        });
      }

      if (existingData) {
        if (ktpFile && existingData.ktp) {
          const oldFilePath = path.join(
            __dirname,
            "../../uploads/documents/",
            existingData.ktp
          );
          if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
        }

        await existingData.update({
          ...data,
          ktp: ktpFile || existingData.ktp,
        });
      } else {
        const newData = { ...data };
        delete newData.id;
        await PersonalDatas.create({
          ...newData,
          submissionId,
          ktp: ktpFile || null,
          isLeader: i === 0,
        });
      }
    }

    await logActivity({
      userId: req.user.id,
      action: "Update Data Diri",
      description: `${req.user.fullname} mengupdate data diri pada submission ID ${submissionId}`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    return res.status(200).json({
      status: "success",
      message: "Data personal berhasil diupdate / ditambahkan",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updatePersonalDataBrand = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { personalDatas } = req.body || {};

    const ktpFiles = req.files?.ktpFiles || [];
    const labelBrand = req.files?.labelBrand ? req.files.labelBrand[0] : null;
    const fileUploade = req.files?.fileUploade
      ? req.files.fileUploade[0]
      : null;
    const signature = req.files?.signature ? req.files.signature[0] : null;
    const InformationLetter = req.files?.InformationLetter
      ? req.files.InformationLetter[0]
      : null;
    const letterStatment = req.files?.letterStatment
      ? req.files.letterStatment[0]
      : null;

    if (!submissionId || !personalDatas) {
      return next(
        new ApiError("submissionId dan personalDatas diperlukan", 400)
      );
    }

    const parsedPersonalDatas =
      typeof personalDatas === "string"
        ? JSON.parse(personalDatas)
        : personalDatas;

    const submission = await Submissions.findByPk(submissionId);
    if (!submission) {
      return next(new ApiError("Submission tidak ditemukan", 404));
    }

    const brandId = submission.brandId;

    // Update data personal
    for (let i = 0; i < parsedPersonalDatas.length; i++) {
      const data = parsedPersonalDatas[i];
      const ktpFile = ktpFiles[i]?.filename;

      let existingData = null;
      if (data.id) {
        existingData = await PersonalDatas.findOne({
          where: {
            id: data.id,
            submissionId: submission.id,
          },
        });
      }

      if (existingData) {
        if (ktpFile && existingData.ktp) {
          const oldFilePath = path.join(
            __dirname,
            "../../uploads/documents/",
            existingData.ktp
          );
          if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
        }

        await existingData.update({
          ...data,
          ktp: ktpFile || existingData.ktp,
        });
      } else {
        const newData = { ...data };
        delete newData.id;
        await PersonalDatas.create({
          ...newData,
          submissionId,
          ktp: ktpFile || null,
          isLeader: i === 0,
        });
      }
    }

    // Update file brand
    const existingBrand = await Brands.findByPk(brandId);
    if (!existingBrand) {
      return next(new ApiError("Brand tidak ditemukan", 404));
    }

    const fileFieldsToUpdate = {};

    const imageFields = [
      { field: "labelBrand", file: labelBrand },
      { field: "signature", file: signature },
    ];

    const documentFields = [
      { field: "fileUploade", file: fileUploade },
      { field: "InformationLetter", file: InformationLetter },
      { field: "letterStatment", file: letterStatment },
    ];

    for (const { field, file } of imageFields) {
      if (file) {
        if (existingBrand[field]) {
          const oldImagePath = path.join(
            __dirname,
            "../../uploads/image/",
            existingBrand[field]
          );
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        fileFieldsToUpdate[field] = file.filename;
      }
    }

    for (const { field, file } of documentFields) {
      if (file) {
        if (existingBrand[field]) {
          const oldDocPath = path.join(
            __dirname,
            "../../uploads/documents/",
            existingBrand[field]
          );
          if (fs.existsSync(oldDocPath)) {
            fs.unlinkSync(oldDocPath);
          }
        }
        fileFieldsToUpdate[field] = file.filename;
      }
    }

    if (Object.keys(fileFieldsToUpdate).length > 0) {
      await existingBrand.update(fileFieldsToUpdate);
    }

    await logActivity({
      userId: req.user.id,
      action: "Update Data Diri dan Merek",
      description: `${req.user.fullname} mengupdate data diri dan file merek pada submission ID ${submissionId}`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    return res.status(200).json({
      status: "success",
      message: "Data personal dan file merek berhasil diupdate",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updatePersonalDataCopyright = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const body = req.body || {};
    const {
      titleInvention,
      typeCreationId,
      subTypeCreationId,
      countryFirstAnnounced,
      cityFirstAnnounced,
      timeFirstAnnounced,
      briefDescriptionCreation,
      personalDatas,
    } = body;

    const ktpFiles = req.files?.ktpFiles || [];
    const statementLetterFile = req.files?.statementLetter
      ? req.files.statementLetter[0]
      : null;
    const letterTransferCopyrightFile = req.files?.letterTransferCopyright
      ? req.files.letterTransferCopyright[0]
      : null;
    const exampleCreationFile = req.files?.exampleCreation
      ? req.files.exampleCreation[0]
      : null;
    // const exampleCreation =
    //   exampleCreationFile?.filename || req.body.exampleCreation || null;

    if (!submissionId || !personalDatas) {
      return next(
        new ApiError("submissionId dan personalDatas diperlukan", 400)
      );
    }

    const parsedPersonalDatas =
      typeof personalDatas === "string"
        ? JSON.parse(personalDatas)
        : personalDatas;

    const submission = await Submissions.findByPk(submissionId);
    if (!submission) {
      return next(new ApiError("Submission tidak ditemukan", 404));
    }

    const copyrightId = submission.copyrightId;

    for (let i = 0; i < parsedPersonalDatas.length; i++) {
      const data = parsedPersonalDatas[i];
      const ktpFile = ktpFiles[i]?.filename;

      let existingData = null;
      if (data.id) {
        existingData = await PersonalDatas.findOne({
          where: {
            id: data.id,
            submissionId: submission.id,
          },
        });
      }

      if (existingData) {
        if (ktpFile && existingData.ktp) {
          const oldFilePath = path.join(
            __dirname,
            "../../uploads/documents/",
            existingData.ktp
          );
          if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
        }

        await existingData.update({
          ...data,
          ktp: ktpFile || existingData.ktp,
        });
      } else {
        const newData = { ...data };
        delete newData.id;
        await PersonalDatas.create({
          ...newData,
          submissionId,
          ktp: ktpFile || null,
          isLeader: i === 0,
        });
      }
    }

    const existingCopyright = await Copyrights.findByPk(copyrightId);
    if (!existingCopyright) {
      return next(new ApiError("Data hak cipta tidak ditemukan", 404));
    }

    const documentFolderPath = path.join(__dirname, "../../uploads/documents/");

    const exampleCreation =
      exampleCreationFile?.filename || req.body.exampleCreation || null;

    if (statementLetterFile) {
      if (existingCopyright.statementLetter) {
        const oldPath = path.join(
          documentFolderPath,
          existingCopyright.statementLetter
        );
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      existingCopyright.statementLetter = statementLetterFile.filename;
    }

    if (letterTransferCopyrightFile) {
      if (existingCopyright.letterTransferCopyright) {
        const oldPath = path.join(
          documentFolderPath,
          existingCopyright.letterTransferCopyright
        );
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      existingCopyright.letterTransferCopyright =
        letterTransferCopyrightFile.filename;
    }

    if (exampleCreationFile && existingCopyright.exampleCreation) {
      const oldPath = path.join(
        documentFolderPath,
        existingCopyright.exampleCreation
      );
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    existingCopyright.exampleCreation = exampleCreation;

    await existingCopyright.update({
      titleInvention,
      typeCreationId,
      subTypeCreationId,
      countryFirstAnnounced,
      cityFirstAnnounced,
      timeFirstAnnounced,
      briefDescriptionCreation,
      statementLetter:
        statementLetterFile?.filename || existingCopyright.statementLetter,
      letterTransferCopyright:
        letterTransferCopyrightFile?.filename ||
        existingCopyright.letterTransferCopyright,
      exampleCreation:
        exampleCreationFile?.filename || req.body.exampleCreation || null,
    });

    await logActivity({
      userId: req.user.id,
      action: "Update Data Diri dan Hak Cipta",
      description: `${req.user.fullname} mengupdate data diri dan file hak cipta pada submission ID ${submissionId}`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    return res.status(200).json({
      status: "success",
      message: "Data personal dan file hak cipta berhasil diupdate",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updatePersonalDataPaten = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { personalDatas } = req.body || {};
    const ktpFiles = req.files?.ktpFiles || [];
    const draftPatentApplicationFiles =
      req.files?.draftPatentApplicationFile || [];

    if (!submissionId || !personalDatas) {
      return next(
        new ApiError("submissionId dan personalDatas diperlukan", 400)
      );
    }

    const parsedPersonalDatas =
      typeof personalDatas === "string"
        ? JSON.parse(personalDatas)
        : personalDatas;

    const submission = await Submissions.findByPk(submissionId);
    if (!submission) {
      return next(new ApiError("Submission tidak ditemukan", 404));
    }

    const patentId = submission.patentId;

    for (let i = 0; i < parsedPersonalDatas.length; i++) {
      const data = parsedPersonalDatas[i];
      const ktpFile = ktpFiles[i]?.filename;

      let existingData = null;
      if (data.id) {
        existingData = await PersonalDatas.findOne({
          where: {
            id: data.id,
            submissionId: submission.id,
          },
        });
      }

      if (existingData) {
        if (ktpFile && existingData.ktp) {
          const oldFilePath = path.join(
            __dirname,
            "../../uploads/documents/",
            existingData.ktp
          );
          if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
        }

        await existingData.update({
          ...data,
          ktp: ktpFile || existingData.ktp,
        });
      } else {
        const newData = { ...data };
        delete newData.id;
        await PersonalDatas.create({
          ...newData,
          submissionId,
          ktp: ktpFile || null,
          isLeader: i === 0,
        });
      }
    }

    if (draftPatentApplicationFiles.length > 0) {
      const draftPatentFile = draftPatentApplicationFiles[0]?.filename;
      const existingPatent = await Patents.findByPk(patentId);

      if (existingPatent) {
        if (existingPatent.draftPatentApplicationFile) {
          const oldFilePath = path.join(
            __dirname,
            "../../uploads/documents/",
            existingPatent.draftPatentApplicationFile
          );
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }

        await existingPatent.update({
          draftPatentApplicationFile:
            draftPatentFile || existingPatent.draftPatentApplicationFile,
        });
      } else {
        return next(new ApiError("Paten tidak ditemukan", 404));
      }
    }

    await logActivity({
      userId: req.user.id,
      action: "Update Data Diri dan Paten",
      description: `${req.user.fullname} mengupdate data diri dan file paten pada submission ID ${submissionId}`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    return res.status(200).json({
      status: "success",
      message: "Data personal dan file paten berhasil diupdate",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updatePersonalDataDesignIndustri = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { personalDatas } = req.body || {};
    const ktpFiles = req.files?.ktpFiles || [];
    const draftDesainIndustriApplicationFiles =
      req.files?.draftDesainIndustriApplicationFile || [];

    if (!submissionId || !personalDatas) {
      return next(
        new ApiError("submissionId dan personalDatas diperlukan", 400)
      );
    }

    const parsedPersonalDatas =
      typeof personalDatas === "string"
        ? JSON.parse(personalDatas)
        : personalDatas;

    const submission = await Submissions.findByPk(submissionId);
    if (!submission) {
      return next(new ApiError("Submission tidak ditemukan", 404));
    }

    const industrialDesignId = submission.industrialDesignId;

    for (let i = 0; i < parsedPersonalDatas.length; i++) {
      const data = parsedPersonalDatas[i];
      const ktpFile = ktpFiles[i]?.filename;

      let existingData = null;
      if (data.id) {
        existingData = await PersonalDatas.findOne({
          where: {
            id: data.id,
            submissionId: submission.id,
          },
        });
      }

      if (existingData) {
        if (ktpFile && existingData.ktp) {
          const oldFilePath = path.join(
            __dirname,
            "../../uploads/documents/",
            existingData.ktp
          );
          if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
        }

        await existingData.update({
          ...data,
          ktp: ktpFile || existingData.ktp,
        });
      } else {
        const newData = { ...data };
        delete newData.id;
        await PersonalDatas.create({
          ...newData,
          submissionId,
          ktp: ktpFile || null,
          isLeader: i === 0,
        });
      }
    }

    if (draftDesainIndustriApplicationFiles.length > 0) {
      const draftDesainIndustriFile =
        draftDesainIndustriApplicationFiles[0]?.filename;
      const existingDesainIndustri = await IndustrialDesigns.findByPk(
        industrialDesignId
      );

      if (existingDesainIndustri) {
        if (existingDesainIndustri.draftDesainIndustriApplicationFile) {
          const oldFilePath = path.join(
            __dirname,
            "../../uploads/documents/",
            existingDesainIndustri.draftDesainIndustriApplicationFile
          );
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }

        await existingDesainIndustri.update({
          draftDesainIndustriApplicationFile:
            draftDesainIndustriFile ||
            existingDesainIndustri.draftDesainIndustriApplicationFile,
        });
      } else {
        return next(new ApiError("Desain Industri tidak ditemukan", 404));
      }
    }

    await logActivity({
      userId: req.user.id,
      action: "Update Data Diri dan Desain Industri",
      description: `${req.user.fullname} mengupdate data diri dan file desain industri pada submission ID ${submissionId}`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    return res.status(200).json({
      status: "success",
      message: "Data personal dan file paten berhasil diupdate",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const restoreSubmissionType = async (req, res, next) => {
  try {
    const { id } = req.params;

    const type = await SubmissionTypes.findOne({
      where: { id },
      paranoid: false,
    });

    if (!type) {
      return next(new ApiError("Jenis pengajuan tidak ditemukan", 404));
    }

    if (!type.deletedAt) {
      return res
        .status(400)
        .json({ message: "Jenis pengajuan ini belum dihapus" });
    }

    await type.restore();

    await logActivity({
      userId: req.user.id,
      action: "Restore Jenis Pengajuan",
      description: `${req.user.fullname} berhasil merestore jenis pengajuan.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Jenis pengajuan berhasil direstore",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const deleteSubmissionType = async (req, res, next) => {
  try {
    const { id } = req.params;

    const type = await SubmissionTypes.findByPk(id);

    if (!type) {
      return next(new ApiError("Jenis pengajuan tidak ditemukan", 404));
    }

    await type.destroy();

    await logActivity({
      userId: req.user.id,
      action: "Menghapus Jenis Pengajuan",
      description: `${req.user.fullname} berhasil menghapus jenis pengajuan.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Jenis pengajuan berhasil dihapus",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  getSubmissionType,
  getSubmissionTypeById,
  getAllSubmissions,
  createSubmissionType,
  updateSubmissionType,
  updatePersonalData,
  updatePersonalDataBrand,
  updatePersonalDataCopyright,
  updatePersonalDataPaten,
  updatePersonalDataDesignIndustri,
  restoreSubmissionType,
  deleteSubmissionType,
};
