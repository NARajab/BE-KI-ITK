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
const DesignIndustri = require("./designIndustriRouter");
const Payment = require("./paymentRouter");
const Faqs = require("./faqRouter");
const Documents = require("./documentRouter");
const Terms = require("./termsConditionRouter");
const HelpCenter = require("./helpCenterRouter");
const Notification = require("./notificationRouter");
const ActivityLog = require("./activityLogRouter");

router.use("/api/v1/auth", Auth);
router.use("/api/v1/user", User);
router.use("/api/v1/user-submission", UserSubmission);
router.use("/api/v1/submission", Submission);
router.use("/api/v1/period", Period);
router.use("/api/v1/copyright", Copyright);
router.use("/api/v1/patent", Patents);
router.use("/api/v1/brand", Brands);
router.use("/api/v1/design-industri", DesignIndustri);
router.use("/api/v1/payment", Payment);
router.use("/api/v1/faq", Faqs);
router.use("/api/v1/document", Documents);
router.use("/api/v1/terms", Terms);
router.use("/api/v1/help-center", HelpCenter);
router.use("/api/v1/notification", Notification);
router.use("/api/v1/activity-log", ActivityLog);

module.exports = router;
