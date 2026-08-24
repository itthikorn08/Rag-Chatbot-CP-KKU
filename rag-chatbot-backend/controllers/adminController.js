const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const XLSX = require("xlsx");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
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

const convertPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "ไม่พบไฟล์ที่อัปโหลด" });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const allowedExts = [".pdf", ".txt", ".md", ".docx", ".xlsx", ".xls", ".csv", ".json"];
    if (!allowedExts.includes(ext)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: `รองรับเฉพาะไฟล์ที่ลงท้ายด้วย ${allowedExts.join(", ")} เท่านั้น` });
    }

    console.log(`Extracting text from uploaded file: ${req.file.filename}`);
    let rawText = "";

    if (ext === ".pdf") {
      const dataBuffer = fs.readFileSync(req.file.path);
      const parsedPdf = await pdf(dataBuffer);
      rawText = parsedPdf.text;
    } else if (ext === ".docx") {
      const result = await mammoth.extractRawText({ path: req.file.path });
      rawText = result.value;
    } else if (ext === ".xlsx" || ext === ".xls") {
      const workbook = XLSX.readFile(req.file.path);
      let sheetText = "";
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        sheetText += `Sheet: ${sheetName}\n`;
        sheetText += XLSX.utils.sheet_to_csv(worksheet) + "\n\n";
      });
      rawText = sheetText;
    } else if (ext === ".csv") {
      const workbook = XLSX.readFile(req.file.path);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rawText = XLSX.utils.sheet_to_csv(worksheet);
    } else {
      // .txt, .md, .json
      rawText = fs.readFileSync(req.file.path, "utf-8");
    }

    if (!rawText || !rawText.trim()) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "ไม่พบข้อความในไฟล์ที่อัปโหลด" });
    }

    console.log(`Extracted ${rawText.length} characters. Converting to standard RAG JSON using AI...`);

    const apiKey = process.env.GOOGLE_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY is missing in .env");
    }

    const llm = new ChatGoogleGenerativeAI({
      apiKey: apiKey,
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      temperature: 0.1,
    });

    const cleanRawText = rawText.substring(0, 100000); // safety slice
    const prompt = `You are an expert academic data extraction assistant for the College of Computing, Khon Kaen University (CP KKU).
Your task is to analyze the following raw text or unstructured JSON data extracted from an admission regulations/criteria document, and convert it into a structured JSON array of objects for a RAG chatbot.

Rules:
1. The output MUST be a valid JSON array of objects. Do not write any markdown code formatting wrapper or other text outside the JSON array.
2. Group the raw text into cohesive, logical chunks of information (e.g., specific admission criteria, intake seats for a program, tuition fees, general information). Do not split too finely (e.g. sentence by sentence), but do not make chunks too large (keep them around 100-300 words).
3. The content language of the "text" field should be in Thai (matching the source document). Keep it clear, polite, and informative.
4. Each object in the array must strictly have the following fields:
   - "text": A clean, grammatically correct paragraph containing the actual information. Remove headers, footers, page numbers, or noise. For tables, format them cleanly as readable plain-text lists or markdown tables inside the text.
   - "metadata": An object containing:
     - "academic_year": The academic year (e.g., "2569") if found in the text, otherwise "TODO".
     - "round": The admission round (e.g. 1, 2, 3, 4) as a number if applicable, otherwise null.
     - "admission_type": The name of the round (e.g. "Portfolio", "Quota", "Admission") if applicable, otherwise null.
     - "category": A broad category for this chunk (e.g. "Admission Criteria", "Intake Summary", "Tuition Fees", "Contact Info", "General Info").
     - Add any other specific metadata fields if relevant (e.g., "program", "test_type", etc.).

Here is the raw text to convert:
${cleanRawText}`;

    const response = await llm.invoke([
      ["system", "You are a professional PDF-to-JSON structured data converter. You must always reply with a valid JSON array of objects and nothing else. Do not wrap your response in markdown code blocks like ```json ... ```, output raw JSON array text."],
      ["human", prompt]
    ]);

    let responseText = response.content;
    let cleanText = responseText.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.substring(7);
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith("```")) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    cleanText = cleanText.trim();

    let jsonArray;
    try {
      jsonArray = JSON.parse(cleanText);
    } catch (parseError) {
      console.error("Gemini output was not valid JSON:", cleanText);
      throw new Error("ผลลัพธ์จาก AI ไม่ใช่รูปแบบ JSON ที่ถูกต้อง");
    }

    // Clean up the uploaded PDF file
    fs.unlinkSync(req.file.path);

    return res.json({
      message: "แปลงไฟล์ PDF เป็นโครงสร้าง JSON สำเร็จ",
      data: jsonArray
    });
  } catch (error) {
    console.error("PDF Convert error:", error.message);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการแปลงไฟล์ PDF: " + error.message });
  }
};

const saveJson = async (req, res) => {
  try {
    const { filename, content } = req.body;

    if (!filename || !content) {
      return res.status(400).json({ error: "กรุณาระบุชื่อไฟล์และข้อมูลเนื้อหา" });
    }

    if (!filename.toLowerCase().endsWith(".json")) {
      return res.status(400).json({ error: "ชื่อไฟล์ต้องลงท้ายด้วย .json เท่านั้น" });
    }

    // Prevent path traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(DATA_DIR, safeFilename);

    // Save JSON data (pretty-printed)
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), "utf-8");

    console.log(`Saved file: ${safeFilename}.`);

    return res.json({
      message: "บันทึกไฟล์เรียบร้อยแล้ว",
      filename: safeFilename
    });
  } catch (error) {
    console.error("Save JSON error:", error.message);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกและซิงค์ข้อมูล: " + error.message });
  }
};

module.exports = { uploadJson, syncKnowledge, listFiles, deleteFile, convertPdf, saveJson };
