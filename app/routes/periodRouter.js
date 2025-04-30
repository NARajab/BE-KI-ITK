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
  "/group/:id",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Period.createGroup
);

router.get("/", Period.getAllPeriod);

router.get("/group/:id", Period.getAllGroupByYear);

router.get("/quota", Period.getAllQuotas);

router.get("/quota/:id", Period.getQuotaById);

router.patch(
  "/year",
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
  Period.deleteGroup
);

router.delete(
  "/year/:id",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Period.deletePeriod
);

module.exports = router;
