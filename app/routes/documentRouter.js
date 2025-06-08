const router = require("express").Router();

const Document = require("../controllers/documentController");
const authenticat = require("../middlewares/authenticat");
const { uploadFields, createMulter } = require("../middlewares/multer");
const validateFileSize = require("../middlewares/validateFileSize");
const checkRole = require("../middlewares/checkRole");

const upload = createMulter({
  limits: { fileSize: 1000 * 1024 * 1024 },
});

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
  upload.fields([
    { name: "document", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  validateFileSize({
    cover: 5 * 1024 * 1024,
  }),
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
  uploadFields([
    { name: "document", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  Document.updateDoc
);

router.get("/", Document.getAllDoc);

router.get("/not-pagination", Document.getAllDocWoutPagination);

router.get("/by-type", Document.getAllDocType);

router.get("/:id", Document.getById);

router.get("/by-type/:type", Document.getDocByType);

router.patch(
  "/active/:id",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Document.restoreDoc
);

router.patch(
  "/type/active/:type",
  authenticat,
  checkRole(["superAdmin", "admin"]),
  Document.restoreTypeDoc
);

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
