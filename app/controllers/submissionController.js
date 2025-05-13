const {
  UserSubmissions,
  Submissions,
  SubmissionTypes,
  PersonalDatas,
  Patents,
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
      waktuPengajuan,
    } = req.query;

    const submissionWhere = {};
    const userSubmissionWhere = {};

    if (skemaPengajuan) {
      submissionWhere.submissionScheme = { [Op.iLike]: `%${skemaPengajuan}%` };
    }

    if (progressPengajuan) {
      userSubmissionWhere.reviewStatus = {
        [Op.iLike]: `%${progressPengajuan}%`,
      };
    }

    if (waktuPengajuan) {
      const tanggal = new Date(waktuPengajuan);
      const nextTanggal = new Date(tanggal);
      nextTanggal.setDate(nextTanggal.getDate() + 1);

      submissionWhere.createdAt = {
        [Op.gte]: tanggal,
        [Op.lt]: nextTanggal,
      };
    }

    const { count, rows: submission } = await UserSubmissions.findAndCountAll({
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
          namaPengguna: personalData.name || "-",
          jenisPengajuan: submission.submissionType?.title || "-",
          skemaPengajuan: submission.submissionScheme || "-",
          progressPengajuan: userSubmission.reviewStatus || "-",
          peran: personalData.isLeader ? "Ketua" : "Anggota",
          waktuPengajuan: submission.createdAt,
        }));
      });
    }

    res.status(200).json({
      status: "success",
      currentPage: isExport ? undefined : page,
      totalPages: isExport ? undefined : Math.ceil(count / limit),
      totalSubmissions: count,
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

    for (let i = 0; i < parsedPersonalDatas.length; i++) {
      const data = parsedPersonalDatas[i];
      const ktpFile = ktpFiles[i]?.filename;

      if (data.id) {
        const existingData = await PersonalDatas.findByPk(data.id);
        if (existingData) {
          if (ktpFile && existingData.ktp) {
            const oldFilePath = path.join(
              __dirname,
              "../../uploads/image/",
              existingData.ktp
            );
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
            }
          }

          await existingData.update({
            ...data,
            ktp: ktpFile || existingData.ktp,
          });
        }
      } else {
        await PersonalDatas.create({
          ...data,
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

      if (data.id) {
        const existingData = await PersonalDatas.findByPk(data.id);
        if (existingData) {
          if (ktpFile && existingData.ktp) {
            const oldFilePath = path.join(
              __dirname,
              "../../uploads/image/",
              existingData.ktp
            );
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
            }
          }

          await existingData.update({
            ...data,
            ktp: ktpFile || existingData.ktp,
          });
        }
      } else {
        await PersonalDatas.create({
          ...data,
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

      if (data.id) {
        const existingData = await PersonalDatas.findByPk(data.id);
        if (existingData) {
          if (ktpFile && existingData.ktp) {
            const oldFilePath = path.join(
              __dirname,
              "../../uploads/image/",
              existingData.ktp
            );
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
            }
          }

          await existingData.update({
            ...data,
            ktp: ktpFile || existingData.ktp,
          });
        }
      } else {
        await PersonalDatas.create({
          ...data,
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

const deleteSubmissionType = async (req, res, next) => {
  try {
    const { id } = req.params;

    const type = await SubmissionTypes.findByPk(id);

    if (!type) {
      return next(new ApiError("Jenis pengajuan tidak ditemukan", 404));
    }

    await SubmissionTypes.destroy({ where: { id } });

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
  updatePersonalDataPaten,
  updatePersonalDataDesignIndustri,
  deleteSubmissionType,
};
