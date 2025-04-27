const router = require("express").Router();

const UserSubmission = require("../controllers/userSubmissionController");
const authenticat = require("../middlewares/authenticat");

router.patch(
  "/submission-schema/:id",
  authenticat,
  UserSubmission.updateSubmissionScheme
);

router.get("/get-by-id", UserSubmission.getUserSubmissionById);

router.get("/get-by-submision-type", UserSubmission.getByIdSubmissionType);

router.get("/", UserSubmission.getAllUserSubmission);

module.exports = router;
