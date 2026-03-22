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
const { RunnableSequence, RunnablePassthrough } = require("@langchain/core/runnables");

const DATA_DIR = path.join(__dirname, "..", "data");
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

const client = new MongoClient(process.env.MONGO_URI || "");
const collection = client.db("cp_kku_rag").collection("admisstion_data");

let vectorStore = null;

const loadAndSplitDocuments = async () => {
  const files = fs.readdirSync(DATA_DIR);
  let allDocs = [];

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    let loader;

    if (file.endsWith(".pdf")) {
      loader = new PDFLoader(filePath);
    } else if (file.endsWith(".txt")) {
      loader = new TextLoader(filePath);
    } else {
      continue;
    }

    const docs = await loader.load();
    allDocs = allDocs.concat(docs);
  }

  if (allDocs.length === 0) {
    throw new Error("ไม่พบเอกสารใน data/ folder กรุณาเพิ่มไฟล์ .pdf หรือ .txt");
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });

  return splitter.splitDocuments(allDocs);
};

const buildVectorStore = async () => {
  if (vectorStore) return vectorStore;

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
      model: "models/gemini-2.5-flash",
      temperature: 0,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", `คุณคือผู้ช่วยตอบคำถามอัจฉริยะจากวิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น (CP KKU)
 
 แนวทางการตอบคำถาม:
- 1. **บุคลิก:** ตอบด้วยความสุภาพ เป็นทางการแต่เข้าถึงง่าย โดยให้ใช้ภาษาที่เป็นกลาง (Neutral) ไม่ระบุเพศ และ**ห้ามใช้คำลงท้าย "ครับ/ค่ะ" โดยเด็ดขาด** ให้เน้นความสุภาพผ่านการใช้ถ้อยคำที่เหมาะสมและเป็นมืออาชีพแทน
2. **การจัดรูปแบบ:** 
   - ใช้ **ตัวหนา** เพื่อเน้นจุดสำคัญ เช่น ชื่อสาขา วันที่ หรือตัวเลข
   - ใช้ bullet points หรือลำดับเลขเมื่อต้องบอกรายการต่างๆ เพื่อให้อ่านง่าย
   - **ห้ามใช้ Emojis โดยเด็ดขาด** ให้เน้นความสวยงามผ่านการจัดช่องไฟและตัวหนาเท่านั้น
3. **ความถูกต้องและปีการศึกษา:** 
   - ตอบโดยใช้ข้อมูลจากบริบท (Context) ที่กำหนดให้เท่านั้น 
   - **สำคัญมาก:** ให้ระบุด้วยเสมอว่าข้อมูลที่ตอบนั้นอ้างอิงสำหรับ **"ปีการศึกษาใด"** (เช่น "อ้างอิงจากข้อมูลปีการศึกษา 2568-2569") หากใน Context มีระบุไว้
4. **การแนะนำเว็บไซต์:** 
   - ให้แนะนำลิงก์เว็บไซต์คณะโดยตรงคือ https://computing.kku.ac.th/bsc-entrance เพื่อดูรายละเอียดหลักสูตรและเกณฑ์เฉพาะของวิทยาลัย
   - พร้อมทั้งแนะนำเว็บไซต์การรับสมัคร มข. (ส่วนกลาง) คือ https://admissions.kku.ac.th เพื่อติดตามสถานะและประกาศภาพรวมของมหาวิทยาลัย
5. ตอบตามภาษาที่ผู้ใช้ถาม
Context:
{context}`],
      new MessagesPlaceholder("chat_history"),
      ["human", "{input}"],
    ]);

    const combineDocsChain = await createStuffDocumentsChain({
      llm,
      prompt,
    });

    const retriever = RunnableSequence.from([
      (input) => input.input,
      store.asRetriever(4),
    ]);

    const chain = await createRetrievalChain({
      retriever,
      combineDocsChain,
    });

    console.log(`Querying: "${question}"`);
    const response = await chain.invoke({
      input: question,
      chat_history: chatHistory,
    });

    return response.answer || "ขออภัย ไม่สามารถหาคำตอบได้ในขณะนี้";
  } catch (err) {
    console.error("Detailed error in getAnswer:", err);
    throw err;
  }
};

const syncKnowledgeBase = async () => {
  try {
    await client.connect();
    console.log("Syncing knowledge base: Clearing existing documents...");
    await collection.deleteMany({});
    
    vectorStore = null; // Reset vectorStore to force rebuild
    await buildVectorStore();
    
    const count = await collection.countDocuments();
    return { success: true, message: `Knowledge base synced successfully. Now contains ${count} chunks.` };
  } catch (err) {
    console.error("Error syncing knowledge base:", err);
    throw err;
  }
};

module.exports = { getAnswer, syncKnowledgeBase };
