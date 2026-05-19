require("dotenv").config();
const { syncKnowledgeBase, getAnswer } = require("./services/ragHelper");

async function run() {
  try {
    console.log("Starting full database sync...");
    const result = await syncKnowledgeBase();
    console.log("Sync result:", result);

    console.log("Waiting 30 seconds for Atlas to build the vector search index...");
    await new Promise((resolve) => setTimeout(resolve, 30000));

    console.log("Running test queries to verify retrieval...");
    const queries = [
      "CP KKU เปิดรับสมัครสาขาอะไรบ้าง?",
      "ค่าเทอม Cybersecurity เท่าไหร่?",
      "รอบ Portfolio โครงการทุนช้างเผือกคืออะไร?"
    ];

    for (const q of queries) {
      console.log(`\nQuery: "${q}"`);
      const answer = await getAnswer(q, []);
      console.log(`Answer:\n${answer}\n`);
    }

  } catch (err) {
    console.error("Error during sync/test:", err);
  } finally {
    process.exit(0);
  }
}

run();
