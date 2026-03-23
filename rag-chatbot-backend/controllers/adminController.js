const fs = require("fs");
const path = require("path");
const { syncKnowledgeBase } = require("../services/ragHelper");

const DATA_DIR = path.join(__dirname, "..", "data");

const uploadJson = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "ไม่พบไฟล์ที่อัปโหลด" });
    }

    if (!req.file.originalname.endsWith(".json")) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "รองรับเฉพาะไฟล์ .json เท่านั้น" });
    }

    return res.json({
      message: "อัปโหลดไฟล์เรียบร้อยแล้ว",
      filename: req.file.filename,
      originalName: req.file.originalname,
    });
  } catch (error) {
    console.error("Upload error:", error.message);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปโหลดไฟล์" });
  }
};

const syncKnowledge = async (req, res) => {
  try {
    const result = await syncKnowledgeBase();
    return res.json(result);
  } catch (error) {
    console.error("Sync error:", error.message);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการซิงค์ฐานข้อมูลความรู้" });
  }
};

const listFiles = async (req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR);
    const fileInfo = files
      .filter(f => f.endsWith(".json"))
      .map(f => {
        const stats = fs.statSync(path.join(DATA_DIR, f));
        return {
          name: f,
          size: stats.size,
          mtime: stats.mtime,
        };
      });
    return res.json({ files: fileInfo });
  } catch (error) {
    return res.status(500).json({ error: "ไม่สามารถเรียกดูรายชื่อไฟล์ได้" });
  }
};

const deleteFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(DATA_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "ไม่พบไฟล์ที่ต้องการลบ" });
    }

    fs.unlinkSync(filePath);
    return res.json({ message: "ลบไฟล์เรียบร้อยแล้ว" });
  } catch (error) {
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบไฟล์" });
  }
};

module.exports = { uploadJson, syncKnowledge, listFiles, deleteFile };
