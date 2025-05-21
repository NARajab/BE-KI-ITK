const router = require("express").Router();

const HelpCenter = require("../controllers/helpCenterController");
const authenticat = require("../middlewares/authenticat");
const { helpCenterLimiter } = require("../middlewares/rateLimit");
const { uploadSingle } = require("../middlewares/multer");

router.post(
  "/",
  uploadSingle("document"),
  // helpCenterLimiter,
  HelpCenter.createHelpCenter
);

router.get("/", HelpCenter.getHelpCenter);
router.get("/:id", HelpCenter.getHelpCenterById);
router.patch("/:id", HelpCenter.updateHelpCenter);
router.patch("/active/:id", authenticat, HelpCenter.restoreHelpCenter);
router.delete("/:id", authenticat, HelpCenter.deleteHelpCenter);

module.exports = router;
