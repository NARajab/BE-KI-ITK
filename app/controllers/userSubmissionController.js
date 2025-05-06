const {
  UserSubmissions,
  Submissions,
  Quotas,
  Copyrights,
  TypeCreations,
  SubTypeCreations,
  Patents,
  PatentTypes,
  Brands,
  IndustrialDesigns,
  TypeDesigns,
  SubTypeDesigns,
  AdditionalDatas,
  PersonalDatas,
  Users,
  RevisionFiles,
  SubmissionTypes,
} = require("../models");

const logActivity = require("../helpers/activityLogs");
const SendEmail = require("../../emails/services/sendMail");
const progressSubmissionMail = require("../../emails/templates/progressSubmissionMail");
const statusSubmissionMail = require("../../emails/templates/statusSubmissionMail");
const ApiError = require("../../utils/apiError");

const updateSubmissionScheme = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { groupId, submissionScheme } = req.body;

    const userSubmission = await UserSubmissions.findOne({
      where: { id },
    });

    if (!userSubmission) {
      return next(new ApiError("UserSubmission tidak ditemukan", 404));
    }

    const submission = await Submissions.findOne({
      where: { id: userSubmission.submissionId },
    });

    if (!submission) {
      return next(new ApiError("Submission tidak ditemukan", 404));
    }

    submission.periodId = groupId;
    submission.submissionScheme = submissionScheme;
    await submission.save();

    if (submissionScheme === "pendanaan") {
      const fieldToDecrement = submission.copyrightId
        ? "remainingCopyrightQuota"
        : submission.patentId
        ? "remainingPatentQuota"
        : submission.brandId
        ? "remainingBrandQuota"
        : submission.industrialDesignId
        ? "remainingIndustrialDesignQuota"
        : null;

      if (fieldToDecrement) {
        await Quotas.decrement(fieldToDecrement, {
          by: 1,
          where: { groupId: groupId },
        });
      }
    }

    await logActivity({
      userId: req.user.id,
      action: "Memilih Skema Pengajuan",
      description: `${req.user.fullname} berhasil memilih skema pengajuan.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    return res.status(200).json({
      status: "success",
      message: "SubmissionScheme berhasil diupdate",
      submission,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updateSubmissionProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reviewStatus, comments } = req.body;

    const fileNames = JSON.parse(req.body.fileNames || "[]");
    const files = req.files?.files || [];

    const userSubmission = await UserSubmissions.findOne({
      where: { id },
    });

    if (!userSubmission) {
      return res.status(404).json({
        status: "error",
        message: "UserSubmission tidak ditemukan",
      });
    }

    await userSubmission.update({ reviewStatus });

    await Submissions.update(
      {
        comments,
      },
      { where: { id: userSubmission.submissionId } }
    );

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = fileNames[i] || file.originalname;
      await RevisionFiles.create({
        submissionId: userSubmission.submissionId,
        fileName: fileName,
        file: file.filename,
      });
    }

    await logActivity({
      userId: req.user.id,
      action: "Mengubah Progress Pengajuan",
      description: `${req.user.fullname} berhasil mengubah progress pengajuan.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    const user = await Users.findOne({
      where: { id: userSubmission.userId },
    });

    await SendEmail({
      to: user.email,
      subject: "Update Progress Pengajuan",
      html: progressSubmissionMail({
        fullname: user.fullname,
        progress: reviewStatus,
        updatedAt: new Date(),
      }),
    });

    res.status(200).json({
      status: "success",
      message: "SubmissionProgress berhasil diupdate",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { centralStatus } = req.body;

    const userSubmission = await UserSubmissions.findOne({
      where: { id },
    });

    if (!userSubmission) {
      return res.status(404).json({
        status: "error",
        message: "UserSubmission tidak ditemukan",
      });
    }

    await userSubmission.update({ centralStatus });

    await logActivity({
      userId: req.user.id,
      action: "Mengubah Status Pengajuan",
      description: `${req.user.fullname} berhasil mengubah status pengajuan.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    const user = await Users.findOne({
      where: { id: userSubmission.userId },
    });

    await SendEmail({
      to: user.email,
      subject: "Update Status Pengajuan",
      html: statusSubmissionMail({
        fullname: user.fullname,
        status: centralStatus,
        updatedAt: new Date(),
      }),
    });

    res.status(200).json({
      status: "success",
      message: "Status berhasil diupdate",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const updateReviewer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reviewerId } = req.body;

    const reviewerUser = await Users.findOne({ where: { id: reviewerId } });
    if (!reviewerUser) {
      return res.status(404).json({
        status: "error",
        message: "Reviewer tidak ditemukan",
      });
    }

    if (reviewerUser.role !== "reviewer") {
      return res.status(400).json({
        status: "error",
        message: "User yang dipilih bukan seorang reviewer",
      });
    }

    const userSubmission = await UserSubmissions.findOne({
      where: { id },
    });

    if (!userSubmission) {
      return res.status(404).json({
        status: "error",
        message: "UserSubmission tidak ditemukan",
      });
    }

    await userSubmission.update({ reviewerId });

    await logActivity({
      userId: req.user.id,
      action: "Mengubah Reviewer Pengajuan",
      description: `${req.user.fullname} berhasil mengubah reviewer pengajuan.`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: "success",
      message: "Reviewer berhasil diupdate",
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllUserSubmission = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    const offset = (page - 1) * limit;

    const { count, rows: userSubmissions } =
      await UserSubmissions.findAndCountAll({
        limit,
        offset,
        order: [["id", "ASC"]],
        include: [
          {
            model: Users,
            as: "user",
          },
          {
            model: Submissions,
            as: "submission",
            include: [
              {
                model: Copyrights,
                as: "copyright",
                include: [
                  {
                    model: TypeCreations,
                    as: "typeCreation",
                  },
                  {
                    model: SubTypeCreations,
                    as: "subTypeCreation",
                  },
                ],
              },
              {
                model: Patents,
                as: "patent",
                include: [
                  {
                    model: PatentTypes,
                    as: "patentType",
                  },
                ],
              },
              {
                model: Brands,
                as: "brand",
                include: [{ model: AdditionalDatas, as: "additionalDatas" }],
              },
              {
                model: IndustrialDesigns,
                as: "industrialDesign",
                include: [
                  {
                    model: TypeDesigns,
                    as: "typeDesign",
                  },
                  {
                    model: SubTypeDesigns,
                    as: "subTypeDesign",
                  },
                ],
              },
              {
                model: SubmissionTypes,
                as: "submissionType",
              },
              {
                model: PersonalDatas,
                as: "personalDatas",
              },
            ],
          },
        ],
      });

    return res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalUserSubmissions: count,
      limit: limit,
      userSubmissions,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getUserSubmissionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userSubmission = await UserSubmissions.findOne({
      where: {
        id,
      },
      include: [
        {
          model: Users,
          as: "user",
        },
        {
          model: Submissions,
          as: "submission",
          include: [
            {
              model: Copyrights,
              as: "copyright",
              include: [
                {
                  model: TypeCreations,
                  as: "typeCreation",
                },
                {
                  model: SubTypeCreations,
                  as: "subTypeCreation",
                },
              ],
            },
            {
              model: Patents,
              as: "patent",
              include: [
                {
                  model: PatentTypes,
                  as: "patentType",
                },
              ],
            },
            {
              model: Brands,
              as: "brand",
              include: [{ model: AdditionalDatas, as: "additionalDatas" }],
            },
            {
              model: IndustrialDesigns,
              as: "industrialDesign",
              include: [
                {
                  model: TypeDesigns,
                  as: "typeDesign",
                },
                {
                  model: SubTypeDesigns,
                  as: "subTypeDesign",
                },
              ],
            },
            {
              model: SubmissionTypes,
              as: "submissionType",
            },
            {
              model: PersonalDatas,
              as: "personalDatas",
            },
          ],
        },
      ],
    });
    if (!userSubmission)
      return next(new ApiError("UserSubmission tidak ditemukan", 404));

    return res.status(200).json({
      status: "success",
      userSubmission,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getByIdSubmissionType = async (req, res, next) => {
  try {
    const { id } = req.params;
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    const offset = (page - 1) * limit;

    const { count, rows: userSubmissions } =
      await UserSubmissions.findAndCountAll({
        limit,
        offset,
        order: [["id", "ASC"]],
        include: [
          {
            model: Users,
            as: "user",
          },
          {
            model: Submissions,
            as: "submission",
            where: {
              submissionTypeId: id,
            },
            include: [
              {
                model: Copyrights,
                as: "copyright",
                include: [
                  {
                    model: TypeCreations,
                    as: "typeCreation",
                  },
                  {
                    model: SubTypeCreations,
                    as: "subTypeCreation",
                  },
                ],
              },
              {
                model: Patents,
                as: "patent",
                include: [
                  {
                    model: PatentTypes,
                    as: "patentType",
                  },
                ],
              },
              {
                model: Brands,
                as: "brand",
              },
              {
                model: IndustrialDesigns,
                as: "industrialDesign",
                include: [
                  {
                    model: TypeDesigns,
                    as: "typeDesign",
                  },
                  {
                    model: SubTypeDesigns,
                    as: "subTypeDesign",
                  },
                ],
              },
              {
                model: SubmissionTypes,
                as: "submissionType",
              },
              {
                model: PersonalDatas,
                as: "personalDatas",
              },
            ],
          },
        ],
      });

    if (userSubmissions.length === 0)
      return next(new ApiError("UserSubmissions tidak ditemukan", 404));

    return res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalUserSubmissions: count,
      limit: limit,
      userSubmissions,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getProgressById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const userSubmission = await UserSubmissions.findOne({
      where: { id },
      include: [
        {
          model: Users,
          as: "reviewer",
        },
        {
          model: Submissions,
          as: "submission",
          include: [
            {
              model: RevisionFiles,
              as: "revisionFile",
            },
          ],
        },
      ],
    });

    res.status(200).json({
      status: "success",
      userSubmission,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  updateSubmissionScheme,
  updateSubmissionProgress,
  updateStatus,
  updateReviewer,
  getAllUserSubmission,
  getUserSubmissionById,
  getByIdSubmissionType,
  getProgressById,
};
