const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");

const DATA_DIR = path.join(__dirname, "..", "data");
const OUTPUT_FILE = path.join(DATA_DIR, "cleaned_data.json");

async function convertFile(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  let text = "";

  if (fileName.endsWith(".pdf")) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    text = data.text;
  } else if (fileName.endsWith(".txt")) {
    text = fs.readFileSync(filePath, "utf-8");
  } else {
    return null;
  }

  text = text.replace(/\n\s*\n/g, '\n').trim();

  return {
    text: text,
    metadata: {
      source: fileName,
      converted_at: new Date().toISOString(),
      academic_year: "TODO",
      category: "TODO"
    }
  };
}

async function run() {
  const files = fs.readdirSync(DATA_DIR);
  const results = [];

  for (const file of files) {
    if (file === "cleaned_data.json" || file === "admission_rules_sample.json" || file === "README.md") continue;

    console.log(`Converting: ${file}...`);
    try {
      const converted = await convertFile(file);
      if (converted) {
        results.push(converted);
      }
    } catch (err) {
      console.error(`Error converting ${file}:`, err.message);
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), "utf-8");
  console.log(`\nSuccess! Converted data saved to: ${OUTPUT_FILE}`);
}

run();
