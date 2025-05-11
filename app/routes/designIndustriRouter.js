const router = require("express").Router();

const DesignIndustri = require("../controllers/industrialDesignController");
const authenticate = require("../middlewares/authenticat");
const { uploadFields } = require("../middlewares/multer");

router.post("/type", authenticate, DesignIndustri.createTypeDesignIndustri);
router.post(
  "/sub-type/:id",
  authenticate,
  DesignIndustri.createSubTypeDesignIndustri
);
router.post(
  "/",
  authenticate,
  (req, res, next) => {
    uploadFields([
      { name: "draftDesainIndustriApplicationFile", maxCount: 1 },
      { name: "ktp", maxCount: 10 },
    ])(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err.message);
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  DesignIndustri.createDesignIndustri
);

router.get("/type", DesignIndustri.getAllTypeDesignIndustri);
router.get(
  "/type/not-pagination",
  DesignIndustri.getAllTypeDesignIndustriWtoPagination
);
router.get("/type/:id", DesignIndustri.getTypeById);
router.get("/sub-type/:id", DesignIndustri.getSubTypeDesignIndustri);
router.get(
  "/sub-type/not-pagination/:id",
  DesignIndustri.getSubTypeDesignIndustriWtoPagination
);
router.get("/sub-type/by-id/:id", DesignIndustri.getSubTypeById);

router.patch(
  "/type/:id",
  authenticate,
  DesignIndustri.updateTypeDesignIndustri
);
router.patch(
  "/sub-type/:id",
  authenticate,
  DesignIndustri.updateSubTypeDesignIndustri
);

router.patch(
  "/:id",
  authenticate,
  (req, res, next) => {
    uploadFields([
      { name: "looksPerspective", maxCount: 1 },
      { name: "frontView", maxCount: 1 },
      { name: "backView", maxCount: 1 },
      { name: "rightSideView", maxCount: 1 },
      { name: "lefttSideView", maxCount: 1 },
      { name: "topView", maxCount: 1 },
      { name: "downView", maxCount: 1 },
      { name: "moreImages", maxCount: 1 },
      { name: "letterTransferDesignRights", maxCount: 1 },
      { name: "designOwnershipLetter", maxCount: 1 },
    ])(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err.message);
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  DesignIndustri.updateIndustrialDesign
);

router.delete(
  "/type/:id",
  authenticate,
  DesignIndustri.deleteTypeDesignIndustri
);
router.delete(
  "/sub-type/:id",
  authenticate,
  DesignIndustri.deleteSubTypeDesignIndustri
);

module.exports = router;
