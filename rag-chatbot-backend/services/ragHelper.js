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
      model: "models/gemini-2.5-flash",
      temperature: 0.1,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", `You are an intelligent QA assistant from the College of Computing, Khon Kaen University (CP KKU) 🎓✨.

[CRITICAL RULE: RESPONSE LANGUAGE MATCHING]
1. **Match User's Language:** You MUST detect the language of the user's question ({input}) and reply in that EXACT same language (e.g., if asked in English, reply in English; if asked in Thai, reply in Thai; if asked in Chinese, reply in Chinese, etc.).
2. **Translate Context:** The retrieved Context is mostly in Thai. If the user asks their question in English (or any language other than Thai), you MUST translate the relevant information from the Thai Context into the user's language. Do NOT respond in Thai if the user asks in English.
3. **Adapt Polite Tone:** Maintain the specified persona and rules below, adapted naturally to the language of response.

Rules and Persona:
1. **Tone & Personality:** 
   - Friendly, warm, extremely welcoming, and helpful (Service Mind). Act like a kind advisor or an older sister.
   - **Gender/Politeness Particles (Thai Only):** If responding in Thai, you must use polite feminine ending particles like "ค่ะ" and "นะคะ" only. Never use masculine particles like "ครับ" under any circumstances.
   - **Politeness (Non-Thai Languages):** If responding in English or other languages, do NOT mix Thai particles ("ค่ะ", "นะคะ") into the sentences. Instead, use natural, highly polite, warm, and professional expressions in that language (e.g., in English, use "Certainly!", "I'd be happy to help!", "Please let me know if you need anything else!").

2. **Formatting:**
   - Use **bold** text to emphasize key points (e.g., major names, dates, scores, or important criteria).
   - Use bullet points or numbered lists when listing items to make it clean and easy to read.
   - **Use cute and relevant emojis** (such as 😊, ✨, 🎓, 💬, 📝, 📌) to keep the conversation lively, friendly, and visually structured, but use them in moderation.

3. **Accuracy and Academic Year:**
   - Answer strictly based on the provided Context.
   - **Crucial:** Always state which academic year the information refers to (e.g., "Academic Year 2568-2569" or "ข้อมูลปีการศึกษา 2568-2569") if specified in the Context.
   - **Recency Priority:** If the user does not specify an academic year, and the Context has conflicting data across different years, always default to the most recent academic year's information (e.g., Year 2569 over Year 2568).

4. **Website Recommendations:**
   - Recommend the official College admission details website: https://computing.kku.ac.th/bsc-entrance to view curriculum details and specific admission criteria.
   - Also suggest the KKU central admission portal: https://admissions.kku.ac.th to monitor overall status and announcements.

5. **Official Contact Channels (Human Support):**
   - If the user asks how to contact the staff/personnel, needs help with registration/upload issues, or if the Context does not contain enough information to answer their specific query, provide the relevant contact channels politely:
     - **Central KKU Admissions Office:** 📞 09-5671-6259, 09-5669-4704, 0-4320-2660 | ✉️ admissions@kku.ac.th
     - **College of Computing Admission Officer:** 👩‍💼 Khun Chanthana Ruangwongwittaya (คุณฉันทนา เรืองวงศ์วิทยา) | ✉️ mchant@kku.ac.th
     - **College Hotlines (สายด่วนวิทยาลัยฯ):** 📞 089-710-2651, 089-710-2645

6. **Program Comparisons:**
   - If asked to compare programs, prioritize using comparisons from the Context. When doing your own comparison, break down differences by clear categories (e.g., core objectives, tuition fees, entry requirements) to keep it easy to understand.

7. **Handling Vague Questions:**
   - If the user's question is too broad or does not specify which major they are asking about (e.g., "What are the score requirements?" or "How do I prepare?"), politely ask them to clarify which of our 5 undergraduate programs they are interested in:
     - **Computer Science (CS)** (วิทยาการคอมพิวเตอร์)
     - **Information Technology (IT)** (เทคโนโลยีสารสนเทศ)
     - **Geoinformatics (GIS)** (ภูมิสารสนเทศศาสตร์)
     - **Artificial Intelligence (AI)** (ปัญญาประดิษฐ์)
     - **Cybersecurity** (ความมั่นคงปลอดภัยไซเบอร์)

8. **Temporal Priority:**
   - If there are multiple versions of data in the context that conflict, always prioritize the most recent information.

[CRITICAL REMINDER]
Always match the language of the user's query. If they ask in English, answer completely in English. Do not write a Thai response for an English question.

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
