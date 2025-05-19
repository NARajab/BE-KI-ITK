const {
  UserSubmissions,
  Users,
  Submissions,
  Progresses,
  Copyrights,
  PersonalDatas,
  TypeCreations,
  SubTypeCreations,
} = require("../models");
const fs = require("fs");
const path = require("path");

const logActivity = require("../helpers/activityLogs");
const ApiError = require("../../utils/apiError");
const SendEmail = require("../../emails/services/sendMail");
const copyrightSubmissionMail = require("../../emails/templates/copyrightSubmissionMail");

const createTypeCreation = async (req, res, next) => {
  try {
    const { title } = req.body;
    await TypeCreations.create({ title: title });

    await logActivity({
      userId: req.user.id,
      action: "Menambah Kategori Hak Cipta",
      description: `${req.user.fullname} berhasil menambah kategori hak cipta.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Kategori Hak Cipta berhasil ditambahkan",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const createSubTypeCreation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { title } = req.body;
    await SubTypeCreations.create({ typeCreationId: id, title: title });

    await logActivity({
      userId: req.user.id,
      action: "Menambah Sub Kategori Hak Cipta",
      description: `${req.user.fullname} berhasil menambah sub kategori hak cipta.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Sub Kategori Hak Cipta berhasil ditambahkan",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllTypeCreation = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    const { count, rows: typeCreation } = await TypeCreations.findAndCountAll({
      limit: limit,
      offset: (page - 1) * limit,
    });

    res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      limit: limit,
      typeCreation,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllSubTypeCreationByTypeCreation = async (req, res, next) => {
  try {
    const { id } = req.params;

    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    const { count, rows: subTypeCreation } =
      await SubTypeCreations.findAndCountAll({
        where: { typeCreationId: id },
        limit: limit,
        offset: (page - 1) * limit,
      });

    res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      limit: limit,
      subTypeCreation,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllTypeCreationWtoPagination = async (req, res, next) => {
  try {
    const typeCreation = await TypeCreations.findAll();
    res.status(200).json({
      status: "success",
      typeCreation,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllSubTypeCreationByTypeCreationWtoPagination = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const subTypeCreation = await SubTypeCreations.findAll({
      where: { typeCreationId: id },
    });

    res.status(200).json({
      status: "success",
      subTypeCreation,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updateTypeCreation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { title } = req.body;
    await TypeCreations.update({ title: title }, { where: { id: id } });

    await logActivity({
      userId: req.user.id,
      action: "Mengubah Kategori Merek",
      description: `${req.user.fullname} berhasil mengubah kategori merek.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Kategori Hak Cipta berhasil diperbarui",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getByIdTypeCreation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const typeCreation = await TypeCreations.findByPk(id);
    if (!typeCreation) {
      return next(new ApiError("TypeCreation tidak ditemukan", 404));
    }
    return res.status(200).json({
      status: "success",
      typeCreation,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getByIdSubType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const subTypeCreation = await SubTypeCreations.findByPk(id);
    if (!subTypeCreation) {
      return next(new ApiError("SubTypeCreation tidak ditemukan", 404));
    }
    return res.status(200).json({
      status: "success",
      subTypeCreation,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updateSubTypeCreation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { title } = req.body;
    await SubTypeCreations.update({ title: title }, { where: { id: id } });

    await logActivity({
      userId: req.user.id,
      action: "Mengubah Sub Kategori Merek",
      description: `${req.user.fullname} berhasil mengubah sub kategori merek.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Sub Kategori Hak Cipta berhasil diperbarui",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const createCopyright = async (req, res, next) => {
  try {
    const {
      titleInvention,
      typeCreationId,
      subTypeCreationId,
      countryFirstAnnounced,
      cityFirstAnnounced,
      timeFirstAnnounced,
      briefDescriptionCreation,
      submissionTypeId,
      personalDatas,
    } = req.body;

    const statementLetterFile = req.files?.statementLetter
      ? req.files.statementLetter[0]
      : null;
    const letterTransferCopyrightFile = req.files?.letterTransferCopyright
      ? req.files.letterTransferCopyright[0]
      : null;
    const exampleCreationFile = req.files?.exampleCreation
      ? req.files.exampleCreation[0]
      : null;

    const copyright = await Copyrights.create({
      titleInvention,
      typeCreationId,
      subTypeCreationId,
      countryFirstAnnounced,
      cityFirstAnnounced,
      timeFirstAnnounced,
      briefDescriptionCreation,
      statementLetter: statementLetterFile
        ? statementLetterFile.filename
        : null,
      letterTransferCopyright: letterTransferCopyrightFile
        ? letterTransferCopyrightFile.filename
        : null,
      exampleCreation: exampleCreationFile
        ? exampleCreationFile.filename
        : null,
    });

    const parsedPersonalDatas =
      typeof personalDatas === "string"
        ? JSON.parse(personalDatas)
        : personalDatas;

    const ktpFiles = req.files.ktp || [];

    const submission = await Submissions.create({
      submissionTypeId,
      copyrightId: copyright.id,
    });

    const personalDatasWithSubmissionId = parsedPersonalDatas.map(
      (data, index) => ({
        ...data,
        submissionId: submission.id,
        ktp: ktpFiles[index] ? ktpFiles[index].filename : null,
        isLeader: index === 0,
      })
    );

    await PersonalDatas.bulkCreate(personalDatasWithSubmissionId);

    const userSubmission = await UserSubmissions.create({
      userId: req.user.id,
      submissionId: submission.id,
      centralStatus: "Draft",
    });

    await Progresses.create({
      userSubmissionId: userSubmission.id,
      status: "Menunggu",
      createdBy: req.user.fullname,
    });

    const admins = await Users.findAll({ where: { role: "admin" } });
    const adminEmails = admins.map((admin) => admin.email);

    await SendEmail({
      to: adminEmails,
      subject: "Pengajuan Hak Cipta Baru",
      html: copyrightSubmissionMail({
        fullname: req.user.fullname,
        email: req.user.email,
        titleInvention,
        type: "create",
      }),
    });

    await logActivity({
      userId: req.user.id,
      action: "Menambah Pengajuan Hak Cipta Baru",
      description: `${req.user.fullname} berhasil menambah pengajuan hak cipta baru.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: "Submission created successfully",
      userSubmission,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updateCopyright = async (req, res, next) => {
  try {
    const {
      titleInvention,
      typeCreation,
      subTypeCreation,
      countryFirstAnnounced,
      cityFirstAnnounced,
      timeFirstAnnounced,
      briefDescriptionCreation,
    } = req.body;

    const { id } = req.params;

    const copyright = await Copyrights.findByPk(id);
    if (!copyright) {
      return next(new ApiError("Copyright tidak ditemukan", 404));
    }

    const submission = await Submissions.findOne({
      where: { copyrightId: id },
    });
    if (!submission) {
      return next(new ApiError("Submission tidak ditemukan", 404));
    }

    const userSubmission = await UserSubmissions.findOne({
      where: { submissionId: submission.id },
    });
    if (!userSubmission) {
      return res
        .status(404)
        .json({ message: "UserSubmission tidak ditemukan" });
    }

    const progress = await Progresses.findOne({
      where: { userSubmissionId: userSubmission.id },
      order: [["id", "DESC"]],
    });
    if (!progress) {
      return res.status(404).json({ message: "Progress tidak ditemukan" });
    }

    const removeOldFile = (oldFileName, folder = "documents") => {
      if (!oldFileName) return;
      const filePath = path.join(
        __dirname,
        `../../uploads/${folder}/`,
        oldFileName
      );
    };

    const statementLetterFile = req.files?.statementLetter?.[0] || null;
    const letterTransferCopyrightFile =
      req.files?.letterTransferCopyright?.[0] || null;
    const exampleCreationFile = req.files?.exampleCreation?.[0] || null;

    if (statementLetterFile) removeOldFile(copyright.statementLetter);
    if (letterTransferCopyrightFile)
      removeOldFile(copyright.letterTransferCopyright);
    if (exampleCreationFile) removeOldFile(copyright.exampleCreation);

    await copyright.update({
      titleInvention,
      typeCreation,
      subTypeCreation,
      countryFirstAnnounced,
      cityFirstAnnounced,
      timeFirstAnnounced,
      briefDescriptionCreation,
      statementLetter:
        statementLetterFile?.filename || copyright.statementLetter,
      letterTransferCopyright:
        letterTransferCopyrightFile?.filename ||
        copyright.letterTransferCopyright,
      exampleCreation:
        exampleCreationFile?.filename || copyright.exampleCreation,
    });

    await Progresses.update(
      { isStatus: true },
      {
        where: { id: progress.id },
      }
    );

    const admins = await Users.findAll({ where: { role: "admin" } });
    const adminEmails = admins.map((admin) => admin.email);

    await SendEmail({
      to: adminEmails,
      subject: "Pembaruan Pengajuan Hak Cipta",
      html: copyrightSubmissionMail({
        fullname: req.user.fullname,
        email: req.user.email,
        titleInvention: copyright.titleInvention,
        type: "update",
      }),
    });

    await logActivity({
      userId: req.user.id,
      action: "Memperbarui Data Hak Cipta",
      description: `${req.user.fullname} berhasil memperbarui data hak cipta.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      message: "Data Hak Cipta berhasil diperbarui.",
      copyright,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const deleteTypeCreation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const typeCreation = await TypeCreations.findByPk(id);
    if (!typeCreation) {
      return next(new ApiError("Type Creation tidak ditemukan", 404));
    }

    await SubTypeCreations.destroy({
      where: { typeCreationId: id },
    });

    await typeCreation.destroy();

    await logActivity({
      userId: req.user.id,
      action: "Menghapus Kategori Hak Cipta",
      description: `${req.user.fullname} berhasil menghapus kategori hak cipta.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Type Creation berhasil dihapus",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const restoreTypeCreation = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Cari data yang sudah di-soft delete (include paranoid: false)
    const typeCreation = await TypeCreations.findByPk(id, { paranoid: false });
    if (!typeCreation) {
      return next(new ApiError("Type Creation tidak ditemukan", 404));
    }

    await typeCreation.restore();

    // Optional: restore semua sub type terkait
    await SubTypeCreations.restore({
      where: { typeCreationId: id },
    });

    await logActivity({
      userId: req.user.id,
      action: "Mengembalikan Kategori Hak Cipta",
      description: `${req.user.fullname} berhasil mengembalikan kategori hak cipta.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Type Creation dan Sub Type terkait berhasil dikembalikan",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const restoreSubTypeCreation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const subTypeCreation = await SubTypeCreations.findByPk(id, {
      paranoid: false,
    });
    if (!subTypeCreation) {
      return next(new ApiError("Sub Type Creation tidak ditemukan", 404));
    }

    await subTypeCreation.restore();

    await logActivity({
      userId: req.user.id,
      action: "Mengembalikan Sub Kategori Hak Cipta",
      description: `${req.user.fullname} berhasil mengembalikan sub kategori hak cipta.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Sub Type Creation berhasil dikembalikan",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const deleteSubTypeCreation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const subTypeCreation = await SubTypeCreations.findByPk(id);
    if (!subTypeCreation) {
      return next(new ApiError("Sub Type Creation tidak ditemukan", 404));
    }

    await subTypeCreation.destroy();

    await logActivity({
      userId: req.user.id,
      action: "Menghapus Sub Kategori Hak Cipta",
      description: `${req.user.fullname} berhasil menghapus sub kategori hak cipta.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Sub Type Creation berhasil dihapus",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  createTypeCreation,
  createSubTypeCreation,
  createCopyright,
  updateCopyright,
  updateTypeCreation,
  updateSubTypeCreation,
  getAllTypeCreation,
  getAllSubTypeCreationByTypeCreation,
  getAllTypeCreationWtoPagination,
  getAllSubTypeCreationByTypeCreationWtoPagination,
  getByIdTypeCreation,
  getByIdSubType,
  restoreTypeCreation,
  restoreSubTypeCreation,
  deleteTypeCreation,
  deleteSubTypeCreation,
};
