const router = require("express").Router();

const Period = require("../controllers/periodController");
const authenticat = require("../middlewares/authenticat");
const checkRole = require("../middlewares/checkRole");

router.post(
  "/",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Period.createPeriod
);
router.get("/", Period.getAllPeriod);

router.patch(
  "/:id",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Period.updatePeriod
);

router.delete(
  "/:id",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Period.deletePeriod
);

router.get("/filter/year", Period.getByYear);
router.get("/filter/group", Period.getByGroup);
router.get("/submission-type", Period.getSubmissionType);

module.exports = router;
