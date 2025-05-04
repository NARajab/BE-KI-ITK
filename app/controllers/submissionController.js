const {
  UserSubmissions,
  Submissions,
  SubmissionTypes,
  PersonalDatas,
} = require("../models");

const { Op } = require("sequelize");

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
    let limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

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

    const formatted = submission.flatMap((userSubmission) => {
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

    res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalSubmissions: count,
      submissions: formatted,
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
  deleteSubmissionType,
};
