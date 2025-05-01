const router = require("express").Router();

const DesignIndustri = require("../controllers/industrialDesignController");
const authenticate = require("../middlewares/authenticat");
const { uploadFields } = require("../middlewares/multer");

router.post("/type", DesignIndustri.createTypeDesignIndustri);
router.post("/sub-type/:id", DesignIndustri.createSubTypeDesignIndustri);
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
router.get("/sub-type/:id", DesignIndustri.getSubTypeDesignIndustri);

router.patch("/type/:id", DesignIndustri.updateTypeDesignIndustri);
router.patch("/sub-type/:id", DesignIndustri.updateSubTypeDesignIndustri);

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

router.delete("/type/:id", DesignIndustri.deleteTypeDesignIndustri);
router.delete("/sub-type/:id", DesignIndustri.deleteSubTypeDesignIndustri);

module.exports = router;
