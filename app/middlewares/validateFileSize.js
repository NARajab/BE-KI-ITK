module.exports = (maxSizes = {}) => {
  return (req, res, next) => {
    for (const field in maxSizes) {
      const file = req.files?.[field]?.[0];
      if (file && file.size > maxSizes[field]) {
        return res.status(400).json({
          message: `Ukuran file '${field}' tidak boleh lebih dari ${
            maxSizes[field] / 1024 / 1024
          }MB.`,
        });
      }
    }
    next();
  };
};
