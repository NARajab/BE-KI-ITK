const { ActivityLogs, Users } = require("../models");
const ApiError = require("../../utils/apiError");

const { Op } = require("sequelize");

const getActivityLogs = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    let fullname = req.query.fullname || "";

    const offset = (page - 1) * limit;

    const { count, rows: activityLogs } = await ActivityLogs.findAndCountAll({
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Users,
          as: "user",
          attributes: ["fullname"],
          where: fullname
            ? {
                fullname: {
                  [Op.iLike]: `%${fullname}%`,
                },
              }
            : undefined,
        },
      ],
    });

    return res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalTypes: count,
      limit: limit,
      activityLogs,
    });
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = { getActivityLogs };
