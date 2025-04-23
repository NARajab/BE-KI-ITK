const router = require("express").Router();

const Copyright = require("../controllers/copyrightController");
const authenticate = require("../middlewares/authenticat");
const { uploadFields } = require("../middlewares/multer");

router.post(
  "/",
  authenticate,
  (req, res, next) => {
    uploadFields([
      { name: "statementLetter", maxCount: 1 },
      { name: "letterTransferCopyright", maxCount: 1 },
      { name: "exampleCreation", maxCount: 1 },
      { name: "ktp", maxCount: 10 },
    ])(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err.message);
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  Copyright.createCopyright
);

router.patch(
  "/:id",
  authenticate,
  (req, res, next) => {
    uploadFields([
      { name: "statementLetter", maxCount: 1 },
      { name: "letterTransferCopyright", maxCount: 1 },
      { name: "exampleCreation", maxCount: 1 },
      { name: "ktp", maxCount: 10 },
    ])(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err.message);
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  Copyright.updateCopyright
);

router.get("/:id", Copyright.getCopyrightById);

router.get("/", Copyright.getAllCopyrights);

module.exports = router;
