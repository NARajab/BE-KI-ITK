const {
  UserSubmissions,
  Submissions,
  SubmissionTypes,
  PersonalDatas,
  Progresses,
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
    const search = req.query.search || "";

    const offset = (page - 1) * limit;

    const whereCondition = search
      ? {
          [Op.or]: [{ title: { [Op.iLike]: `%${search}%` } }],
        }
      : {};

    const { count, rows: submissionsType } =
      await SubmissionTypes.findAndCountAll({
        where: whereCondition,
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
    const page = parseInt(req.query.page) || 1;
    const isExport = req.query.export === "true";

    let limit;
    if (!isExport && req.query.limit && !isNaN(parseInt(req.query.limit))) {
      limit = parseInt(req.query.limit);
    } else if (!isExport) {
      limit = 10;
    }

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

    const personalWhere = {};
    if (namaPengguna) personalWhere.name = { [Op.iLike]: `%${namaPengguna}%` };
    if (peran) personalWhere.isLeader = peran.toLowerCase() === "ketua";
    if (instansi) personalWhere.institution = { [Op.iLike]: `%${instansi}%` };

    const submissionWhere = {};
    if (skemaPengajuan && ["Pendanaan", "Mandiri"].includes(skemaPengajuan)) {
      submissionWhere.submissionScheme = skemaPengajuan;
    }

    const progressWhere = {};
    if (progressPengajuan) {
      progressWhere.status = {
        [Op.iLike]: `%${progressPengajuan}%`,
      };
    }

    const userSubmissionWhere = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);

      userSubmissionWhere.createdAt = {
        [Op.gte]: start,
        [Op.lt]: end,
      };
    }

    const { count, rows: personalDatas } = await PersonalDatas.findAndCountAll({
      where: personalWhere,
      distinct: true,
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
                ? { title: { [Op.iLike]: `%${jenisPengajuan}%` } }
                : undefined,
            },
            {
              model: UserSubmissions,
              as: "userSubmissions",
              include: [
                {
                  model: Progresses,
                  as: "progress",
                  required: false,
                },
              ],
            },
          ],
        },
      ],
    });

    const formatted = personalDatas.map((pd) => {
      const submission = pd.submission;
      const userSubmission = submission?.userSubmissions?.[0];

      const latestProgress = userSubmission?.progress?.length
        ? userSubmission.progress.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          )[0]
        : null;

      return {
        id: userSubmission?.id || "-",
        submissionId: submission?.id || "-",
        namaPengguna: pd.name || "-",
        jenisPengajuan: submission?.submissionType?.title || "-",
        skemaPengajuan: submission?.submissionScheme || "-",
        progressPengajuan: latestProgress?.status || "-",
        peran: pd.isLeader ? "Ketua" : "Anggota",
        waktuPengajuan: userSubmission?.createdAt || "-",
      };
    });

    const filtered = progressPengajuan
      ? formatted.filter((f) =>
          f.progressPengajuan
            .toLowerCase()
            .includes(progressPengajuan.toLowerCase())
        )
      : formatted;

    const paginated = isExport
      ? filtered
      : filtered.slice((page - 1) * limit, page * limit);

    res.status(200).json({
      status: "success",
      currentPage: isExport ? undefined : page,
      totalPages: isExport ? undefined : Math.ceil(filtered.length / limit),
      totalSubmissions: filtered.length,
      limit: isExport ? undefined : limit,
      submissions: isExport ? undefined : paginated,
      rawSubmissions: isExport ? personalDatas : undefined,
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
      message: "Jenis pengajuan berhasil diperbaharui.",
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
      const uploadKtp = data.uploadKtp;
      const ktpFileIndex = data.ktpFileIndex;

      const ktpFile =
        uploadKtp && ktpFileIndex !== undefined && ktpFiles[ktpFileIndex]
          ? ktpFiles[ktpFileIndex].filename
          : null;

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
        console.log(
          `Updated KTP for ${existingData.fullname || existingData.id}: ${
            ktpFile || existingData.ktp
          }`
        );
      } else {
        const newData = { ...data };
        delete newData.id;

        await PersonalDatas.create({
          ...newData,
          submissionId,
          ktp: ktpFile || null,
          isLeader: i === 0,
        });
        console.log(`Created new PersonalData with KTP: ${ktpFile || null}`);
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

    let fileIndex = 0;

    for (let i = 0; i < parsedPersonalDatas.length; i++) {
      const data = parsedPersonalDatas[i];
      const uploadKtp = data.uploadKtp;
      const ktpFileIndex = data.ktpFileIndex;

      const ktpFile =
        uploadKtp && ktpFileIndex !== undefined && ktpFiles[ktpFileIndex]
          ? ktpFiles[ktpFileIndex].filename
          : null;

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
        console.log(
          `Updated KTP for ${existingData.fullname || existingData.id}: ${
            ktpFile || existingData.ktp
          }`
        );
      } else {
        const newData = { ...data };
        delete newData.id;

        await PersonalDatas.create({
          ...newData,
          submissionId,
          ktp: ktpFile || null,
          isLeader: i === 0,
        });
        console.log(`Created new PersonalData with KTP: ${ktpFile || null}`);
      }
    }

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
          if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
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
          if (fs.existsSync(oldDocPath)) fs.unlinkSync(oldDocPath);
        }
        fileFieldsToUpdate[field] = file.filename;
      }
    }

    const brandDataUpdate = {
      ...fileFieldsToUpdate,
      applicationType: req.body.applicationType,
      brandTypeId: req.body.brandTypeId,
      referenceName: req.body.referenceName,
      elementColor: req.body.elementColor,
      translate: req.body.translate,
      pronunciation: req.body.pronunciation,
      disclaimer: req.body.disclaimer,
      description: req.body.description,
      documentType: req.body.documentType,
      information: req.body.information,
    };

    Object.keys(brandDataUpdate).forEach(
      (key) => brandDataUpdate[key] === undefined && delete brandDataUpdate[key]
    );

    if (Object.keys(brandDataUpdate).length > 0) {
      await existingBrand.update(brandDataUpdate);
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
      const uploadKtp = data.uploadKtp;
      const ktpFileIndex = data.ktpFileIndex;

      const ktpFile =
        uploadKtp && ktpFileIndex !== undefined && ktpFiles[ktpFileIndex]
          ? ktpFiles[ktpFileIndex].filename
          : null;

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
        console.log(
          `Updated KTP for ${existingData.fullname || existingData.id}: ${
            ktpFile || existingData.ktp
          }`
        );
      } else {
        const newData = { ...data };
        delete newData.id;

        await PersonalDatas.create({
          ...newData,
          submissionId,
          ktp: ktpFile || null,
          isLeader: i === 0,
        });
        console.log(`Created new PersonalData with KTP: ${ktpFile || null}`);
      }
    }

    const existingCopyright = await Copyrights.findByPk(copyrightId);
    if (!existingCopyright) {
      return next(new ApiError("Data hak cipta tidak ditemukan", 404));
    }

    const documentFolderPath = path.join(__dirname, "../../uploads/documents/");

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

    if (exampleCreationFile) {
      if (existingCopyright.exampleCreation) {
        const oldPath = path.join(
          documentFolderPath,
          existingCopyright.exampleCreation
        );
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      existingCopyright.exampleCreation = exampleCreationFile.filename;
    }

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
        exampleCreationFile?.filename || req.body.exampleCreation,
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
      const uploadKtp = data.uploadKtp;
      const ktpFileIndex = data.ktpFileIndex;

      const ktpFile =
        uploadKtp && ktpFileIndex !== undefined && ktpFiles[ktpFileIndex]
          ? ktpFiles[ktpFileIndex].filename
          : null;

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
        console.log(
          `Updated KTP for ${existingData.fullname || existingData.id}: ${
            ktpFile || existingData.ktp
          }`
        );
      } else {
        const newData = { ...data };
        delete newData.id;

        await PersonalDatas.create({
          ...newData,
          submissionId,
          ktp: ktpFile || null,
          isLeader: i === 0,
        });
        console.log(`Created new PersonalData with KTP: ${ktpFile || null}`);
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
      const uploadKtp = data.uploadKtp;
      const ktpFileIndex = data.ktpFileIndex;

      const ktpFile =
        uploadKtp && ktpFileIndex !== undefined && ktpFiles[ktpFileIndex]
          ? ktpFiles[ktpFileIndex].filename
          : null;

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
        console.log(
          `Updated KTP for ${existingData.fullname || existingData.id}: ${
            ktpFile || existingData.ktp
          }`
        );
      } else {
        const newData = { ...data };
        delete newData.id;

        await PersonalDatas.create({
          ...newData,
          submissionId,
          ktp: ktpFile || null,
          isLeader: i === 0,
        });
        console.log(`Created new PersonalData with KTP: ${ktpFile || null}`);
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

const deletePersonalData = async (req, res, next) => {
  try {
    const { id } = req.params;

    const data = await PersonalDatas.findByPk(id);

    if (!data) {
      return next(new ApiError("Data diri tidak ditemukan", 404));
    }

    await data.destroy();

    res.status(200).json({
      status: "success",
      message: "Data diri berhasil dihapus",
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
  deletePersonalData,
};
