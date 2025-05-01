const {
  UserSubmissions,
  Users,
  Submissions,
  Patents,
  PersonalDatas,
  PatentTypes,
} = require("../models");
const fs = require("fs");
const path = require("path");

const ApiError = require("../../utils/apiError");
const SendEmail = require("../../emails/services/sendMail");
const patentSubmissionMail = require("../../emails/templates/patentSubmissionMail");

const createPatentType = async (req, res, next) => {
  try {
    const { title } = req.body;

    await PatentTypes.create({ title });

    return res.status(201).json({
      status: "success",
      message: "Kategori paten berhasil dibuat",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const createPatent = async (req, res, next) => {
  try {
    const { submissionTypeId, personalDatas } = req.body;

    const draftPatentApplicationFile = req.files?.draftPatentApplicationFile
      ? req.files.draftPatentApplicationFile[0]
      : null;

    const patent = await Patents.create({
      draftPatentApplicationFile: draftPatentApplicationFile
        ? draftPatentApplicationFile.filename
        : null,
    });

    const parsedPersonalDatas =
      typeof personalDatas === "string"
        ? JSON.parse(personalDatas)
        : personalDatas;

    const ktpFiles = req.files.ktp || [];

    const submission = await Submissions.create({
      submissionTypeId,
      patentId: patent.id,
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
      centralStatus: "pending",
      reviewStatus: "pending",
    });

    const admins = await Users.findAll({ where: { role: "admin" } });
    const adminEmails = admins.map((admin) => admin.email);

    await SendEmail({
      to: adminEmails,
      subject: "Pengajuan Paten Berhasil Dibuat",
      html: patentSubmissionMail({
        fullname: req.user.fullname,
        email: req.user.email,
      }),
    });

    return res.status(201).json({
      status: "success",
      userSubmission,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updatePatentType = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { title } = req.body;

    await PatentTypes.update({ title }, { where: { id } });

    return res.status(200).json({
      status: "success",
      message: "Kategori paten berhasil diperbarui",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updatePatent = async (req, res, next) => {
  try {
    const { inventionTitle, patentTypeId, numberClaims } = req.body;

    const { id } = req.params;

    const patent = await Patents.findByPk(id);

    if (!patent) {
      return next(new ApiError("Patent tidak ditemukan", 404));
    }

    const removeOldFile = (oldFileName, folder = "documents") => {
      if (!oldFileName) return;
      const filePath = path.join(
        __dirname,
        `../../uploads/${folder}/`,
        oldFileName
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    };

    const entirePatentDocument = req.files?.entirePatentDocument?.[0] || null;
    const description = req.files?.description?.[0] || null;
    const abstract = req.files?.abstract?.[0] || null;
    const claim = req.files?.claim?.[0] || null;
    const inventionImage = req.files?.inventionImage?.[0] || null;
    const statementInventionOwnership =
      req.files?.statementInventionOwnership?.[0] || null;
    const letterTransferRightsInvention =
      req.files?.letterTransferRightsInvention?.[0] || null;
    const letterPassedReviewStage =
      req.files?.letterPassedReviewStage?.[0] || null;

    if (entirePatentDocument) removeOldFile(patent.entirePatentDocument);
    if (description) removeOldFile(patent.description);
    if (abstract) removeOldFile(patent.abstract);
    if (claim) removeOldFile(patent.claim);
    if (inventionImage) removeOldFile(patent.inventionImage, "image");
    if (statementInventionOwnership)
      removeOldFile(patent.statementInventionOwnership);
    if (letterTransferRightsInvention)
      removeOldFile(patent.letterTransferRightsInvention);
    if (letterPassedReviewStage) removeOldFile(patent.letterPassedReviewStage);

    await patent.update({
      inventionTitle,
      patentTypeId,
      numberClaims,
      entirePatentDocument:
        entirePatentDocument?.filename || patent.entirePatentDocument,
      description: description?.filename || patent.description,
      abstract: abstract?.filename || patent.abstract,
      claim: claim?.filename || patent.claim,
      inventionImage: inventionImage?.filename || patent.inventionImage,
      statementInventionOwnership:
        statementInventionOwnership?.filename ||
        patent.statementInventionOwnership,
      letterTransferRightsInvention:
        letterTransferRightsInvention?.filename ||
        patent.letterTransferRightsInvention,
      letterPassedReviewStage:
        letterPassedReviewStage?.filename || patent.letterPassedReviewStage,
    });

    res.status(200).json({
      message: "Patent berhasil diperbaharui",
      patent,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllPatentTypes = async (req, res, next) => {
  try {
    const patentTypes = await PatentTypes.findAll();

    return res.status(200).json({
      status: "success",
      patentTypes,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const deletePatentType = async (req, res, next) => {
  try {
    const { id } = req.params;

    await PatentTypes.destroy({ where: { id } });

    return res.status(200).json({
      status: "success",
      message: "Kategori paten berhasil dihapus",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  createPatent,
  createPatentType,
  updatePatent,
  updatePatentType,
  getAllPatentTypes,
  deletePatentType,
};
