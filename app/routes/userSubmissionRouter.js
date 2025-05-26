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
  uploadFields([
    { name: "files", maxCount: 10 },
    { name: "certificateFile", maxCount: 1 },
  ]),
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

router.get(
  "/get-by-submision-type/status/:id",
  authenticat,
  UserSubmission.getByIdSubmissionTypeStatusSelesai
);

router.get("/", UserSubmission.getAllUserSubmission);

router.get("/progress/:id", UserSubmission.getProgressById);

router.get("/progress", UserSubmission.getAllProgress);

router.get(
  "/by-reviewer",
  authenticat,
  UserSubmission.getSubmissionsByReviewerId
);

router.get("/by-user", authenticat, UserSubmission.getSubmissionsByUserId);

router.get("/admin-dashboard", UserSubmission.getAdminDashboard);

router.patch("/active/:id", authenticat, UserSubmission.restoreUserSubmission);

router.delete("/:id", authenticat, UserSubmission.deleteUserSubmission);

module.exports = router;
