const {
  UserSubmissions,
  Submissions,
  Copyrights,
  PersonalDatas,
  Periods,
} = require("../models");
const fs = require("fs");
const path = require("path");

const ApiError = require("../../utils/apiError");

const createCopyright = async (req, res, next) => {
  try {
    const {
      titleInvention,
      typeCreation,
      subTypeCreation,
      countryFirstAnnounced,
      cityFirstAnnounced,
      timeFirstAnnounced,
      briefDescriptionCreation,
      submissionTypeId,
      periodId,
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
      typeCreation,
      subTypeCreation,
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

    await Periods.decrement("copyrightQuota", {
      by: 1,
      where: { id: periodId },
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
      personalDatas,
    } = req.body;

    const { id } = req.params;

    const copyright = await Copyrights.findByPk(id);
    if (!copyright) {
      return res.status(404).json({ message: "Copyright tidak ditemukan" });
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

    // Handle personalDatas
    const parsedPersonalDatas =
      typeof personalDatas === "string"
        ? JSON.parse(personalDatas)
        : personalDatas;

    console.log("parsedPersonalDatas:", parsedPersonalDatas);

    if (parsedPersonalDatas && Array.isArray(parsedPersonalDatas)) {
      const submission = await Submissions.findOne({
        where: { copyrightId: id },
      });

      if (submission) {
        const oldPersonals = await PersonalDatas.findAll({
          where: { submissionId: submission.id },
        });

        oldPersonals.forEach((p) => {
          if (p.ktp) removeOldFile(p.ktp, "image");
        });

        await PersonalDatas.destroy({ where: { submissionId: submission.id } });

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
    }

    res.status(200).json({
      message: "Copyright berhasil diperbaharui",
      copyright,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  createCopyright,
  updateCopyright,
};
