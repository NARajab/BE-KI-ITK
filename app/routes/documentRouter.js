const router = require("express").Router();

const Document = require("../controllers/documentController");
const authenticat = require("../middlewares/authenticat");
const { uploadSingle } = require("../middlewares/multer");
const { route } = require("./faqRouter");

router.post("/", Document.createDocumentType);

router.post(
  "/by-type/:type",
  uploadSingle("document"),
  Document.createDocByType
);

router.patch("/type", Document.updateDocumentType);

router.patch("/:id", uploadSingle("document"), Document.updateDoc);

router.get("/", Document.getAllDoc);

router.get("/by-type/:type", Document.getDocByType);

router.delete("/:id", Document.deleteDoc);

module.exports = router;
