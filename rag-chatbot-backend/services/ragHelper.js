const path = require("path");
const fs = require("fs");
const { MongoClient } = require("mongodb");
const { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { TextLoader } = require("langchain/document_loaders/fs/text");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { MongoDBAtlasVectorSearch } = require("@langchain/mongodb");
const { createRetrievalChain } = require("langchain/chains/retrieval");
const { createStuffDocumentsChain } = require("langchain/chains/combine_documents");
const { ChatPromptTemplate, MessagesPlaceholder } = require("@langchain/core/prompts");
const { RunnableSequence } = require("@langchain/core/runnables");

const DATA_DIR = path.join(__dirname, "..", "data");
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

let client = null;
let collection = null;

const getMongoConfig = () => {
  if (client && collection) {
    return { client, collection };
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is not defined in environment variables. Please check your .env file.");
  }

  client = new MongoClient(mongoUri);
  collection = client.db("cp_kku_rag").collection("admisstion_data");
  return { client, collection };
};

let vectorStore = null;

const loadAndSplitDocuments = async () => {
  const files = fs.readdirSync(DATA_DIR);
  let allDocs = [];

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    console.log(`Processing file for indexing: ${file}`);
    let loader;

    try {
      if (file.endsWith(".pdf")) {
        loader = new PDFLoader(filePath);
        const docs = await loader.load();
        allDocs = allDocs.concat(docs.map(doc => ({ ...doc, metadata: { ...doc.metadata, source: file } })));
      } else if (file.endsWith(".txt") || file.endsWith(".md")) {
        loader = new TextLoader(filePath);
        const docs = await loader.load();
        allDocs = allDocs.concat(docs.map(doc => ({ ...doc, metadata: { ...doc.metadata, source: file } })));
      } else if (file.endsWith(".json")) {
        const content = fs.readFileSync(filePath, "utf-8");
        const jsonData = JSON.parse(content);

        if (Array.isArray(jsonData)) {
          jsonData.forEach((item, index) => {
            if (item.text) {
              allDocs.push({
                pageContent: item.text,
                metadata: { ...(item.metadata || {}), source: file, index }
              });
            } else if (item.responses && (item.responses.detailed_response || item.responses.short_response)) {
              const trainingPhrases = Array.isArray(item.training_phrases) ? item.training_phrases.join(", ") : "";
              const keywords = Array.isArray(item.keywords) ? item.keywords.join(", ") : "";
              const shortResponse = item.responses.short_response || "";
              const detailedResponse = item.responses.detailed_response || "";

              let formattedText = "";
              if (item.intent) formattedText += `เจตนา (Intent): ${item.intent}\n`;
              if (trainingPhrases) formattedText += `ตัวอย่างคำถาม/คำค้นหา: ${trainingPhrases}\n`;
              if (keywords) formattedText += `คำสำคัญ: ${keywords}\n`;
              if (shortResponse) formattedText += `คำตอบย่อ: ${shortResponse}\n`;
              if (detailedResponse) formattedText += `คำตอบละเอียด: ${detailedResponse}`;

              allDocs.push({
                pageContent: formattedText.trim(),
                metadata: {
                  source: file,
                  index,
                  intent: item.intent || "",
                  category: "FAQ"
                }
              });
            }
          });
        } else if (jsonData.text) {
          allDocs.push({
            pageContent: jsonData.text,
            metadata: { ...(jsonData.metadata || {}), source: file }
          });
        } else if (typeof jsonData === "object" && jsonData !== null) {
          allDocs.push({
            pageContent: JSON.stringify(jsonData, null, 2),
            metadata: { source: file, category: "Raw JSON" }
          });
        }
      }
    } catch (err) {
      console.error(`Error loading ${file}:`, err.message);
    }
  }

  if (allDocs.length === 0) {
    throw new Error("ไม่พบข้อความที่สามารถนำไปทำ Index ได้");
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });

  return await splitter.splitDocuments(allDocs);
};

const buildVectorStore = async () => {
  if (vectorStore) return vectorStore;

  const { client, collection } = getMongoConfig();

  try {
    await client.connect();
  } catch (e) {
    console.error("MongoDB Connection Error:", e);
  }

  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY,
    modelName: "gemini-embedding-001",
  });

  vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
    collection: collection,
    indexName: "vector_index",
    textKey: "text",
    embeddingKey: "embedding",
  });

  const count = await collection.countDocuments();
  if (count === 0) {
    console.log("No documents found in Atlas. Loading and indexing documents...");
    const splitDocs = await loadAndSplitDocuments();
    await vectorStore.addDocuments(splitDocs);
    console.log(`Indexed ${splitDocs.length} chunks to MongoDB Atlas`);
  } else {
    console.log(`Knowledge storage ready (Found ${count} chunks in Atlas)`);
  }

  return vectorStore;
};

