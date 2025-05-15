const router = require("express").Router();

const Terms = require("../controllers/termsConditionController");
const authenticat = require("../middlewares/authenticat");
const checkRole = require("../middlewares/checkRole");

router.post(
  "/",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Terms.createTerms
);

router.patch(
  "/:id",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Terms.updateTerms
);

router.get("/", Terms.getAllTerms);

router.get("/not-pagination", Terms.getAllTermsWTPagination);

router.get("/:id", Terms.getTermsById);

router.patch(
  "/active/:id",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Terms.restoreTerms
);

router.delete(
  "/:id",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Terms.deleteTerms
);

module.exports = router;
