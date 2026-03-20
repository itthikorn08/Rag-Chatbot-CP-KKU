const path = require("path");
const fs = require("fs");
const { ChatOpenAI, OpenAIEmbeddings } = require("@langchain/openai");
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { TextLoader } = require("langchain/document_loaders/fs/text");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
const { RetrievalQAChain } = require("langchain/chains");


const DATA_DIR = path.join(__dirname, "..", "data");
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

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

  console.log("Loading and splitting documents...");
  const splitDocs = await loadAndSplitDocuments();
  console.log(`Loaded ${splitDocs.length} chunks from documents`);

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);
  console.log("Vector store built successfully");

  return vectorStore;
};

/**
 * Main entry point – receives a question string and returns
 * an answer using the RAG pipeline (Retrieve → Generate).
 *
 * @param {string} question 
 * @returns {string} 
 */
const getAnswer = async (question) => {
  const store = await buildVectorStore();

  const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-3.5-turbo",
    temperature: 0,
  });

  const chain = RetrievalQAChain.fromLLM(llm, store.asRetriever(4), {
    returnSourceDocuments: false,
  });

  const response = await chain.invoke({ query: question });
  return response.text;
};

module.exports = { getAnswer };
