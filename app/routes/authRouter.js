const router = require("express").Router();

const Auth = require("../controllers/authController");

router.post("/register", Auth.registerWithEmail);
router.post("/register/google", Auth.registerWithGoogle);
router.post("/login", Auth.login);

module.exports = router;
