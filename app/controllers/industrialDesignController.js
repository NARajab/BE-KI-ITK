const {
  UserSubmissions,
  Submissions,
  IndustrialDesigns,
  PersonalDatas,
  TypeDesigns,
  SubTypeDesigns,
  Progresses,
  Users,
} = require("../models");
const fs = require("fs");
const path = require("path");

const logActivity = require("../helpers/activityLogs");
const ApiError = require("../../utils/apiError");
const SendEmail = require("../../emails/services/sendMail");
const IndustrialDesignSubmissionMail = require("../../emails/templates/industrialDesignSubmissionMail");

const createTypeDesignIndustri = async (req, res, next) => {
  try {
    const { title } = req.body;

    await TypeDesigns.create({ title: title });

    await logActivity({
      userId: req.user.id,
      action: "Menambah Kategori Desain Industri",
      description: `${req.user.fullname} berhasil menambah kategori desain industri.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

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

    await logActivity({
      userId: req.user.id,
      action: "Menambah Sub Kategori Desain Industri",
      description: `${req.user.fullname} berhasil menambah sub kategori desain industri.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

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
      centralStatus: "Draft",
    });

    await Progresses.create({
      userSubmissionId: userSubmissions.id,
      status: "Pending",
      createdBy: req.user.fullname,
    });

    const admins = await Users.findAll({ where: { role: "admin" } });
    const adminEmails = admins.map((admin) => admin.email);

    await SendEmail({
      to: adminEmails,
      subject: "Pengajuan Desain Industri Baru",
      html: IndustrialDesignSubmissionMail({
        fullname: req.user.fullname,
        email: req.user.email,
        type: "create",
      }),
    });

    await logActivity({
      userId: req.user.id,
      action: "Menambah Pengajuan Desain Industri",
      description: `${req.user.fullname} berhasil menambah pengajuan desain industri.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
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

    const { count, rows: typeDesigns } = await TypeDesigns.findAndCountAll({
      limit: limit,
      offset: (page - 1) * limit,
    });

    res.status(200).json({
      status: "success",
      message: "Kategori Desain Industri berhasil ditemukan",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      limit: limit,
      typeDesigns,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllTypeDesignIndustriWtoPagination = async (req, res, next) => {
  try {
    const typeDesigns = await TypeDesigns.findAll();
    res.status(200).json({
      status: "success",
      message: "Kategori Desain Industri berhasil ditemukan",
      typeDesigns,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getTypeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const typeDesign = await TypeDesigns.findByPk(id);
    if (!typeDesign) {
      return next(
        new ApiError("Kategori Desain Industri tidak ditemukan", 404)
      );
    }
    res.status(200).json({
      status: "success",
      message: "Kategori Desain Industri berhasil ditemukan",
      typeDesign,
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

    const { count, rows: subTypeDesign } = await SubTypeDesigns.findAndCountAll(
      {
        where: { typeDesignId: id },
        limit: limit,
        offset: (page - 1) * limit,
      }
    );
    res.status(200).json({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil ditemukan",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      limit: limit,
      subTypeDesign,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getSubTypeDesignIndustriWtoPagination = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(
        new ApiError("Sub Kategori Desain Industri tidak ditemukan", 404)
      );
    }

    const subTypeDesign = await SubTypeDesigns.findAll({
      where: { typeDesignId: id },
    });
    res.status(200).json({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil ditemukan",
      subTypeDesign,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getSubTypeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const subTypeDesign = await SubTypeDesigns.findByPk(id);
    if (!subTypeDesign) {
      return next(
        new ApiError("Sub Kategori Desain Industri tidak ditemukan", 404)
      );
    }

    res.status(200).json({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil ditemukan",
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

    await logActivity({
      userId: req.user.id,
      action: "Mengubah Kategori Desain Industri",
      description: `${req.user.fullname} berhasil mengubah kategori desain industri.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

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

    await logActivity({
      userId: req.user.id,
      action: "Mengubah Sub Kategori Desain Industri",
      description: `${req.user.fullname} berhasil mengubah sub kategori desain industri.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

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

    const submission = await Submissions.findOne({
      where: { industrialDesignId: id },
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

    const claimArray = typeof claim === "string" ? JSON.parse(claim) : claim;

    await industrialDesign.update({
      titleDesign: titleDesign,
      type: type,
      typeDesignId: typeDesignId,
      subtypeDesignId: subtypeDesignId,
      claim: claimArray,
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
      subject: "Pembaruan Pengajuan Desain Industri",
      html: IndustrialDesignSubmissionMail({
        fullname: req.user.fullname,
        email: req.user.email,
        type: "update",
      }),
    });

    await logActivity({
      userId: req.user.id,
      action: "Melengkapi Data Pengajuan Desain Industri",
      description: `${req.user.fullname} berhasil melengkapi data pengajuan desain industri.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
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

const restoreTypeDesignIndustri = async (req, res, next) => {
  try {
    const { id } = req.params;

    const typeDesign = await TypeDesigns.findByPk(id, { paranoid: false });
    if (!typeDesign) {
      return next(
        new ApiError("Kategori Desain Industri tidak ditemukan", 404)
      );
    }

    if (typeDesign.deletedAt) {
      await typeDesign.restore();
    }

    const subTypes = await SubTypeDesigns.findAll({
      where: { typeDesignId: id },
      paranoid: false,
    });

    await Promise.all(
      subTypes.filter((sub) => sub.deletedAt).map((sub) => sub.restore())
    );

    await logActivity({
      userId: req.user.id,
      action: "Restore Kategori Desain Industri",
      description: `${req.user.fullname} berhasil merestore kategori desain industri dan subkategorinya.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message:
        "Kategori Desain Industri dan semua subkategori berhasil direstore",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const restoreSubTypeDesignIndustri = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Cari data termasuk yang sudah dihapus (paranoid: false)
    const subType = await SubTypeDesigns.findByPk(id, { paranoid: false });

    if (!subType) {
      return next(
        new ApiError("Sub Kategori Desain Industri tidak ditemukan", 404)
      );
    }

    // Jika sudah dihapus (soft delete), baru restore
    if (subType.deletedAt) {
      await subType.restore();
    }

    await logActivity({
      userId: req.user.id,
      action: "Restore Sub Kategori Desain Industri",
      description: `${req.user.fullname} berhasil merestore sub kategori desain industri.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Sub Kategori Desain Industri berhasil direstore",
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

    const subTypes = await SubTypeDesigns.findAll({
      where: { typeDesignId: id },
    });

    await Promise.all(subTypes.map((sub) => sub.destroy()));
    await typeDesign.destroy();

    await logActivity({
      userId: req.user.id,
      action: "Menghapus Kategori Desain Industri",
      description: `${req.user.fullname} berhasil menghapus kategori desain industri.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
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

    await logActivity({
      userId: req.user.id,
      action: "Menghapus Sub Kategori Desain Industri",
      description: `${req.user.fullname} berhasil menghapus sub kategori desain industri.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

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
  getAllTypeDesignIndustriWtoPagination,
  getTypeById,
  getSubTypeDesignIndustri,
  getSubTypeDesignIndustriWtoPagination,
  getSubTypeById,
  updateTypeDesignIndustri,
  updateSubTypeDesignIndustri,
  updateIndustrialDesign,
  restoreTypeDesignIndustri,
  restoreSubTypeDesignIndustri,
  deleteTypeDesignIndustri,
  deleteSubTypeDesignIndustri,
};
