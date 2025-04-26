const router = require("express").Router();

const Faq = require("../controllers/faqController");
const authenticat = require("../middlewares/authenticat");
const checkRole = require("../middlewares/checkRole");

router.post(
  "/",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Faq.createTypeFaq
);

router.post(
  "/by-type/:type",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Faq.createFaqByType
);

router.get("/", Faq.getAllFaq);

router.get("/by-type/:type", Faq.getFaqByType);

router.patch(
  "/type",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Faq.updateFaqType
);

router.patch(
  "/:id",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Faq.updateFaq
);

router.delete(
  "/:id",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Faq.deleteFaq
);

module.exports = router;
