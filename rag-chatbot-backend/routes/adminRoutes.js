const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { requireAuth, isAdmin } = require("../middleware/authMiddleware");
const { uploadJson, syncKnowledge, listFiles, deleteFile } = require("../controllers/adminController");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "..", "data");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({ storage });

router.use(requireAuth, isAdmin);

router.get("/files", listFiles);
router.post("/upload", upload.single("file"), uploadJson);
router.post("/sync", syncKnowledge);
router.delete("/files/:filename", deleteFile);

module.exports = router;
