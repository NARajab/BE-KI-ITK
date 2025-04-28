const express = require("express");
const router = express.Router();

const Auth = require("./authRouter");
const User = require("./userRouter");
const Period = require("./periodRouter");
const UserSubmission = require("./userSubmissionRouter");
const Submission = require("./submissionRouter");
const Copyright = require("./copyrightRouter");
const Patents = require("./patentRouter");
const Brands = require("./brandRouter");
const Faqs = require("./faqRouter");
const Documents = require("./documentRouter");
const Terms = require("./termsConditionRouter");

router.use("/api/v1/auth", Auth);
router.use("/api/v1/user", User);
router.use("/api/v1/user-submission", UserSubmission);
router.use("/api/v1/submission", Submission);
router.use("/api/v1/period", Period);
router.use("/api/v1/copyright", Copyright);
router.use("/api/v1/patent", Patents);
router.use("/api/v1/brand", Brands);
router.use("/api/v1/faq", Faqs);
router.use("/api/v1/document", Documents);
router.use("/api/v1/terms", Terms);

module.exports = router;
