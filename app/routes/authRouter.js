const router = require("express").Router();

const Auth = require("../controllers/authController");

router.post("/register", Auth.register);
router.post("/login", Auth.login);
router.post("/loginGoogle", Auth.loginGoogle);
router.get("/verify-email/:emailToken", Auth.verifyEmail);

module.exports = router;
