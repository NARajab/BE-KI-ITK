const router = require("express").Router();

const Patent = require("../controllers/patentController");
const authenticate = require("../middlewares/authenticat");
const { uploadFields } = require("../middlewares/multer");

router.post(
  "/",
  authenticate,
  (req, res, next) => {
    uploadFields([
      { name: "ktp", maxCount: 10 },
      { name: "draftPatentApplicationFile", maxCount: 1 },
    ])(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err.message);
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  Patent.createPatent
);

router.post("/type", authenticate, Patent.createPatentType);

router.patch(
  "/:id",
  authenticate,
  (req, res, next) => {
    uploadFields([
      { name: "entirePatentDocument", maxCount: 1 },
      { name: "description", maxCount: 1 },
      { name: "abstract", maxCount: 1 },
      { name: "claim", maxCount: 1 },
      { name: "inventionImage", maxCount: 1 },
      { name: "statementInventionOwnership", maxCount: 1 },
      { name: "letterTransferRightsInvention", maxCount: 1 },
      { name: "letterPassedReviewStage", maxCount: 1 },
    ])(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err.message);
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  Patent.updatePatent
);

router.patch("/type/:id", authenticate, Patent.updatePatentType);

router.get("/type", Patent.getAllPatentTypes);

router.get("/type/not-pagination", Patent.getAllPatentTypesWtoPagination);

router.get("/type/:id", Patent.getPatentTypeById);

router.patch("/type/active/:id", authenticate, Patent.restorePatentType);

router.delete("/type/:id", authenticate, Patent.deletePatentType);

module.exports = router;
