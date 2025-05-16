const router = require("express").Router();

const Submission = require("../controllers/submissionController");
const authenticat = require("../middlewares/authenticat");
const { uploadFields } = require("../middlewares/multer");
const checkRole = require("../middlewares/checkRole");

router.get("/get", Submission.getAllSubmissions);
router.get("/type", Submission.getSubmissionType);
router.get("/type/:id", Submission.getSubmissionTypeById);
router.patch(
  "/personal-data/:submissionId",
  authenticat,
  (req, res, next) => {
    uploadFields([{ name: "ktpFiles", maxCount: 20 }])(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err.message);
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  Submission.updatePersonalData
);
router.patch(
  "/personal-data-patent/:submissionId",
  authenticat,
  (req, res, next) => {
    uploadFields([
      { name: "ktpFiles", maxCount: 20 },
      { name: "draftPatentApplicationFile", maxCount: 1 },
    ])(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err.message);
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  Submission.updatePersonalDataPaten
);
router.patch(
  "/personal-data-design-industri/:submissionId",
  authenticat,
  (req, res, next) => {
    uploadFields([
      { name: "ktpFiles", maxCount: 20 },
      { name: "draftDesainIndustriApplicationFile", maxCount: 1 },
    ])(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err.message);
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  Submission.updatePersonalDataDesignIndustri
);
router.post("/type", authenticat, Submission.createSubmissionType);
router.patch("/type/:id", authenticat, Submission.updateSubmissionType);
router.patch("/type/active/:id", authenticat, Submission.restoreSubmissionType);
router.delete("/type/:id", authenticat, Submission.deleteSubmissionType);

module.exports = router;
