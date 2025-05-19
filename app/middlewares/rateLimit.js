const rateLimit = require("express-rate-limit");

// Middleware: Batasi 1 request per 5 menit per IP
const helpCenterLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 menit
  max: 1, // hanya 1 request per IP
  message: {
    status: "fail",
    message: "Terlalu banyak permintaan. Silakan coba lagi dalam 5 menit.",
  },
});

module.exports = { helpCenterLimiter };
