# 🎓 Admission RAG Chatbot – CP KKU

ระบบ Chatbot ตอบคำถามเกี่ยวกับระเบียบการรับสมัครเข้าศึกษา  
วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น  

ใช้เทคโนโลยี **RAG (Retrieval-Augmented Generation)** ผ่าน LangChain.js + Gemini AI

---

## ✨ Features

- **Retrieval-Augmented Generation (RAG):** ตอบคำถามจากฐานข้อมูลระเบียบการจริง
- **Admin & User Roles:** แยกส่วนผู้ใช้งานทั่วไปและผู้ดูแลระบบ
- **Admin Dashboard:** หน้าจอสำหรับจัดการไฟล์ความรู้ (.json) และสั่ง Sync Vector Database ผ่านหน้าเว็บ
- **JSON Data Support:** รองรับการจัดเก็บข้อมูลแบบโครงสร้าง (Structured Data) เพื่อความแม่นยำสูงสุด
- **Multi-language Support:** รองรับทั้งภาษาไทยและภาษาอังกฤษ (i18next)
- **Modern UI:** สวยงาม ใช้งานง่ายด้วย Material UI 6 และรองรับ Dark Mode

---

## 🏗️ Tech Stack

| Layer     | Technology                              |
| --------- | --------------------------------------- |
| Frontend  | React 18, Material UI 6, i18next, Axios |
| Backend   | Node.js, Express, LangChain.js, Multer  |
| Database  | MongoDB Atlas (Vector Search)           |
| Auth      | JWT (JSON Web Token), bcryptjs          |
| AI / RAG  | Google Generative AI (Gemini + Embeddings) |

---

## 📁 Project Structure

```
├── rag-chatbot-frontend/                 # React Frontend
│   └── src/
│       ├── api/            # Axios service & admin endpoints
│       ├── components/     # ChatPage, AdminPage, LoginPage
│       ├── context/        # AuthContext (Role-based)
│       ├── locales/        # i18n translations (TH/EN)
│       └── theme/          # Custom MUI theme
│
└── rag-chatbot-backend/                  # Express Backend
    ├── config/             # Database connection
    ├── controllers/        # Chat & Admin handlers
    ├── middleware/         # Auth & Admin protection
    ├── models/             # User & Chat schemas
    ├── routes/             # API routes
    ├── services/           # RAG logic (ragHelper.js)
    ├── scripts/            # Admin tools & migration scripts
    └── data/               # Knowledge base (.json)
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
MONGO_URI=mongodb+srv://... (MongoDB Atlas URI)
GOOGLE_API_KEY=your_google_ai_studio_key_here
JWT_SECRET=your_secret_key
```

### 3. Setup Admin User

สมัครสมาชิกผ่านหน้าเว็บตามปกติ จากนั้นรันสคริปต์เพื่อตั้งค่าตัวเองเป็น Admin:
```bash
cd rag-chatbot-backend
node scripts/make_admin.js your-email@example.com
```

### 4. Run

```bash
# Terminal 1 – Backend
cd rag-chatbot-backend
npm run dev

# Terminal 2 – Frontend
cd rag-chatbot-frontend
npm run start
```

---

## 🔑 Admin System

หากคุณล็อกอินด้วยไอดีที่เป็น Admin จะเห็นปุ่ม **"Go to Admin Dashboard"**
- **Upload:** อัปโหลดไฟล์ `.json` เข้าสู่โฟลเดอร์ `data/`
- **Sync:** กดปุ่ม Sync เพื่อให้ AI เริ่มเรียนรู้ข้อมูลใหม่
- **Manual Migration:** หากมีไฟล์ `.pdf` หรือ `.txt` สามารถใช้ `node scripts/convert_data.js` เพื่อแปลงเป็น JSON ได้

---

## 📝 License

MIT
