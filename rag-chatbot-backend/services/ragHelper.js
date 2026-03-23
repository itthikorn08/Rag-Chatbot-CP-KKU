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
            }
          });
        } else if (jsonData.text) {
          allDocs.push({
            pageContent: jsonData.text,
            metadata: { ...(jsonData.metadata || {}), source: file }
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
      temperature: 0.1,
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
   - **ลำดับความสำคัญของข้อมูล:** ในกรณีที่ผู้ใช้ไม่ได้ระบุปีการศึกษาในคำถาม **ให้เลือกใช้และตอบด้วยข้อมูลของปีการศึกษาล่าสุดเสมอ** (เช่น ปี 2569) หากมีข้อมูลหลายปีขัดแย้งกัน
4. **การแนะนำเว็บไซต์:** 
   - ให้แนะนำลิงก์เว็บไซต์คณะโดยตรงคือ https://computing.kku.ac.th/bsc-entrance เพื่อดูรายละเอียดหลักสูตรและเกณฑ์เฉพาะของวิทยาลัย
   - พร้อมทั้งแนะนำเว็บไซต์การรับสมัคร มข. (ส่วนกลาง) คือ https://admissions.kku.ac.th เพื่อติดตามสถานะและประกาศภาพรวมของมหาวิทยาลัย
5. ตอบตามภาษาที่ผู้ใช้ถาม
6. **การเปรียบเทียบสาขา:** หากผู้ใช้ถามถึงความแตกต่างระหว่างสาขา ให้ดึงข้อมูลจาก Context ที่เป็นการเปรียบเทียบมาตอบเป็นอันดับแรก และหากต้องเปรียบเทียบเอง ให้ระบุความแตกต่างทีละหัวข้อ (เช่น วัตถุประสงค์หลัก, ค่าเทอม, เกณฑ์การรับ) เพื่อให้ข้อมูลที่ชัดเจนและไม่สับสน
7. **การจัดการคำถามที่ไม่ชัดเจน:** หากผู้ใช้ถามคำถามที่กว้างเกินไปหรือไม่ระบุสาขาที่ต้องการทราบอย่างชัดเจน (เช่น ถามแค่ "เกณฑ์คะแนนใช้เท่าไหร่?" หรือ "ต้องเตรียมตัวอย่างไร?") ให้ตอบกลับโดยขอความร่วมมือจากผู้ใช้ช่วยระบุสาขาที่สนใจจาก 5 สาขาของวิทยาลัย ได้แก่: **วิทยาการคอมพิวเตอร์ (CS)**, **เทคโนโลยีสารสนเทศ (IT)**, **ภูมิสารสนเทศศาสตร์ (GIS)**, **ปัญญาประดิษฐ์ (AI)** และ **ความมั่นคงปลอดภัยไซเบอร์ (Cybersecurity)** เพื่อให้ข้อมูลที่ถูกต้องแม่นยำที่สุด
8. **ลำดับความสำคัญของเวลา:** หากใน Context มีข้อมูลหลายเวอร์ชันที่ขัดแย้งกัน ให้ยึดถือข้อมูลที่ใหม่ที่สุดเป็นเกณฑ์
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
      store.asRetriever(10),
    ]);

    const chain = await createRetrievalChain({
      retriever,
      combineDocsChain,
    });

    console.log(`Querying with Vector Store: "${question}"`);
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
