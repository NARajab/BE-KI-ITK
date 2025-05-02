const router = require("express").Router();

const Copyright = require("../controllers/copyrightController");
const authenticate = require("../middlewares/authenticat");
const { uploadFields } = require("../middlewares/multer");

router.post("/type", Copyright.createTypeCreation);

router.post("/sub-type/:id", Copyright.createSubTypeCreation);

router.post(
  "/",
  authenticate,
  (req, res, next) => {
    uploadFields([
      { name: "statementLetter", maxCount: 1 },
      { name: "letterTransferCopyright", maxCount: 1 },
      { name: "exampleCreation", maxCount: 1 },
      { name: "ktp", maxCount: 10 },
    ])(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err.message);
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  Copyright.createCopyright
);

router.patch(
  "/:id",
  authenticate,
  (req, res, next) => {
    uploadFields([
      { name: "statementLetter", maxCount: 1 },
      { name: "letterTransferCopyright", maxCount: 1 },
      { name: "exampleCreation", maxCount: 1 },
      { name: "ktp", maxCount: 10 },
    ])(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err.message);
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  Copyright.updateCopyright
);

router.patch("/type/:id", Copyright.updateTypeCreation);

router.patch("/sub-type/:id", Copyright.updateSubTypeCreation);

router.get("/type", Copyright.getAllTypeCreation);
router.get("/type/:id", Copyright.getByIdTypeCreation);

router.get("/sub-type/:id", Copyright.getAllSubTypeCreationByTypeCreation);
router.get("/sub-type/by-id/:id", Copyright.getByIdSubType);

router.delete("/type/:id", Copyright.deleteTypeCreation);

router.delete("/sub-type/:id", Copyright.deleteSubTypeCreation);

module.exports = router;
