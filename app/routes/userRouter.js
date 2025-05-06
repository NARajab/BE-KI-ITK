const router = require("express").Router();

const User = require("../controllers/userController");
const authenticat = require("../middlewares/authenticat");
const authenticate = require("../middlewares/authenticat");
const checkRole = require("../middlewares/checkRole");
const { uploadSingle } = require("../middlewares/multer");

router.post(
  "/",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  uploadSingle("image"),
  User.createUser
);

router.get(
  "/",
  authenticate,
  checkRole(["superAdmin", "admin"]),
  User.getAllUsers
);

router.get("/reviewer", User.getAllUserReviewer);

router.get("/:id", User.getUserById);

router.patch("/:id", authenticate, uploadSingle("image"), User.updateUser);

router.delete(
  "/:id",
  authenticate,
  checkRole(["superAdmin", "admin"]),
  User.deleteUser
);

module.exports = router;
