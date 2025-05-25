const ApiError = require("../../utils/apiError");

const checkRole = (roles) => async (req, res, next) => {
  try {
    if (!roles.includes(req.user.role)) {
      throw new ApiError(
        `Anda bukan ${roles.join(", ")}, sehingga anda tidak memiliki akses`,
        401
      );
    }
    next();
  } catch (err) {
    next(new ApiError(err.message, 500));
  }
};

module.exports = checkRole;
