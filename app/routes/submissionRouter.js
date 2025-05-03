const router = require("express").Router();

const Submission = require("../controllers/submissionController");
const authenticat = require("../middlewares/authenticat");
const checkRole = require("../middlewares/checkRole");

router.get("/", Submission.getAllSubmissions);
router.get("/type", Submission.getSubmissionType);
router.get("/type/:id", Submission.getSubmissionTypeById);
router.post("/type", authenticat, Submission.createSubmissionType);
router.patch("/type/:id", authenticat, Submission.updateSubmissionType);
router.delete("/type/:id", authenticat, Submission.deleteSubmissionType);

module.exports = router;
