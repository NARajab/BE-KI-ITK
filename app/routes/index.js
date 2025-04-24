const express = require("express");
const router = express.Router();

const Auth = require("./authRouter");
const User = require("./userRouter");
const Period = require("./periodRouter");
const UserSubmission = require("./userSubmissionRouter");
const Copyright = require("./copyrightRouter");
const Patents = require("./patentRouter");

router.use("/api/v1/auth", Auth);
router.use("/api/v1/user", User);
router.use("/api/v1/user-submission", UserSubmission);
router.use("/api/v1/period", Period);
router.use("/api/v1/copyright", Copyright);
router.use("/api/v1/patent", Patents);

module.exports = router;
