const router = require("express").Router();

const User = require("../controllers/userController");
const authenticate = require("../middlewares/authenticat");
const checkRole = require("../middlewares/checkRole");
const upload = require("../middlewares/multer");

router.get(
  "/",
  authenticate,
  checkRole(["superAdmin", "admin"]),
  User.getAllUsers
);

router.get("/:id", User.getUserById);

router.patch("/:id", upload.single("image"), User.updateUser);

router.patch(
  "/role/:id",
  authenticate,
  checkRole(["superAdmin"]),
  User.updateRoleUser
);

router.delete(
  "/:id",
  authenticate,
  checkRole(["superAdmin", "admin"]),
  User.deleteUser
);

module.exports = router;
