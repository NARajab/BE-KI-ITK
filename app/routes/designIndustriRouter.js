const router = require("express").Router();

const DesignIndustri = require("../controllers/industrialDesignController");
const authenticate = require("../middlewares/authenticat");
const { uploadFields } = require("../middlewares/multer");

router.post("/type", DesignIndustri.createTypeDesignIndustri);
router.post("/sub-type/:id", DesignIndustri.createSubTypeDesignIndustri);

router.get("/type", DesignIndustri.getAllTypeDesignIndustri);
router.get("/sub-type/:id", DesignIndustri.getSubTypeDesignIndustri);

router.patch("/type/:id", DesignIndustri.updateTypeDesignIndustri);
router.patch("/sub-type/:id", DesignIndustri.updateSubTypeDesignIndustri);

router.delete("/type/:id", DesignIndustri.deleteTypeDesignIndustri);
router.delete("/sub-type/:id", DesignIndustri.deleteSubTypeDesignIndustri);

module.exports = router;
