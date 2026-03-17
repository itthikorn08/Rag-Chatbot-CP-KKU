require("dotenv").config();
const { getAnswer } = require("./services/ragHelper_memory");

async function testMemory() {
  console.log("=== Testing Conversational Memory in RAG Pipeline ===\n");
  
  try {
    const history = [];

    // Turn 1
    const q1 = "CP KKU เปิดรับสมัครสาขาอะไรบ้าง?";
    console.log(`User: ${q1}`);
    const a1 = await getAnswer(q1, history);
    console.log(`Bot: ${a1}\n`);
    history.push({ role: "user", content: q1 });
    history.push({ role: "assistant", content: a1 });

    // Turn 2 (Contextual)
    const q2 = "จากที่บอกมา สาขาแรกคืออะไรนะ?";
    console.log(`User: ${q2}`);
    const a2 = await getAnswer(q2, history);
    console.log(`Bot: ${a2}\n`);

  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    process.exit(0);
  }
}

testMemory();
