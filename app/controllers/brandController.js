const {
  UserSubmissions,
  Submissions,
  Brands,
  Progresses,
  BrandTypes,
  PersonalDatas,
  AdditionalDatas,
  Users,
} = require("../models");
const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");

const logActivity = require("../helpers/activityLogs");
const ApiError = require("../../utils/apiError");
const SendMail = require("../../emails/services/sendMail");
const brandSubmissionMail = require("../../emails/templates/brandSubmissionMail");

const createBrandType = async (req, res, next) => {
  try {
    const { title } = req.body;
    await BrandTypes.create({ title });

    await logActivity({
      userId: req.user.id,
      action: "Menambah Kategori Merek",
      description: `${req.user.fullname} berhasil menambah kategori merek.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    return res.status(201).json({
      status: "success",
      message: "Kategori merek berhasil dibuat",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const createBrand = async (req, res, next) => {
  try {
    const {
      submissionTypeId,
      applicationType,
      brandTypeId,
      referenceName,
      elementColor,
      translate,
      pronunciation,
      disclaimer,
      description,
      documentType,
      information,
      personalDatas,
    } = req.body;

    const labelBrand = req.files?.labelBrand?.[0] || null;
    const fileUploade = req.files?.fileUploade?.[0] || null;
    const signature = req.files?.signature?.[0] || null;
    const InformationLetter = req.files?.InformationLetter?.[0] || null;
    const letterStatment = req.files?.letterStatment?.[0] || null;

    const brand = await Brands.create({
      applicationType,
      brandTypeId,
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
      description: parsedDescriptions[index]?.description || null,
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

    await SendMail({
      to: adminEmails,
      subject: "Pengajuan Merek Baru",
      html: brandSubmissionMail({
        fullname: req.user.fullname,
        email: req.user.email,
        type: "create",
      }),
    });

    await logActivity({
      userId: req.user.id,
      action: "Menambah Pengajuan Merek",
      description: `${req.user.fullname} berhasil menambah pengajuan merek.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
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

const updateBrandType = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { title } = req.body;

    await BrandTypes.update({ title }, { where: { id } });

    return res.status(200).json({
      status: "success",
      message: "Kategori merek berhasil diperbarui",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updateBrand = async (req, res, next) => {
  try {
    const {
      applicationType,
      brandTypeId,
      referenceName,
      elementColor,
      translate,
      pronunciation,
      disclaimer,
      description,
      documentType,
      information,
    } = req.body || {};

    const { id } = req.params;

    const brand = await Brands.findByPk(id);
    if (!brand) {
      return next(new ApiError("Brand tidak ditemukan", 404));
    }

    const submission = await Submissions.findOne({
      where: { brandId: id },
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
      brandTypeId,
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

    const oldAdditionalDatas = await AdditionalDatas.findAll({
      where: { brandId: brand.id },
    });

    for (const data of oldAdditionalDatas) {
      const folderPath =
        data.fileType === "image" ? "uploads/image/" : "uploads/documents/";
      const oldFilePath = path.join(__dirname, "../../", folderPath, data.file);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    await AdditionalDatas.destroy({ where: { brandId: brand.id } });

    const additionalDatas = JSON.parse(req.body.additionalDatas || "[]");
    const newAdditionalDatas = [];

    for (let i = 0; i < additionalDatas.length; i++) {
      const data = additionalDatas[i];
      const file = req.files?.additionalDataFiles?.[i];

      if (file) {
        newAdditionalDatas.push({
          brandId: brand.id,
          description: data.description,
          fileName: file.originalname,
          size: file.size,
          file: file.filename,
          fileType: file.mimetype.startsWith("image/") ? "image" : "documents",
        });
      }
    }

    if (
      additionalDatas.length !== (req.files?.additionalDataFiles?.length || 0)
    ) {
      console.warn("Jumlah data dan file tidak cocok");
    }

    if (newAdditionalDatas.length > 0) {
      await AdditionalDatas.bulkCreate(newAdditionalDatas);
    }

    await Progresses.update(
      { isStatus: true },
      {
        where: { id: progress.id },
      }
    );

    const admins = await Users.findAll({ where: { role: "admin" } });
    const adminEmails = admins.map((admin) => admin.email);

    await SendMail({
      to: adminEmails,
      subject: "Pembaruan Pengajuan Merek",
      html: brandSubmissionMail({
        fullname: req.user.fullname,
        email: req.user.email,
        type: "update",
      }),
    });

    await logActivity({
      userId: req.user.id,
      action: "Melengkapi Data Pengajuan Merek",
      description: `${req.user.fullname} berhasil melengkapi data pengajuan merek.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    return res.status(200).json({
      status: "success",
      message: "Brand berhasil diupdate",
      brand,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllBrandTypes = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const offset = (page - 1) * limit;

    const whereCondition = search
      ? {
          title: {
            [Op.iLike]: `%${search}%`,
          },
        }
      : {};

    const { count, rows: brandTypes } = await BrandTypes.findAndCountAll({
      where: whereCondition,
      limit,
      offset,
      order: [["id", "ASC"]],
    });

    return res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalTypes: count,
      limit: limit,
      brandTypes,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllBrandTypesWtoPagination = async (req, res, next) => {
  try {
    const brandTypes = await BrandTypes.findAll({
      order: [["id", "ASC"]],
    });
    return res.status(200).json({
      status: "success",
      brandTypes,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getByIdBrandType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const brandType = await BrandTypes.findByPk(id);
    if (!brandType) {
      return next(new ApiError("BrandType tidak ditemukan", 404));
    }
    return res.status(200).json({
      status: "success",
      brandType,
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

const createAdditionalDatas = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description } = req.body;
    const newFile = req.files?.newFile?.[0];

    let fileName = null;
    let fileType = null;
    let file = null;
    let size = null;

    if (newFile) {
      fileName = newFile.originalname;
      file = newFile.filename;
      size = newFile.size;
      fileType = newFile.mimetype.startsWith("image/") ? "image" : "documents";
    }

    const additionalData = await AdditionalDatas.create({
      brandId: id,
      description,
      fileName,
      file,
      fileType,
      size,
    });

    await logActivity({
      userId: req.user.id,
      action: "Menambahkan Data Tambahan",
      description: `${req.user.fullname} berhasil menambahkan data tambahan.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    return res.status(201).json({
      status: "success",
      message: "AdditionalData berhasil dibuat",
      additionalData,
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
        fs.unlinkSync(oldFilePath);
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

    await logActivity({
      userId: req.user.id,
      action: "Mengubah Data Tambahan",
      description: `${req.user.fullname} berhasil memperbaharui data tambahan.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    return res.status(200).json({
      status: "success",
      message: "AdditionalData berhasil diperbarui",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const deleteAdditionalData = async (req, res, next) => {
  try {
    const { id } = req.params;

    const additionalData = await AdditionalDatas.findByPk(id);
    if (!additionalData) {
      return next(new ApiError("AdditionalData tidak ditemukan", 404));
    }

    if (additionalData.file) {
      const fileTypePath =
        additionalData.file.endsWith(".pdf") ||
        additionalData.file.endsWith(".docx")
          ? "uploads/documents"
          : "uploads/image";

      const filePath = path.join(
        __dirname,
        "../../",
        fileTypePath,
        additionalData.file
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await additionalData.destroy();

    await logActivity({
      userId: req.user.id,
      action: "Menghapus Data Tambahan",
      description: `${req.user.fullname} berhasil menghapus data tambahan.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    return res.status(200).json({
      status: "success",
      message: "AdditionalData berhasil dihapus",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const restoreBrandType = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Cari termasuk yang sudah soft deleted (paranoid: false)
    const brandType = await BrandTypes.findOne({
      where: { id },
      paranoid: false,
    });

    if (!brandType) {
      return next(new ApiError("Kategori merek tidak ditemukan", 404));
    }

    if (!brandType.deletedAt) {
      return res.status(400).json({
        status: "fail",
        message: "Kategori merek ini tidak dalam status terhapus",
      });
    }

    await brandType.restore();

    await logActivity({
      userId: req.user.id,
      action: "Mengembalikan Kategori Merek",
      description: `${req.user.fullname} berhasil merestore kategori merek.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Kategori brand berhasil dikembalikan",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const deleteBrandType = async (req, res, next) => {
  try {
    const { id } = req.params;

    const brandType = await BrandTypes.findByPk(id);
    if (!brandType) {
      return next(new ApiError("Kategori merek tidak ditemukan", 404));
    }

    await brandType.destroy();

    await logActivity({
      userId: req.user.id,
      action: "Menghapus Kategori Merek",
      description: `${req.user.fullname} berhasil menghapus kategori merek.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    return res.status(200).json({
      status: "success",
      message: "Kategori brand berhasil dihapus",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  createBrand,
  createBrandType,
  updateBrand,
  updateBrandType,
  getAllBrandTypes,
  getAllBrandTypesWtoPagination,
  getByIdBrandType,
  getAllAdditionalDatas,
  createAdditionalDatas,
  updateAdditionalDatas,
  deleteAdditionalData,
  restoreBrandType,
  deleteBrandType,
};
