const router = require("express").Router();

const UserSubmission = require("../controllers/userSubmissionController");
const authenticat = require("../middlewares/authenticat");
const { uploadFields } = require("../middlewares/multer");

router.patch(
  "/submission-schema/:id",
  authenticat,
  UserSubmission.updateSubmissionScheme
);

router.patch(
  "/submission-progress/:id",
  authenticat,
  uploadFields([{ name: "files", maxCount: 10 }]),
  UserSubmission.updateSubmissionProgress
);

router.patch(
  "/submission-status/:id",
  authenticat,
  UserSubmission.updateStatus
);

router.patch(
  "/submission-reviewer/:id",
  authenticat,
  UserSubmission.updateReviewer
);

router.get("/get-by-id/:id", UserSubmission.getUserSubmissionById);

router.get("/get-by-submision-type/:id", UserSubmission.getByIdSubmissionType);

router.get("/", UserSubmission.getAllUserSubmission);

router.get("/progress/:id", UserSubmission.getProgressById);

router.get("/progress", UserSubmission.getAllProgress);

module.exports = router;
