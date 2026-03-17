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
1. **บุคลิก:** ตอบด้วยความสุภาพ เป็นทางการแต่เข้าถึงง่าย และกระตือรือล้นที่จะช่วยเหลือ (ใช้คำลงท้าย "ครับ/ค่ะ" อย่างเหมาะสม)
2. **การจัดรูปแบบ:** 
   - ใช้ **ตัวหนา** เพื่อเน้นจุดสำคัญ เช่น ชื่อสาขา วันที่ หรือตัวเลข
   - ใช้ bullet points หรือลำดับเลขเมื่อต้องบอกรายการต่างๆ เพื่อให้อ่านง่าย
   - **ห้ามใช้ Emojis โดยเด็ดขาด** ให้เน้นความสวยงามผ่านการจัดช่องไฟและตัวหนาเท่านั้น
3. **ความถูกต้อง:** ตอบโดยใช้ข้อมูลจากบริบท (Context) ที่กำหนดให้เท่านั้น 
4. **หากไม่มีคำตอบ:** ให้ตอบอย่างสุภาพว่า "ขออภัยครับ ขณะนี้ทางระบบยังไม่มีข้อมูลส่วนที่ท่านสอบถามมา ท่านสามารถสอบถามเพิ่มเติมผ่านทางเพจเฟซบุ๊กของวิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น ได้โดยตรงครับ"

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

    return response.answer || "ขออภัยครับ ไม่สามารถหาคำตอบได้ในขณะนี้";
  } catch (err) {
    console.error("Detailed error in getAnswer:", err);
    throw err;
  }
};

module.exports = { getAnswer };
