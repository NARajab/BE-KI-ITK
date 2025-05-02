const router = require("express").Router();

const Submission = require("../controllers/submissionController");
const authenticat = require("../middlewares/authenticat");
const checkRole = require("../middlewares/checkRole");

router.get("/type", Submission.getSubmissionType);
router.get("/type/:id", Submission.getSubmissionTypeById);
router.post("/type", Submission.createSubmissionType);
router.patch("/type/:id", Submission.updateSubmissionType);
router.delete("/type/:id", Submission.deleteSubmissionType);

module.exports = router;
