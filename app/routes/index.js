const express = require("express");
const router = express.Router();

const Auth = require("./authRouter");
const User = require("./userRouter");

router.use("/api/v1/auth", Auth);
router.use("/api/v1/user", User);

module.exports = router;
