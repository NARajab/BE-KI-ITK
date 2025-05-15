const router = require("express").Router();

const HelpCenter = require("../controllers/helpCenterController");
const authenticat = require("../middlewares/authenticat");
const { uploadSingle } = require("../middlewares/multer");

router.post(
  "/",
  authenticat,
  uploadSingle("document"),
  HelpCenter.createHelpCenter
);

router.get("/", HelpCenter.getHelpCenter);
router.get("/:id", HelpCenter.getHelpCenterById);
router.patch("/:id", authenticat, HelpCenter.updateHelpCenter);
router.patch("/active/:id", authenticat, HelpCenter.restoreHelpCenter);
router.delete("/:id", authenticat, HelpCenter.deleteHelpCenter);

module.exports = router;
