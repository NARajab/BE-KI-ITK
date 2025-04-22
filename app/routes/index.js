const express = require("express");
const router = express.Router();

const Auth = require("./authRouter");
const User = require("./userRouter");
const Period = require("./periodRouter");

router.use("/api/v1/auth", Auth);
router.use("/api/v1/user", User);
router.use("/api/v1/period", Period);

module.exports = router;
