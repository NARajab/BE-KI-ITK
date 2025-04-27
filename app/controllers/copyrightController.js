const {
  UserSubmissions,
  Submissions,
  Copyrights,
  PersonalDatas,
  TypeCreations,
  SubTypeCreations,
} = require("../models");
const fs = require("fs");
const path = require("path");

const ApiError = require("../../utils/apiError");

const createTypeCreation = async (req, res, next) => {
  try {
    const { title } = req.body;
    await TypeCreations.create({ title: title });
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

    if (limit <= 0) {
      const typeCreation = await TypeCreations.findAll();
      res.status(200).json({
        status: "success",
        typeCreation,
      });
    }

    const typeCreation = await TypeCreations.findAndCountAll({
      limit: limit,
      offset: (page - 1) * limit,
    });

    res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(typeCreation.count / limit),
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

    if (limit <= 0) {
      const subTypeCreation = await SubTypeCreations.findAll({
        where: { typeCreationId: id },
      });

      res.status(200).json({
        status: "success",
        subTypeCreation,
      });
    }

    const subTypeCreation = await SubTypeCreations.findAndCountAll({
      where: { typeCreationId: id },
      limit: limit,
      offset: (page - 1) * limit,
    });

    res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(subTypeCreation.count / limit),
      limit: limit,
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
    res.status(200).json({
      status: "success",
      message: "Kategori Hak Cipta berhasil diperbarui",
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

const deleteTypeCreation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const typeCreation = await TypeCreations.findByPk(id);
    if (!typeCreation) {
      return res.status(404).json({ message: "Type Creation tidak ditemukan" });
    }

    await SubTypeCreations.destroy({
      where: { typeCreationId: id },
    });

    await typeCreation.destroy();

    res.status(200).json({
      status: "success",
      message: "Type Creation berhasil dihapus",
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
      return res
        .status(404)
        .json({ message: "Sub Type Creation tidak ditemukan" });
    }

    await subTypeCreation.destroy();

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
  deleteTypeCreation,
  deleteSubTypeCreation,
};
