const router = require("express").Router();

const Auth = require("../controllers/authController");
const authenticate = require("../middlewares/authenticat");

router.post("/register", Auth.register);
router.post("/login", Auth.login);
router.post("/loginGoogle", Auth.loginGoogle);
router.get("/verify-email/:emailToken", Auth.verifyEmail);
router.post("/send-email-reset-password", Auth.sendEmailResetPassword);
router.post("/reset-password/:token", Auth.resetPassword);
router.get("/me", authenticate, Auth.getMe);

module.exports = router;
