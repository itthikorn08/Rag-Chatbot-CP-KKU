/**
 * ============================================================
 *  evaluate.js — RAG Evaluation Script for CP KKU Chatbot
 * ============================================================
 *
 * วิธีใช้งาน:
 *   1. วาง test_set_100.json ไว้ที่ใดก็ได้ (ดูค่า TEST_SET_SEARCH_PATHS ด้านล่าง)
 *   2. รันจาก root ของ rag-chatbot-backend:
 *        node evaluate.js
 *   3. ผลลัพธ์จะถูกบันทึกเป็น:
 *        - evaluation_output.json   (ผลรายข้อ)
 *        - evaluation_summary.json  (สรุปคะแนน)
 *
 * หมายเหตุ: ต้องมี .env ที่ถูกต้อง (MONGO_URI, GOOGLE_API_KEY) ก่อนรัน
 * ============================================================
 */

"use strict";

require("dotenv").config();

const fs   = require("fs");
const path = require("path");
const os   = require("os");

// ──────────────────────────────────────────────────────────────
// ⚙️  CONFIGURATION — ปรับได้ตามต้องการ
// ──────────────────────────────────────────────────────────────

/**
 * ตำแหน่งไฟล์ชุดทดสอบ 100 ข้อ
 * ลำดับการค้นหา: EVAL_TEST_SET_PATH env → paths ด้านล่างตามลำดับ
 */
const TEST_SET_SEARCH_PATHS = [
  process.env.EVAL_TEST_SET_PATH,
  path.join(__dirname, "test_set_100.json"),
  path.join(__dirname, "..", "test_set_100.json"),
  path.join(os.homedir(), "OneDrive", "Documents", "test_set_100.json"),
  path.join(os.homedir(), "Documents", "test_set_100.json"),
].filter(Boolean);

/** ไฟล์ผลลัพธ์รายข้อ */
const OUTPUT_FILE  = path.join(__dirname, "evaluation_output.json");

/** ไฟล์สรุปคะแนน */
const SUMMARY_FILE = path.join(__dirname, "evaluation_summary.json");

/**
 * หน่วงเวลาระหว่างแต่ละคำถาม (ms) เพื่อหลีกเลี่ยง rate-limit
 * ปรับเพิ่มหาก API ตอบกลับ 429 Too Many Requests
 */
const DELAY_MS = parseInt(process.env.EVAL_DELAY_MS ?? "1200", 10);

// ──────────────────────────────────────────────────────────────

/** ดึงฟังก์ชัน getAnswer จาก RAG helper ที่ใช้งานจริง */
const { getAnswer } = require("./services/ragHelper");

// ──────────────────────────────────────────────────────────────
// 🔧  Utility helpers
// ──────────────────────────────────────────────────────────────

/** หน่วง n มิลลิวินาที */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** แสดง progress bar ใน console */
function printProgress(current, total, startTime) {
  const pct    = Math.round((current / total) * 100);
  const filled = Math.round(pct / 2);
  const bar    = "\u2588".repeat(filled) + "\u2591".repeat(50 - filled);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const eta     = current > 0
    ? (((Date.now() - startTime) / current) * (total - current) / 1000).toFixed(0)
    : "-";
  process.stdout.write(
    `\r[${bar}] ${pct}% (${current}/${total}) | ผ่านไป ${elapsed}s | ETA ~${eta}s   `
  );
}

/**
 * ค้นหาและโหลดไฟล์ชุดทดสอบ
 * รองรับ 2 รูปแบบ:
 *   - Array of objects: [ { id, category, question, ground_truth }, ... ]
 *   - Object with "questions" key: { questions: [...] }
 */
function loadTestSet() {
  let foundPath = null;
  for (const p of TEST_SET_SEARCH_PATHS) {
    if (fs.existsSync(p)) {
      foundPath = p;
      break;
    }
  }

  if (!foundPath) {
    console.error("\n❌ ไม่พบไฟล์ test_set_100.json");
    console.error("   ค้นหาใน paths ต่อไปนี้:");
    TEST_SET_SEARCH_PATHS.forEach((p) => console.error(`   - ${p}`));
    console.error(
      "\n   แก้ไข: วาง test_set_100.json ไว้ใน rag-chatbot-backend/ หรือตั้งค่า EVAL_TEST_SET_PATH"
    );
    process.exit(1);
  }

  console.log(`\n📂 โหลดชุดทดสอบจาก: ${foundPath}`);
  const raw = JSON.parse(fs.readFileSync(foundPath, "utf-8"));

  // รองรับทั้ง array และ object wrapper
  const items = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.questions)
    ? raw.questions
    : null;

  if (!items || items.length === 0) {
    console.error("❌ รูปแบบไฟล์ไม่ถูกต้อง: ต้องเป็น Array หรือ { questions: [...] }");
    process.exit(1);
  }

  console.log(`✅ โหลดคำถามสำเร็จ: ${items.length} ข้อ`);
  return items;
}

