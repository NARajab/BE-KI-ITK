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

router.post(
  "/group/:year",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Period.createGroup
);

router.get("/", Period.getAllPeriod);

router.get("/by-year", Period.getAllYearPeriod);

router.get("/group/:year", Period.getAllGroupByYear);

router.get("/:id", Period.getById);

router.patch(
  "/:id",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Period.updatePeriod
);

router.patch(
  "/group/:id",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Period.updateGroup
);

router.patch(
  "/quota/:id",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Period.updateQuota
);

router.delete(
  "/:id",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Period.deletePeriod
);

router.delete(
  "/year/:year",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Period.deleteYearPeriod
);

router.get("/filter/year", Period.getByYear);
router.get("/filter/group", Period.getByGroup);

module.exports = router;
