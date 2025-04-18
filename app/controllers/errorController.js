module.exports = (error, req, res, next) => {
  const err = error;
  err.statusCode = error.statusCode || 500;
  err.status = error.status;
  err.message = error.message;

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
};
