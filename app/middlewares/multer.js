const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Pastikan folder tujuan ada, buat jika belum ada
const imagePath = path.join(__dirname, "../../uploads/image");
const documentPath = path.join(__dirname, "../../uploads/documents");

if (!fs.existsSync(imagePath)) {
  fs.mkdirSync(imagePath, { recursive: true });
}

if (!fs.existsSync(documentPath)) {
  fs.mkdirSync(documentPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    // Tentukan folder tujuan berdasarkan jenis file
    if (ext === ".jpg" || ext === ".jpeg" || ext === ".png") {
      cb(null, imagePath);
    } else if (
      ext === ".pdf" ||
      ext === ".zip" ||
      ext === ".doc" ||
      ext === ".docx"
    ) {
      cb(null, documentPath);
    } else {
      cb(
        new Error(
          "Hanya file gambar (jpeg/jpg/png), PDF, Word (doc/docx), dan ZIP yang diperbolehkan"
        )
      );
    }
  },

  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Nama file unik
  },
});

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png/;
  const allowedPdfTypes = /pdf/;
  const allowedZipTypes = /zip/;
  const allowedDocTypes = /doc|docx/;

  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  if (allowedImageTypes.test(ext) && allowedImageTypes.test(mime)) {
    return cb(null, true);
  }

  if (allowedPdfTypes.test(ext) && allowedPdfTypes.test(mime)) {
    return cb(null, true);
  }

  if (allowedZipTypes.test(ext) && allowedZipTypes.test(mime)) {
    return cb(null, true);
  }

  if (allowedDocTypes.test(ext) && allowedDocTypes.test(mime)) {
    return cb(null, true);
  }

  return cb(
    new Error(
      "Hanya file gambar (jpeg/jpg/png), PDF, Word (doc/docx), dan ZIP yang diperbolehkan"
    )
  );
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

module.exports = {
  uploadSingle: (fieldName) => upload.single(fieldName),
  uploadMultiple: (fieldName, maxCount = 5) =>
    upload.array(fieldName, maxCount),
  uploadFields: (fields) => upload.fields(fields),
};