const getAnswer = async (question, chatHistory = []) => {
  try {
    const store = await buildVectorStore();
    const apiKey = process.env.GOOGLE_API_KEY?.trim();

    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY is missing in .env");
    }

    const llm = new ChatGoogleGenerativeAI({
      apiKey: apiKey,
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      temperature: 0.1,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are the official QA assistant for the College of Computing, Khon Kaen University (CP KKU) 🎓✨.

[Core Rules]
1. RAG First: Answer strictly based on the retrieved Context below. Never invent or extrapolate facts not in Context. If information is missing or insufficient, politely state that you do not have that specific information.
2. Language Matching: Always reply in the exact language the user asks (Thai -> Thai, English -> English).
3. Tone & Persona: 
   - When answering in Thai: Use polite feminine particles only ("ค่ะ", "นะคะ"), NEVER use "ครับ". Friendly, helpful, like an academic senior/advisor.
   - When answering in English: Warm, professional, natural (no Thai particles).
4. Academic Year Priority: If the user asks about a specific academic year (e.g. 2569), prioritize that data. If not specified, use the most recent year available in the Context and mention the year clearly.


[Retrieved Context]
{context}`
      ],
      new MessagesPlaceholder("chat_history"),
      ["human", "{input}"],
    ]);

    const combineDocsChain = await createStuffDocumentsChain({
      llm,
      prompt,
    });

    // Retrieve top 4 most relevant chunks to drastically reduce token usage
    const retriever = RunnableSequence.from([
      (input) => input.input,
      store.asRetriever(4),
    ]);

    const chain = await createRetrievalChain({
      retriever,
      combineDocsChain,
    });

    // Keep only last 4 messages in history to save tokens
    const recentHistory = Array.isArray(chatHistory) ? chatHistory.slice(-4) : [];

    console.log(`\n======================================================================`);
    console.log(`🔍 [RAG RETRIEVAL] Querying Vector Store for: "${question}"`);
    console.log(`💬 Chat History Length: ${recentHistory.length} messages`);
    console.log(`======================================================================`);

    const startTime = Date.now();
    const response = await chain.invoke({
      input: question,
      chat_history: recentHistory,
    });
    const duration = Date.now() - startTime;

    const docs = response.context || [];
    console.log(`\n📦 [RETRIEVED CONTEXT] Found ${docs.length} relevant chunks (${duration}ms):`);
    if (docs.length === 0) {
      console.log(`⚠️ No relevant documents found in Vector Store.`);
    } else {
      docs.forEach((doc, idx) => {
        const meta = doc.metadata || {};
        console.log(`\n📄 Chunk [${idx + 1}/${docs.length}]`);
        console.log(`   Source: ${meta.source || "unknown"}`);
        if (meta.academic_year) console.log(`   Academic Year: ${meta.academic_year}`);
        if (meta.round) console.log(`   Round: ${meta.round}`);
        if (meta.admission_type) console.log(`   Admission Type: ${meta.admission_type}`);
        if (meta.category) console.log(`   Category: ${meta.category}`);
        if (meta.major) console.log(`   Major: ${meta.major}`);
      });
    }

    console.log(`\n🤖 [GENERATED ANSWER] (${duration}ms):`);
    console.log(`----------------------------------------------------------------------`);
    console.log(response.answer);
    console.log(`======================================================================\n`);

    return response.answer || "ขออภัย ไม่สามารถหาคำตอบได้ในขณะนี้";
  } catch (err) {
    console.error("Detailed error in getAnswer:", err);
    throw err;
  }
};

const syncKnowledgeBase = async () => {
  try {
    const { client, collection } = getMongoConfig();
    await client.connect();
    console.log("Syncing knowledge base: Clearing existing documents...");
    await collection.deleteMany({});

    vectorStore = null;
    await buildVectorStore();

    const count = await collection.countDocuments();
    console.log(`Knowledge base synced: ${count} chunks indexed.`);

    return { success: true, message: `Knowledge base synced successfully. Now contains ${count} chunks.` };
  } catch (err) {
    console.error("Error syncing knowledge base:", err);
    throw err;
  }
};

module.exports = { getAnswer, syncKnowledgeBase };
