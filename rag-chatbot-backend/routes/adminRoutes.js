const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { requireAuth, isAdmin } = require("../middleware/authMiddleware");
const { uploadJson, syncKnowledge, listFiles, deleteFile, convertPdf, saveJson } = require("../controllers/adminController");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "..", "data");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Handle UTF-8 original filename properly
    const decodedName = Buffer.from(file.originalname, "latin1").toString("utf8");
    const safeName = path.basename(decodedName);
    cb(null, safeName);
  },
});

const upload = multer({ storage });

router.use(requireAuth, isAdmin);

router.get("/files", listFiles);
router.post("/upload", upload.single("file"), uploadJson);
router.post("/convert-pdf", upload.single("file"), convertPdf);
router.post("/save-json", saveJson);
router.post("/sync", syncKnowledge);
router.delete("/files/:filename", deleteFile);

module.exports = router;
