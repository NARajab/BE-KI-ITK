const jwt = require("jsonwebtoken");
const { Users } = require("../models");
const ApiError = require("../../utils/apiError");

module.exports = async (req, res, next) => {
  try {
    const bearerToken = req.headers.authorization;

    if (!bearerToken) {
      return next(new ApiError("You must log in", 401));
    }

    const token = bearerToken.split("Bearer ")[1];

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    console.log(payload);
    const user = await Users.findByPk(payload.id);

    req.user = user;
    next();
  } catch (err) {
    console.log(err);
    if (err.name === "TokenExpiredError") {
      return next(
        new ApiError("Your session has expired. Please log in again.", 401)
      );
    }
    next(new ApiError(err.message, 500));
  }
};
