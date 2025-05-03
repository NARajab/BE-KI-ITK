const router = require("express").Router();

const Document = require("../controllers/documentController");
const authenticat = require("../middlewares/authenticat");
const { uploadSingle } = require("../middlewares/multer");
const checkRole = require("../middlewares/checkRole");

router.post(
  "/",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Document.createDocumentType
);

router.post(
  "/by-type/:type",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  uploadSingle("document"),
  Document.createDocByType
);

router.patch(
  "/type",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Document.updateDocumentType
);

router.patch(
  "/:id",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  uploadSingle("document"),
  Document.updateDoc
);

router.get("/", Document.getAllDoc);

router.get("/by-type", Document.getAllDocType);

router.get("/:id", Document.getById);

router.get("/by-type/:type", Document.getDocByType);

router.delete(
  "/:id",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Document.deleteDoc
);

router.delete(
  "/type/:type",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Document.deleteTypeDoc
);

module.exports = router;
