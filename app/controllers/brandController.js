const {
  UserSubmissions,
  Submissions,
  Brands,
  PersonalDatas,
  AdditionalDatas,
  Periods,
} = require("../models");
const fs = require("fs");
const path = require("path");

const ApiError = require("../../utils/apiError");

const createBrand = async (req, res, next) => {
  try {
    const {
      submissionTypeId,
      applicationType,
      brandType,
      referenceName,
      elementColor,
      translate,
      pronunciation,
      disclaimer,
      description,
      documentType,
      information,
      periodId,
      personalDatas,
    } = req.body;

    const labelBrand = req.files?.labelBrand?.[0] || null;
    const fileUploade = req.files?.fileUploade?.[0] || null;
    const signature = req.files?.signature?.[0] || null;
    const InformationLetter = req.files?.InformationLetter?.[0] || null;
    const letterStatment = req.files?.letterStatment?.[0] || null;

    const brand = await Brands.create({
      applicationType,
      brandType,
      referenceName,
      elementColor,
      translate,
      pronunciation,
      disclaimer,
      description,
      documentType,
      information,
      labelBrand: labelBrand ? labelBrand.filename : null,
      fileUploade: fileUploade ? fileUploade.filename : null,
      signature: signature ? signature.filename : null,
      InformationLetter: InformationLetter ? InformationLetter.filename : null,
      letterStatment: letterStatment ? letterStatment.filename : null,
    });

    const additionalFiles = req.files.additionalFiles || [];
    const additionalDescriptions = req.body.additionalDescriptions;
    const parsedDescriptions =
      typeof additionalDescriptions === "string"
        ? JSON.parse(additionalDescriptions)
        : additionalDescriptions || [];

    const additionalDatasPayload = additionalFiles.map((file, index) => ({
      brandId: brand.id,
      fileName: file.originalname,
      size: file.size,
      file: additionalFiles[index] ? additionalFiles[index].filename : null,
      description: parsedDescriptions[index] || null,
    }));

    if (additionalDatasPayload.length > 0) {
      await AdditionalDatas.bulkCreate(additionalDatasPayload);
    }

    const parsedPersonalDatas =
      typeof personalDatas === "string"
        ? JSON.parse(personalDatas)
        : personalDatas;

    const ktpFiles = req.files.ktp || [];

    const submission = await Submissions.create({
      submissionTypeId,
      brandId: brand.id,
      periodId,
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

    return res.status(200).json({
      status: "success",
      message: "Brand berhasil dibuat",
      brand,
      submission,
      userSubmission,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updateBrand = async (req, res, next) => {
  try {
    const {
      applicationType,
      brandType,
      referenceName,
      elementColor,
      translate,
      pronunciation,
      disclaimer,
      description,
      documentType,
      information,
      periodId,
      personalDatas,
    } = req.body || {};

    const { id } = req.params;

    const brand = await Brands.findByPk(id);
    if (!brand) {
      return next(new ApiError("Brand tidak ditemukan", 404));
    }

    const fileFieldMap = {
      labelBrand: "uploads/image/",
      signature: "uploads/image/",
      fileUploade: "uploads/documents/",
      InformationLetter: "uploads/documents/",
      letterStatment: "uploads/documents/",
    };

    for (const field in fileFieldMap) {
      const newFile = req.files?.[field]?.[0];
      if (newFile && brand[field]) {
        const oldFilePath = path.join(
          __dirname,
          "../../",
          fileFieldMap[field],
          brand[field]
        );
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    }

    await brand.update({
      applicationType,
      brandType,
      referenceName,
      elementColor,
      translate,
      pronunciation,
      disclaimer,
      description,
      documentType,
      information,
      labelBrand: req.files?.labelBrand?.[0]?.filename || brand.labelBrand,
      fileUploade: req.files?.fileUploade?.[0]?.filename || brand.fileUploade,
      signature: req.files?.signature?.[0]?.filename || brand.signature,
      InformationLetter:
        req.files?.InformationLetter?.[0]?.filename || brand.InformationLetter,
      letterStatment:
        req.files?.letterStatment?.[0]?.filename || brand.letterStatment,
    });

    const submission = await Submissions.findOne({
      where: { brandId: brand.id },
    });
    if (!submission)
      return next(new ApiError("Submission tidak ditemukan", 404));

    if (personalDatas) {
      await PersonalDatas.destroy({ where: { submissionId: submission.id } });

      const parsedPersonalDatas =
        typeof personalDatas === "string"
          ? JSON.parse(personalDatas)
          : personalDatas;

      const ktpFiles = req.files?.ktp || [];

      const personalDatasWithSubmissionId = parsedPersonalDatas.map(
        (data, index) => ({
          ...data,
          submissionId: submission.id,
          ktp: ktpFiles[index] ? ktpFiles[index].filename : null,
          isLeader: index === 0,
        })
      );

      await PersonalDatas.bulkCreate(personalDatasWithSubmissionId);
    }

    return res.status(200).json({
      status: "success",
      message: "Brand berhasil diupdate",
      brand,
      submission,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllAdditionalDatas = async (req, res, next) => {
  try {
    const additionalDatas = await AdditionalDatas.findAll();
    return res.status(200).json({
      status: "success",
      additionalDatas,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updateAdditionalDatas = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description } = req.body;
    const newFile = req.files?.file?.[0];

    // Cari additionalData berdasarkan ID
    const additionalData = await AdditionalDatas.findByPk(id);
    if (!additionalData) {
      return next(new ApiError("AdditionalData tidak ditemukan", 404));
    }

    if (newFile) {
      const fileTypePath =
        additionalData.file.endsWith(".pdf") ||
        additionalData.file.endsWith(".docx")
          ? "documents"
          : "image";

      const fileFieldMap = {
        documents: "uploads/documents/",
        image: "uploads/image/",
      };

      const oldFilePath = path.join(
        __dirname,
        "../../",
        fileFieldMap[fileTypePath],
        additionalData.file
      );

      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath); // Hapus file lama
      }

      await additionalData.update({
        fileName: newFile.originalname,
        size: newFile.size,
        file: newFile.filename,
        fileType: newFile.mimetype.startsWith("image/") ? "image" : "documents",
      });
    }

    if (description !== undefined) {
      await additionalData.update({ description });
    }

    return res.status(200).json({
      status: "success",
      message: "AdditionalData berhasil diperbarui",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  createBrand,
  updateBrand,
  getAllAdditionalDatas,
  updateAdditionalDatas,
};