// ──────────────────────────────────────────────────────────────
// 📊  Scoring helpers
// ──────────────────────────────────────────────────────────────

/**
 * Simple keyword-based relevance check
 * (ใช้เป็น proxy score ก่อน; สามารถแทนที่ด้วย LLM-as-judge ได้)
 *
 * คืนค่า score 0–1 โดยดูว่า keyword จาก ground_truth
 * ปรากฏอยู่ใน generated_answer กี่ %
 */
function computeKeywordScore(groundTruth, generatedAnswer) {
  if (!groundTruth || !generatedAnswer) return 0;

  const normalize = (s) => s.toLowerCase().replace(/[\s\-_,\.]/g, "");

  // แยก ground_truth เป็น tokens ด้วย whitespace / comma
  const tokens = groundTruth
    .split(/[\s,;|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);

  if (tokens.length === 0) return 1; // ไม่มี keyword → ถือว่า pass

  const ansNorm = normalize(generatedAnswer);
  const matched = tokens.filter((t) => ansNorm.includes(normalize(t)));
  return matched.length / tokens.length;
}

/**
 * ตรวจว่าระบบ "ตอบได้" (ไม่ fallback) หรือเปล่า
 * ถ้าคำตอบมีวลี fallback ทั่วไป ถือว่าตอบไม่ได้
 */
function isAnswered(generatedAnswer) {
  if (!generatedAnswer) return false;
  const fallbackPatterns = [
    "ไม่พบข้อมูล",
    "ไม่มีข้อมูล",
    "ขออภัย ไม่สามารถ",
    "ข้อมูลไม่เพียงพอ",
    "cannot find",
    "no information",
    "not found",
  ];
  const lower = generatedAnswer.toLowerCase();
  return !fallbackPatterns.some((p) => lower.includes(p.toLowerCase()));
}

// ──────────────────────────────────────────────────────────────
// 🚀  Main evaluation loop
// ──────────────────────────────────────────────────────────────

async function runRAGEvaluation() {
  console.log("============================================================");
  console.log("   RAG Evaluation - CP KKU Chatbot");
  console.log("============================================================");

  const testSet     = loadTestSet();
  const evalResults = [];
  const globalStart = Date.now();

  console.log(`\n⏱️  Delay ระหว่างคำถาม: ${DELAY_MS}ms`);
  console.log(`📝 ไฟล์ผลลัพธ์: ${OUTPUT_FILE}`);
  console.log(`📊 ไฟล์สรุป:    ${SUMMARY_FILE}`);
  console.log("\nเริ่มรันการทดสอบ...\n");

  for (let i = 0; i < testSet.length; i++) {
    const item = testSet[i];
    printProgress(i, testSet.length, globalStart);

    const question    = item.question    || item.query || item.text || "";
    const groundTruth = item.ground_truth || item.answer || item.expected || "";
    const category    = item.category    || item.type  || "general";
    const id          = item.id          ?? i + 1;

    if (!question) {
      evalResults.push({
        id,
        category,
        question,
        ground_truth:      groundTruth,
        retrieved_sources: [],
        generated_answer:  null,
        keyword_score:     0,
        is_answered:       false,
        latency_seconds:   0,
        status:            "SKIPPED — empty question",
      });
      continue;
    }

    const itemStart      = Date.now();
    let generatedAnswer  = null;
    let retrievedSources = [];
    let status           = "OK";

    try {
      /**
       * getAnswer(question, chatHistory)
       * ฟังก์ชันนี้มาจาก ragHelper.js ของโปรเจกต์จริง
       * ส่ง chatHistory เป็น [] เพราะการทดสอบแต่ละข้อเป็น single-turn
       */
      const result = await getAnswer(question, []);

      // ragHelper.js ปัจจุบัน return เป็น string (response.answer)
      // ถ้าในอนาคตเปลี่ยนเป็น object ให้ปรับตรงนี้
      if (typeof result === "string") {
        generatedAnswer = result;
      } else if (result && typeof result === "object") {
        generatedAnswer  = result.answer ?? result.text ?? JSON.stringify(result);
        retrievedSources = (result.sourceDocuments ?? []).map(
          (doc) => doc?.metadata?.source ?? "unknown"
        );
      }
    } catch (err) {
      status          = `ERROR: ${err.message}`;
      generatedAnswer = null;
      console.error(`\n⚠️  [Q${id}] Error: ${err.message}`);
    }

    const latencySeconds = (Date.now() - itemStart) / 1000;
    const keywordScore   = computeKeywordScore(groundTruth, generatedAnswer ?? "");
    const answered       = isAnswered(generatedAnswer ?? "");

    evalResults.push({
      id,
      category,
      question,
      ground_truth:      groundTruth,
      retrieved_sources: retrievedSources,
      generated_answer:  generatedAnswer,
      keyword_score:     parseFloat(keywordScore.toFixed(4)),
      is_answered:       answered,
      latency_seconds:   parseFloat(latencySeconds.toFixed(3)),
      status,
    });

    // หน่วงเวลาเพื่อหลีกเลี่ยง rate-limit (ยกเว้นข้อสุดท้าย)
    if (i < testSet.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  // แสดง progress 100%
  printProgress(testSet.length, testSet.length, globalStart);
  console.log("\n");

  // ──────────────────────────────────────────────────────────────
  // 💾  บันทึกผลรายข้อ
  // ──────────────────────────────────────────────────────────────
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(evalResults, null, 2), "utf-8");
  console.log(`✅ บันทึก evaluation_output.json (${evalResults.length} รายการ) เรียบร้อยแล้ว`);

  // ──────────────────────────────────────────────────────────────
  // 📊  สร้างสรุปคะแนน
  // ──────────────────────────────────────────────────────────────
  const totalQuestions  = evalResults.length;
  const answered        = evalResults.filter((r) => r.is_answered).length;
  const errors          = evalResults.filter((r) => r.status.startsWith("ERROR")).length;
  const skipped         = evalResults.filter((r) => r.status.startsWith("SKIPPED")).length;
  const avgKeywordScore = evalResults.reduce((s, r) => s + r.keyword_score, 0) / totalQuestions;
  const avgLatency      = evalResults.reduce((s, r) => s + r.latency_seconds, 0) / totalQuestions;
  const totalElapsed    = (Date.now() - globalStart) / 1000;

  // คะแนนแยกตาม category
  const categories = {};
  for (const r of evalResults) {
    if (!categories[r.category]) {
      categories[r.category] = {
        total:             0,
        answered:          0,
        keyword_score_sum: 0,
        latency_sum:       0,
      };
    }
    const cat = categories[r.category];
    cat.total++;
    if (r.is_answered)       cat.answered++;
    cat.keyword_score_sum   += r.keyword_score;
    cat.latency_sum         += r.latency_seconds;
  }

  const categoryStats = Object.entries(categories).map(([name, c]) => ({
    category:          name,
    total:             c.total,
    answered:          c.answered,
    answer_rate_pct:   parseFloat(((c.answered / c.total) * 100).toFixed(1)),
    avg_keyword_score: parseFloat((c.keyword_score_sum / c.total).toFixed(4)),
    avg_latency_s:     parseFloat((c.latency_sum / c.total).toFixed(3)),
  }));

  const summary = {
    run_at:                    new Date().toISOString(),
    total_questions:           totalQuestions,
    answered,
    errors,
    skipped,
    answer_rate_pct:           parseFloat(((answered / totalQuestions) * 100).toFixed(1)),
    avg_keyword_score:         parseFloat(avgKeywordScore.toFixed(4)),
    avg_latency_seconds:       parseFloat(avgLatency.toFixed(3)),
    total_elapsed_seconds:     parseFloat(totalElapsed.toFixed(1)),
    delay_between_requests_ms: DELAY_MS,
    model:                     process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    category_stats:            categoryStats,
  };

  fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2), "utf-8");

  // ──────────────────────────────────────────────────────────────
  // 🖨️  แสดงผลสรุปใน console
  // ──────────────────────────────────────────────────────────────
  console.log("============================================================");
  console.log("                  📊 สรุปผลการทดสอบ");
  console.log("============================================================");
  console.log(`  คำถามทั้งหมด       : ${totalQuestions} ข้อ`);
  console.log(`  ตอบได้ (is_answered): ${answered} ข้อ (${summary.answer_rate_pct}%)`);
  console.log(`  Error              : ${errors} ข้อ`);
  console.log(`  Skipped            : ${skipped} ข้อ`);
  console.log(`  Avg Keyword Score  : ${summary.avg_keyword_score}`);
  console.log(`  Avg Latency        : ${summary.avg_latency_seconds}s`);
  console.log(`  เวลารวมทั้งหมด      : ${totalElapsed.toFixed(1)}s`);
  console.log("------------------------------------------------------------");
  console.log("  Category Breakdown:");
  categoryStats.forEach((c) => {
    console.log(`    ${c.category}: ${c.answered}/${c.total} (${c.answer_rate_pct}%)`);
  });
  console.log("============================================================");
  console.log(`\n📁 evaluation_output.json  → ${OUTPUT_FILE}`);
  console.log(`📁 evaluation_summary.json → ${SUMMARY_FILE}`);
}

// ──────────────────────────────────────────────────────────────
// ▶️  Entry point
// ──────────────────────────────────────────────────────────────
runRAGEvaluation()
  .then(() => {
    console.log("\n✅ การทดสอบเสร็จสมบูรณ์!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n🔴 เกิดข้อผิดพลาดร้ายแรง:", err);
    process.exit(1);
  });
