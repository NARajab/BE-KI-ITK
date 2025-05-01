const {
  UserSubmissions,
  Submissions,
  IndustrialDesigns,
  PersonalDatas,
  TypeDesigns,
  SubTypeDesigns,
  Users,
} = require("../models");
const fs = require("fs");
const path = require("path");

const ApiError = require("../../utils/apiError");
const SendEmail = require("../../emails/services/sendMail");
const IndustrialDesignSubmissionMail = require("../../emails/templates/industrialDesignSubmissionMail");

const createTypeDesignIndustri = async (req, res, next) => {
  try {
    const { title } = req.body;

    await TypeDesigns.create({ title: title });

    res.status(200).json({
      status: "success",
      message: "Kategori Desain Industri berhasil ditambahkan",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const createSubTypeDesignIndustri = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { title } = req.body;
    await SubTypeDesigns.create({ typeDesignId: id, title: title });
    res.status(200).json({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil ditambahkan",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const createDesignIndustri = async (req, res, next) => {
  try {
    const { submissionTypeId, personalDatas } = req.body;

    const draftDesainIndustriApplicationFile = req.files
      ?.draftDesainIndustriApplicationFile
      ? req.files.draftDesainIndustriApplicationFile[0]
      : null;

    const designIndustri = await IndustrialDesigns.create({
      draftDesainIndustriApplicationFile: draftDesainIndustriApplicationFile
        ? draftDesainIndustriApplicationFile.filename
        : null,
    });

    const parsedPersonalDatas =
      typeof personalDatas === "string"
        ? JSON.parse(personalDatas)
        : personalDatas;

    const ktpFiles = req.files.ktp || [];

    const submission = await Submissions.create({
      submissionTypeId,
      industrialDesignId: designIndustri.id,
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

    const userSubmissions = await UserSubmissions.create({
      userId: req.user.id,
      submissionId: submission.id,
      centralStatus: "pending",
      reviewStatus: "pending",
    });

    const admins = await Users.findAll({ where: { role: "admin" } });
    const adminEmails = admins.map((admin) => admin.email);

    await SendEmail({
      to: adminEmails,
      subject: "Pengajuan Desain Industri Baru",
      text: "Pengajuan Desain Industri Baru",
      html: IndustrialDesignSubmissionMail({
        fullname: req.user.fullname,
        email: req.user.email,
      }),
    });

    res.status(200).json({
      status: "success",
      message: "Pengajuan Desain Industri berhasil ditambahkan",
      userSubmissions,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllTypeDesignIndustri = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    if (limit <= 0) {
      const typeDesigns = await TypeDesigns.findAll();
      res.status(200).json({
        status: "success",
        message: "Kategori Desain Industri berhasil ditemukan",
        typeDesigns,
      });
    }

    const typeDesigns = await TypeDesigns.findAndCountAll({
      limit: limit,
      offset: (page - 1) * limit,
    });

    res.status(200).json({
      status: "success",
      message: "Kategori Desain Industri berhasil ditemukan",
      currentPage: page,
      totalPages: Math.ceil(typeDesigns.count / limit),
      limit: limit,
      typeDesigns,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getSubTypeDesignIndustri = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(
        new ApiError("Sub Kategori Desain Industri tidak ditemukan", 404)
      );
    }
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    if (limit <= 0) {
      const subTypeDesign = await SubTypeDesigns.findAll({
        where: { typeDesignId: id },
      });
      res.status(200).json({
        status: "success",
        message: "Sub Kategori Desain Industri berhasil ditemukan",
        subTypeDesign,
      });
    }

    const subTypeDesign = await SubTypeDesigns.findAndCountAll({
      where: { typeDesignId: id },
      limit: limit,
      offset: (page - 1) * limit,
    });
    res.status(200).json({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil ditemukan",
      currentPage: page,
      totalPages: Math.ceil(subTypeDesign.count / limit),
      limit: limit,
      subTypeDesign,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updateTypeDesignIndustri = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    await TypeDesigns.update({ title: title }, { where: { id: id } });
    res.status(200).json({
      status: "success",
      message: "Kategori Desain Industri berhasil diperbarui",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updateSubTypeDesignIndustri = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    await SubTypeDesigns.update({ title: title }, { where: { id: id } });
    res.status(200).json({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil diperbarui",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updateIndustrialDesign = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { titleDesign, type, typeDesignId, subtypeDesignId, claim } =
      req.body;

    const industrialDesign = await IndustrialDesigns.findByPk(id);
    if (!industrialDesign) {
      return next(new ApiError("Desain Industri tidak ditemukan", 404));
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

    const looksPerspective = req.files.looksPerspective
      ? req.files.looksPerspective[0]
      : null;
    const frontView = req.files.frontView ? req.files.frontView[0] : null;
    const backView = req.files.backView ? req.files.backView[0] : null;
    const rightSideView = req.files.rightSideView
      ? req.files.rightSideView[0]
      : null;
    const lefttSideView = req.files.lefttSideView
      ? req.files.lefttSideView[0]
      : null;
    const topView = req.files.topView ? req.files.topView[0] : null;
    const downView = req.files.downView ? req.files.downView[0] : null;
    const moreImages = req.files.moreImages ? req.files.moreImages[0] : null;
    const letterTransferDesignRights = req.files.letterTransferDesignRights
      ? req.files.letterTransferDesignRights[0]
      : null;
    const designOwnershipLetter = req.files.designOwnershipLetter
      ? req.files.designOwnershipLetter[0]
      : null;

    if (looksPerspective)
      removeOldFile(industrialDesign.looksPerspective, "image");
    if (frontView) removeOldFile(industrialDesign.frontView, "image");
    if (backView) removeOldFile(industrialDesign.backView, "image");
    if (rightSideView) removeOldFile(industrialDesign.rightSideView, "image");
    if (lefttSideView) removeOldFile(industrialDesign.lefttSideView, "image");
    if (topView) removeOldFile(industrialDesign.topView, "image");
    if (downView) removeOldFile(industrialDesign.downView, "image");
    if (moreImages) removeOldFile(industrialDesign.moreImages);
    if (letterTransferDesignRights)
      removeOldFile(industrialDesign.letterTransferDesignRights);
    if (designOwnershipLetter)
      removeOldFile(industrialDesign.designOwnershipLetter);

    await industrialDesign.update({
      titleDesign: titleDesign,
      type: type,
      typeDesignId: typeDesignId,
      subtypeDesignId: subtypeDesignId,
      claim: claim,
      looksPerspective: looksPerspective?.filename || null,
      frontView: frontView?.filename || null,
      backView: backView?.filename || null,
      rightSideView: rightSideView?.filename || null,
      lefttSideView: lefttSideView?.filename || null,
      topView: topView?.filename || null,
      downView: downView?.filename || null,
      moreImages: moreImages?.filename || null,
      letterTransferDesignRights: letterTransferDesignRights?.filename || null,
      designOwnershipLetter: designOwnershipLetter?.filename || null,
    });

    res.status(200).json({
      status: "success",
      message: "Desain Industri berhasil diperbarui",
      industrialDesign,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const deleteTypeDesignIndustri = async (req, res, next) => {
  try {
    const { id } = req.params;

    const typeDesign = await TypeDesigns.findByPk(id);
    if (!typeDesign) {
      return next(
        new ApiError("Kategori Desain Industri tidak ditemukan", 404)
      );
    }

    await SubTypeDesigns.destroy({
      where: { typeDesignId: id },
    });

    await TypeDesigns.destroy({
      where: { id: id },
    });

    res.status(200).json({
      status: "success",
      message:
        "Kategori Desain Industri dan semua subkategori berhasil dihapus",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const deleteSubTypeDesignIndustri = async (req, res, next) => {
  try {
    const { id } = req.params;

    const subTypeCreation = await SubTypeDesigns.findByPk(id);
    if (!subTypeCreation) {
      return next(
        new ApiError("Sub Kategori Desain Industri tidak ditemukan", 404)
      );
    }

    await subTypeCreation.destroy();
    res.status(200).json({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil dihapus",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  createTypeDesignIndustri,
  createSubTypeDesignIndustri,
  createDesignIndustri,
  getAllTypeDesignIndustri,
  getSubTypeDesignIndustri,
  updateTypeDesignIndustri,
  updateSubTypeDesignIndustri,
  updateIndustrialDesign,
  deleteTypeDesignIndustri,
  deleteSubTypeDesignIndustri,
};
