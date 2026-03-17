# 🎓 Admission RAG Chatbot – CP KKU

ระบบ Chatbot ตอบคำถามเกี่ยวกับระเบียบการรับสมัครเข้าศึกษา  
วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น  

ใช้เทคโนโลยี **RAG (Retrieval-Augmented Generation)** ผ่าน LangChain.js + OpenAI

---

## 🏗️ Tech Stack

| Layer     | Technology                              |
| --------- | --------------------------------------- |
| Frontend  | React 18 (CRA), Material UI 6, Axios    |
| Backend   | Node.js, Express, LangChain.js         |
| Database  | MongoDB (Mongoose)                      |
| AI / RAG  | Google Generative AI (Gemini + Embeddings) |

---

## 📁 Project Structure

```
├── rag-chatbot-frontend/                 # React Frontend (CRA)
│   └── src/
│       ├── api/            # Axios service
│       ├── components/     # ChatPage, ChatBubble
│       └── theme/          # MUI theme (Navy + Gold)
│
└── rag-chatbot-backend/                  # Express Backend
    ├── config/             # MongoDB connection
    ├── controllers/        # Request handlers
    ├── routes/             # Express routes
    ├── services/           # RAG pipeline (ragHelper.js)
    └── data/               # Place .pdf / .txt docs here
```

---

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone <repo-url>
cd Rag-Chatbot-CP-KKU

# Install backend
cd rag-chatbot-backend
npm install

# Install frontend
cd ../rag-chatbot-frontend
npm install
```

### 2. Environment Variables

**`rag-chatbot-backend/.env`**
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/rag-chatbot
GOOGLE_API_KEY=your_google_ai_studio_key_here
```

**`rag-chatbot-frontend/.env`**
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 3. Add Data Documents

วางไฟล์ `.pdf` หรือ `.txt` ที่เกี่ยวกับระเบียบการรับสมัครไว้ใน `rag-chatbot-backend/data/`

### 4. Run

```bash
# Terminal 1 – Backend
cd rag-chatbot-backend
npm run dev

# Terminal 2 – Frontend
cd rag-chatbot-frontend
npm run start
```

เปิด **http://localhost:3000** ได้เลย 🎉

---

## 📝 License

MIT
