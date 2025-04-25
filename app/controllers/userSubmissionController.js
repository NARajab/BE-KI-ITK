const {
  UserSubmissions,
  Submissions,
  Periods,
  Copyrights,
  Patents,
  Brands,
  IndustrialDesigns,
  AdditionalDatas,
  PersonalDatas,
  Users,
  SubmissionTypes,
} = require("../models");

const ApiError = require("../../utils/apiError");

const updateSubmissionScheme = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { submissionScheme } = req.body;

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

      // Jika fieldToDecrement ada, lakukan decrement
      if (fieldToDecrement) {
        await Periods.decrement(fieldToDecrement, {
          by: 1,
          where: { id: submission.periodId },
        });
      }
    }

    return res.status(200).json({
      status: "success",
      message: "SubmissionScheme berhasil diupdate",
      submission,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getAllUserSubmission = async (req, res, next) => {
  try {
    const copyrights = await UserSubmissions.findAll({
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
            },
            {
              model: Patents,
              as: "patent",
            },
            {
              model: Brands,
              as: "brand",
              include: [{ model: AdditionalDatas, as: "additionalDatas" }],
            },
            {
              model: IndustrialDesigns,
              as: "industrialDesign",
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
      copyrights,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

const getCopyrightById = async (req, res, next) => {
  try {
    const { id } = req.body;
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
            },
            {
              model: Patents,
              as: "patent",
            },
            {
              model: Brands,
              as: "brand",
              include: [{ model: AdditionalDatas, as: "additionalDatas" }],
            },
            {
              model: IndustrialDesigns,
              as: "industrialDesign",
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
    const { submissionTypeId } = req.body;
    const userSubmissions = await UserSubmissions.findAll({
      include: [
        {
          model: Users,
          as: "user",
        },
        {
          model: Submissions,
          as: "submission",
          where: {
            submissionTypeId: submissionTypeId,
          },
          include: [
            {
              model: Copyrights,
              as: "copyright",
            },
            {
              model: Patents,
              as: "patent",
            },
            {
              model: Brands,
              as: "brand",
            },
            {
              model: IndustrialDesigns,
              as: "industrialDesign",
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
      userSubmissions,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = {
  updateSubmissionScheme,
  getAllUserSubmission,
  getCopyrightById,
  getByIdSubmissionType,
};
