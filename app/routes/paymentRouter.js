const router = require("express").Router();

const Payment = require("../controllers/paymentController");
const authenticat = require("../middlewares/authenticat");
const { uploadSingle } = require("../middlewares/multer");

router.get("/", Payment.getAllPayments);
router.patch(
  "/payment-proof/:id",
  authenticat,
  uploadSingle("proofPayment"),
  Payment.updatePayment
);

router.get("/by-user-id", authenticat, Payment.getPaymentByUserId);

router.get("/by-id/:id", Payment.getPaymentById);

module.exports = router;
