const router = require("express").Router();

const Brand = require("../controllers/brandController");
const authenticat = require("../middlewares/authenticat");
const { uploadFields } = require("../middlewares/multer");

router.post(
  "/",
  authenticat,
  (req, res, next) => {
    uploadFields([
      { name: "ktp", maxCount: 10 },
      { name: "labelBrand", maxCount: 1 },
      { name: "fileUploade", maxCount: 1 },
      { name: "signature", maxCount: 1 },
      { name: "InformationLetter", maxCount: 1 },
      { name: "letterStatment", maxCount: 1 },
      { name: "additionalFiles", maxCount: 10 },
    ])(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err.message);
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  Brand.createBrand
);

router.patch(
  "/:id",
  authenticat,
  (req, res, next) => {
    uploadFields([
      { name: "ktp", maxCount: 10 },
      { name: "labelBrand", maxCount: 1 },
      { name: "fileUploade", maxCount: 1 },
      { name: "signature", maxCount: 1 },
      { name: "InformationLetter", maxCount: 1 },
      { name: "letterStatment", maxCount: 1 },
    ])(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err.message);
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  Brand.updateBrand
);

router.get("/", Brand.getAllAdditionalDatas);
router.patch(
  "/additional-data/:id",
  (req, res, next) => {
    uploadFields([{ name: "file", maxCount: 1 }])(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err.message);
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  Brand.updateAdditionalDatas
);

module.exports = router;
