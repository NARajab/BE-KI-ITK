const router = require("express").Router();

const CentralStatus = require("../controllers/centralStatusController");
const authenticat = require("../middlewares/authenticat");

router.post(
  "/",
  // authenticat,
  CentralStatus.createCentralStatus
);

router.patch(
  "/:id",
  // authenticat,
  CentralStatus.updateCentralStatus
);

router.delete(
  "/:id",
  // authenticat,
  CentralStatus.deleteCentralStatus
);

router.get("/", CentralStatus.getAllCentralStatus);

router.get("/:id", CentralStatus.getCentralStatusById);

router.get("/type/:type", CentralStatus.getCentralStatusByType);

module.exports = router;
