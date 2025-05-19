const {
  sequelize,
  UserSubmissions,
  Submissions,
  TermsConditions,
  SubmissionTerms,
  Progresses,
  Periods,
  Groups,
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
  Payments,
  Faqs,
  Documents,
} = require("../models");
const { Op } = require("sequelize");
const moment = require("moment");

const logActivity = require("../helpers/activityLogs");
const sendNotification = require("../helpers/notifications");
const SendEmail = require("../../emails/services/sendMail");
const progressSubmissionMail = require("../../emails/templates/progressSubmissionMail");
const statusSubmissionMail = require("../../emails/templates/statusSubmissionMail");
const ApiError = require("../../utils/apiError");

const updateSubmissionScheme = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { periodId, groupId, submissionScheme, termsConditionId } = req.body;

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

    if (submissionScheme === "Pendanaan" && Array.isArray(termsConditionId)) {
      const submissionTermsData = termsConditionId.map((termId) => ({
        submissionId: submission.id,
        termsConditionId: termId,
      }));

      await SubmissionTerms.bulkCreate(submissionTermsData);
    }

    submission.periodId = periodId;
    submission.groupId = groupId;
    submission.submissionScheme = submissionScheme;
    await submission.save();

    if (submissionScheme === "Pendanaan") {
      let quotaTitle = null;

      if (submission.copyrightId) quotaTitle = "Hak Cipta";
      else if (submission.patentId) quotaTitle = "Patent";
      else if (submission.brandId) quotaTitle = "Merek";
      else if (submission.industrialDesignId) quotaTitle = "Desain Industri";

      if (quotaTitle) {
        const quota = await Quotas.findOne({
          where: {
            groupId: groupId,
            title: quotaTitle,
          },
        });

        if (quota && quota.remainingQuota > 0) {
          await Quotas.update(
            { remainingQuota: quota.remainingQuota - 1 },
            { where: { id: quota.id } }
          );
        } else {
          throw new Error("Kuota tidak tersedia atau sudah habis.");
        }
      }
    }
    if (submissionScheme === "Mandiri") {
      const existingPayment = await Payments.findOne({
        where: {
          userId: req.user.id,
          submissionId: submission.id,
        },
      });

      if (!existingPayment) {
        await Payments.create({
          userId: req.user.id,
          submissionId: submission.id,
          paymentStatus: false,
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
    const certificateFile = req.files?.certificateFile || null;

    const userSubmission = await UserSubmissions.findOne({
      where: { id },
    });

    if (!userSubmission) {
      return res.status(404).json({
        status: "error",
        message: "UserSubmission tidak ditemukan",
      });
    }

    const newProgress = await Progresses.create({
      userSubmissionId: id,
      status: reviewStatus,
      isStatus: certificateFile ? true : false,
      comment: comments,
      createdBy: req.user.fullname,
      certificateFile: certificateFile?.[0]?.filename,
    });

    await UserSubmissions.update(
      {
        progressId: newProgress.id,
      },
      { where: { id } }
    );

    if (req.body.billingCode) {
      await Payments.update(
        { billingCode: req.body.billingCode },
        {
          where: {
            userId: userSubmission.userId,
            submissionId: userSubmission.submissionId,
          },
        }
      );
      await Progresses.update(
        { isStatus: false },
        { where: { id: newProgress.id } }
      );
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = fileNames[i] || file.originalname;
      await RevisionFiles.create({
        progressId: newProgress.id,
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

    await sendNotification(
      user.id,
      "Progress Pengajuan",
      `Progress Pengajuan anda telah berubah menjadi ${reviewStatus}`
    );

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

    await sendNotification(
      user.id,
      "Status Pengajuan",
      `Status Pengajuan anda telah berubah menjadi ${centralStatus}`
    );

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
        distinct: true,
        limit,
        offset,
        order: [["id", "ASC"]],
        include: [
          {
            model: Users,
            as: "user",
          },
          {
            model: Users,
            as: "reviewer",
          },
          {
            model: Progresses,
            as: "progress",
            include: [
              {
                model: RevisionFiles,
                as: "revisionFile",
              },
            ],
          },
          {
            model: Submissions,
            as: "submission",
            include: [
              {
                model: Periods,
                as: "period",
              },
              {
                model: Groups,
                as: "group",
              },
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
                model: TermsConditions,
                as: "termsConditions",
                through: { attributes: [] },
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
        order: [["id", "ASC"]],
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
          model: Users,
          as: "reviewer",
        },
        {
          model: Progresses,
          as: "progress",
          limit: 1,
          order: [["id", "DESC"]],
          include: [
            {
              model: RevisionFiles,
              as: "revisionFile",
            },
          ],
        },
        {
          model: Submissions,
          as: "submission",
          include: [
            {
              model: Periods,
              as: "period",
            },
            {
              model: Payments,
              as: "payment",
            },
            {
              model: Groups,
              as: "group",
            },
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
              model: TermsConditions,
              as: "termsConditions",
              through: { attributes: [] },
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
      order: [["id", "ASC"]],
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

    const currentYear = new Date().getFullYear();

    const { count, rows } = await UserSubmissions.findAndCountAll({
      distinct: true,
      limit,
      offset,
      where: {
        createdAt: {
          [Op.gte]: new Date(`${currentYear}-01-01`),
          [Op.lt]: new Date(`${currentYear + 1}-01-01`),
        },
      },
      include: [
        {
          model: Users,
          as: "user",
        },
        {
          model: Users,
          as: "reviewer",
        },
        {
          model: Progresses,
          as: "progress",
          separate: true,
          limit: 1,
          order: [["id", "DESC"]],
          include: [
            {
              model: RevisionFiles,
              as: "revisionFile",
            },
          ],
        },
        {
          model: Submissions,
          as: "submission",
          where: {
            submissionTypeId: id,
          },
          include: [
            {
              model: Periods,
              as: "period",
            },
            {
              model: Payments,
              as: "payment",
            },
            {
              model: Groups,
              as: "group",
            },
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
              model: TermsConditions,
              as: "termsConditions",
              through: { attributes: [] },
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
      order: [["id", "ASC"]],
    });

    const userSubmissions = rows.map((item) => ({
      ...item.toJSON(),
      reviewerId: item.reviewerId === null ? "-" : item.reviewerId,
    }));
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
          model: Progresses,
          as: "progress",
          separate: true,
          order: [["id", "DESC"]],
          include: [
            {
              model: RevisionFiles,
              as: "revisionFile",
            },
          ],
        },
        {
          model: Submissions,
          as: "submission",
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

const getAllProgress = async (req, res, next) => {
  try {
    const progress = await Progresses.findAll();

    res.status(200).json({
      status: "success",
      progress,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getSubmissionsByReviewerId = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    const offset = (page - 1) * limit;

    const { count, rows: userSubmissions } =
      await UserSubmissions.findAndCountAll({
        distinct: true,
        limit,
        offset,
        where: { reviewerId: req.user.id },
        include: [
          {
            model: Users,
            as: "user",
          },
          {
            model: Users,
            as: "reviewer",
          },
          {
            model: Progresses,
            as: "progress",
            separate: true,
            order: [["id", "DESC"]],
            include: [
              {
                model: RevisionFiles,
                as: "revisionFile",
              },
            ],
          },
          {
            model: Submissions,
            as: "submission",
            include: [
              {
                model: Periods,
                as: "period",
              },
              {
                model: Groups,
                as: "group",
              },
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
                model: TermsConditions,
                as: "termsConditions",
                through: { attributes: [] },
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
        order: [["id", "DESC"]],
      });

    res.status(200).json({
      status: "success",
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

const getSubmissionsByUserId = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    const offset = (page - 1) * limit;

    const submissionTypeIdParam = req.query.submissionTypeId;
    const submissionTypeIds = submissionTypeIdParam
      ? submissionTypeIdParam.split(",").map((id) => parseInt(id))
      : null;

    const { count, rows: userSubmissions } =
      await UserSubmissions.findAndCountAll({
        distinct: true,
        limit,
        offset,
        where: {
          userId: req.user.id,
        },
        include: [
          {
            model: Users,
            as: "user",
          },
          {
            model: Users,
            as: "reviewer",
          },
          {
            model: Progresses,
            as: "progress",
            separate: true,
            order: [["id", "DESC"]],
            include: [
              {
                model: RevisionFiles,
                as: "revisionFile",
              },
            ],
          },
          {
            model: Submissions,
            as: "submission",
            where: submissionTypeIds
              ? {
                  submissionTypeId: {
                    [Op.in]: submissionTypeIds,
                  },
                }
              : undefined,
            include: [
              {
                model: Periods,
                as: "period",
              },
              { model: Payments, as: "payment" },
              {
                model: Groups,
                as: "group",
              },
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
                model: TermsConditions,
                as: "termsConditions",
                through: { attributes: [] },
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
        order: [["id", "ASC"]],
      });

    const userSubmissionsSorted = userSubmissions.sort((a, b) => {
      const aUpdatedAt = new Date(
        Math.max(
          new Date(a.updatedAt).getTime(),
          new Date(a.submission?.updatedAt || 0).getTime(),
          ...(a.progress || []).map((p) => new Date(p.updatedAt).getTime())
        )
      );

      const bUpdatedAt = new Date(
        Math.max(
          new Date(b.updatedAt).getTime(),
          new Date(b.submission?.updatedAt || 0).getTime(),
          ...(b.progress || []).map((p) => new Date(p.updatedAt).getTime())
        )
      );

      return bUpdatedAt - aUpdatedAt;
    });

    res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalUserSubmissions: count,
      limit: limit,
      userSubmissionsSorted,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAdminDashboard = async (req, res, next) => {
  try {
    const [totalHakCipta, totalPaten, totalMerek, totalDesainIndustri] =
      await Promise.all([
        Copyrights.count(),
        Patents.count(),
        Brands.count(),
        IndustrialDesigns.count(),
      ]);

    const [totalPendanaan, totalMandiri] = await Promise.all([
      Submissions.count({ where: { submissionScheme: "pendanaan" } }),
      Submissions.count({ where: { submissionScheme: "mandiri" } }),
    ]);

    const [totalFaq, totalDocuments] = await Promise.all([
      Faqs.count(),
      Documents.count(),
    ]);

    const recentSubmissions = await UserSubmissions.findAll({
      limit: 5,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Users,
          as: "user",
          attributes: ["fullname"],
        },
        {
          model: Submissions,
          as: "submission",
          include: [
            {
              model: SubmissionTypes,
              as: "submissionType",
              attributes: ["title"],
            },
          ],
        },
        {
          model: Progresses,
          as: "progress",
          attributes: ["status"],
        },
      ],
    });

    const formattedRecent = recentSubmissions.map((item) => ({
      id: item.id,
      namaPengguna: item.user?.fullname || "-",
      jenisPengajuan: item.submission?.submissionType?.title || "-",
      pendanaan: item.submission?.submissionScheme || "-",
      progres: item.progress?.status || "-",
      waktuPengajuan: moment(item.createdAt).format("DD MMMM YYYY"),
    }));

    const currentYear = new Date().getFullYear();

    // Grafik Pengajuan Berdasarkan Gelombang (per bulan di tahun berjalan)
    const getMonthlyCount = async (Model) => {
      const counts = await Promise.all(
        Array.from({ length: 12 }, (_, i) => {
          const start = new Date(currentYear, i, 1);
          const end = new Date(currentYear, i + 1, 1);
          return Model.count({
            where: {
              createdAt: {
                [Op.gte]: start,
                [Op.lt]: end,
              },
            },
          });
        })
      );
      return counts;
    };

    const [hakCiptaMonthly, patenMonthly, merekMonthly, desainIndustriMonthly] =
      await Promise.all([
        getMonthlyCount(Copyrights),
        getMonthlyCount(Patents),
        getMonthlyCount(Brands),
        getMonthlyCount(IndustrialDesigns),
      ]);

    // Grafik Pengajuan Berdasarkan Tahun (5 tahun terakhir)
    const startYear = currentYear - 4;

    const getYearlyCount = async (Model) => {
      const counts = await Promise.all(
        Array.from({ length: 5 }, (_, i) => {
          const year = startYear + i;
          const start = new Date(year, 0, 1);
          const end = new Date(year + 1, 0, 1);
          return Model.count({
            where: {
              createdAt: {
                [Op.gte]: start,
                [Op.lt]: end,
              },
            },
          });
        })
      );
      return counts;
    };

    const [hakCiptaYearly, patenYearly, merekYearly, desainIndustriYearly] =
      await Promise.all([
        getYearlyCount(Copyrights),
        getYearlyCount(Patents),
        getYearlyCount(Brands),
        getYearlyCount(IndustrialDesigns),
      ]);

    res.status(200).json({
      totalPengajuan: {
        hakCipta: totalHakCipta,
        paten: totalPaten,
        merek: totalMerek,
        desainIndustri: totalDesainIndustri,
      },
      totalPendanaan: {
        pendanaan: totalPendanaan,
        mandiri: totalMandiri,
      },
      faq: totalFaq,
      unduhan: totalDocuments,
      pengajuanTerakhir: formattedRecent,

      berdasarkanGelombang: {
        labels: [
          "Januari",
          "Februari",
          "Maret",
          "April",
          "Mei",
          "Juni",
          "Juli",
          "Agustus",
          "September",
          "Oktober",
          "November",
          "Desember",
        ],
        data: {
          hakCipta: hakCiptaMonthly,
          paten: patenMonthly,
          merek: merekMonthly,
          desainIndustri: desainIndustriMonthly,
        },
      },
      berdasarkanTahun: {
        labels: Array.from(
          { length: 5 },
          (_, i) => `${currentYear - i}`
        ).reverse(),

        data: {
          hakCipta: hakCiptaYearly,
          paten: patenYearly,
          merek: merekYearly,
          desainIndustri: desainIndustriYearly,
        },
      },
    });
  } catch (error) {
    next(new ApiError(error.message, 500));
  }
};

const restoreUserSubmission = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const userSubmission = await UserSubmissions.findByPk(id, {
      paranoid: false,
      include: [
        {
          model: Submissions,
          as: "submission",
          paranoid: false,
        },
        {
          model: Progresses,
          as: "progress",
          paranoid: false,
        },
      ],
      transaction,
    });

    if (!userSubmission) {
      await transaction.rollback();
      return next(new ApiError("UserSubmission tidak ditemukan", 404));
    }

    const submission = userSubmission.submission;
    const submissionId = submission.id;

    const { copyrightId, patentId, brandId, industrialDesignId } = submission;

    // Restore user submission
    await userSubmission.restore({ transaction });

    // Restore submission
    await Submissions.restore({ where: { id: submissionId }, transaction });

    // Restore progresses
    await Progresses.restore({
      where: { userSubmissionId: id },
      transaction,
    });

    // Restore personal datas
    await PersonalDatas.restore({
      where: { submissionId },
      transaction,
    });

    // Restore revision files
    const progressIds = userSubmission.progress.map((p) => p.id);
    if (progressIds.length > 0) {
      await RevisionFiles.restore({
        where: { progressId: progressIds },
        transaction,
      });
    }

    // Restore termsConditions relationship
    if (submission.termsConditions?.length > 0) {
      const termIds = submission.termsConditions.map((t) => t.id);
      await submission.setTermsConditions(termIds, { transaction });
    }

    // Restore related hak kekayaan intelektual
    if (copyrightId) {
      await Copyrights.restore({ where: { id: copyrightId }, transaction });
    }
    if (patentId) {
      await Patents.restore({ where: { id: patentId }, transaction });
    }
    if (brandId) {
      await Brands.restore({ where: { id: brandId }, transaction });
    }
    if (industrialDesignId) {
      await IndustrialDesigns.restore({
        where: { id: industrialDesignId },
        transaction,
      });
    }

    await logActivity({
      userId: req.user.id,
      action: "Restore Pengajuan",
      description: `UserSubmission ID ${id} dan data terkait berhasil direstore`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    await transaction.commit();

    return res.status(200).json({
      status: "success",
      message: "UserSubmission dan seluruh data terkait berhasil direstore",
    });
  } catch (err) {
    await transaction.rollback();
    next(new ApiError(err.message, 500));
  }
};

const deleteUserSubmission = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const userSubmission = await UserSubmissions.findByPk(id, {
      include: [
        { model: Progresses, as: "progress" },
        {
          model: Submissions,
          as: "submission",
          include: ["termsConditions", "personalDatas"],
        },
      ],
      transaction,
    });

    if (!userSubmission) {
      await transaction.rollback();
      return next(new ApiError("UserSubmission tidak ditemukan", 404));
    }

    const submission = userSubmission.submission;
    const submissionId = submission.id;

    const { copyrightId, patentId, brandId, industrialDesignId } = submission;

    const progressIds = userSubmission.progress.map((p) => p.id);

    if (progressIds.length > 0) {
      await RevisionFiles.destroy({
        where: { progressId: progressIds },
        transaction,
      });
    }

    await Progresses.destroy({
      where: { userSubmissionId: id },
      transaction,
    });

    await PersonalDatas.destroy({
      where: { submissionId },
      transaction,
    });

    if (submission.termsConditions.length > 0) {
      await submission.setTermsConditions([], { transaction });
    }

    await UserSubmissions.destroy({
      where: { id },
      transaction,
    });

    await Submissions.destroy({
      where: { id: submissionId },
      transaction,
    });

    if (copyrightId) {
      await Copyrights.destroy({ where: { id: copyrightId }, transaction });
    }
    if (patentId) {
      await Patents.destroy({ where: { id: patentId }, transaction });
    }
    if (brandId) {
      await Brands.destroy({ where: { id: brandId }, transaction });
    }
    if (industrialDesignId) {
      await IndustrialDesigns.destroy({
        where: { id: industrialDesignId },
        transaction,
      });
    }

    await logActivity({
      userId: req.user.id,
      action: "Menghapus Pengajuan",
      description: `UserSubmission ID ${id}, submission ID ${submissionId}, dan data terkait berhasil dihapus`,
      device: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    await transaction.commit();

    return res.status(200).json({
      status: "success",
      message: "UserSubmission dan seluruh data terkait berhasil dihapus",
    });
  } catch (err) {
    await transaction.rollback();
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
  getAllProgress,
  getSubmissionsByReviewerId,
  getSubmissionsByUserId,
  getAdminDashboard,
  restoreUserSubmission,
  deleteUserSubmission,
};
