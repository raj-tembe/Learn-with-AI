# Learn with AI - Quick Reference Guide

## 🚀 Quick Start (2 minutes)

```bash
# 1. Get API Key from https://makersuite.google.com/app/apikey

# 2. Create .env file
echo "GEMINI_API_KEY=your_key_here" > .env

# 3. Install and run
pip install -r requirments.txt
python app.py

# 4. Open http://localhost:5000
```

---

## 📋 Workflow Checklist

- [ ] Set AI Tone (Setup tab)
- [ ] Set Learning Level (Setup tab)
- [ ] Upload Documents (Documents tab)
- [ ] Add Wiki Links (Documents tab)
- [ ] Click "Ingest & Process" (Documents tab)
- [ ] Go to Chat tab
- [ ] Ask your first question
- [ ] Review Chat History (History tab)

---

## 🎯 Tone Quick Reference

| Tone | Icon | Use When | Key Feature |
|------|------|----------|-------------|
| Default | ⚖️ | General learning | Balanced approach |
| Professional | 💼 | Academic work | Technical depth |
| Informal | 😊 | Casual learning | Friendly tone |
| Encouraging | ⭐ | Need motivation | Supportive |

---

## 📚 Level Quick Reference

| Level | Icon | Explanation Style |
|-------|------|-------------------|
| Beginner | 🌱 | Simple, foundational |
| Intermediate | ⛰️ | Balanced detail |
| Advanced | 🚀 | Expert-level |

---

## 📁 File Format Support

| Format | Extension | Max Size | Best For |
|--------|-----------|----------|----------|
| PDF | `.pdf` | 50MB | Books, Papers |
| Text | `.txt` | 50MB | Notes |
| CSV | `.csv` | 50MB | Data |
| JSON | `.json` | 50MB | Configs |
| Web | URLs | - | Wikipedia, Wikis |

---

## 💻 API Endpoints

```
POST   /api/session/create      # Start new session
POST   /api/settings/update     # Change tone/level
POST   /api/documents/upload    # Upload files/links
GET    /api/documents/list      # List documents
POST   /api/documents/ingest    # Process documents
POST   /api/chat/ask            # Ask question
GET    /api/session/info        # Get session info
POST   /api/session/reset       # Start fresh
```

---

## 🛠️ Project Structure

```
Learn-with-AI/
├── app.py                 # Flask backend (400+ lines)
├── tones.py              # AI personalities (140 lines)
├── vectordatabase.py     # RAG pipeline (127 lines)
├── config.py             # Configuration (80+ lines)
├── template/
│   └── index.html        # UI (300+ lines)
├── static/
│   ├── css/
│   │   └── style.css     # Styles (700+ lines)
│   └── js/
│       └── script.js     # Logic (600+ lines)
├── requirments.txt       # Dependencies
└── uploads/              # Temp storage (auto-created)
```

---

## 🔑 Key Variables in Code

### State Management
```javascript
state.sessionId          // Current session ID
state.currentTone        // Selected tone
state.currentLevel       // Selected level
state.documents          // Uploaded documents
state.chatHistory        // Chat messages
state.dbInitialized      // Vector DB ready
```

### Session Data
```python
session_data[session_id] = {
    "db": None,                    # Vector database
    "tone": "default",             # AI tone
    "level": "beginner",           # Learning level
    "documents": [],               # Document list
    "created_at": datetime,        # Session creation
    "last_activity": datetime      # Last interaction
}
```

---

## 🎨 CSS Color Palette

```css
--primary-color: #6366f1       /* Indigo */
--primary-dark: #4f46e5        /* Dark Indigo */
--primary-light: #818cf8       /* Light Indigo */
--success-color: #10b981       /* Green */
--danger-color: #ef4444        /* Red */
--warning-color: #f59e0b       /* Amber */
--dark-bg: #0f172a             /* Dark Blue */
--light-bg: #f8fafc            /* Light Gray */
--text-primary: #1e293b        /* Dark Slate */
--text-secondary: #64748b      /* Medium Slate */
```

---

## 🧠 Core Concepts

### RAG (Retrieval-Augmented Generation)
```
1. Upload documents → Chunk them
2. Create embeddings → Store in vector DB
3. User asks question
4. Search for relevant chunks
5. Pass to LLM with chunks as context
6. Generate answer
```

### Session Flow
```
User → Creates Session → Uploads Docs → Ingests → Chats → History
```

### Question Processing
```
Question → Embedding → Vector Search → Top 4 chunks → LLM + Tone/Level → Response
```

---

## ⚡ Performance Tips

1. **Faster Responses**: Upload fewer, relevant documents
2. **Better Answers**: Be specific in questions
3. **Smoother UI**: Use modern browser (Chrome/Firefox)
4. **Lower Latency**: Keep documents under 10MB each
5. **Better Results**: Add multiple source types

---

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid Session" | Refresh page, create new session |
| "API Key Error" | Check .env file and API key |
| "File Too Large" | Max 50MB per file |
| "Format Not Supported" | Use PDF, TXT, CSV, JSON, or URL |
| "Slow Response" | Fewer documents, simpler questions |
| "Port in Use" | Use different port in app.py |

---

## 📊 Stats & Limits

| Metric | Value |
|--------|-------|
| Max File Size | 50MB |
| Session Timeout | 1 hour |
| Search Results | 4 chunks |
| Max LLM Tokens | 2048 |
| Notification Duration | 5 seconds |
| CSS Variables | 20+ |
| API Endpoints | 9 |
| Supported Formats | 5 |
| AI Tones | 4 |
| Learning Levels | 3 |

---

## 🔒 Security Checklist

- ✅ Session validation
- ✅ File type checking
- ✅ File size limits
- ✅ XSS prevention (HTML escape)
- ✅ Input validation
- ✅ Error handling
- ⚠️ Use HTTPS in production
- ⚠️ Rotate API keys regularly

---

## 📖 Documentation Files

| File | Content |
|------|---------|
| `readme.md` | Full documentation |
| `SETUP.md` | Installation guide |
| `IMPLEMENTATION.md` | Architecture overview |
| `FEATURES.md` | Detailed features |
| `config.py` | Configuration options |
| `QUICKREF.md` | This file |

---

## 🎓 Learning Resources

- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Backend**: Flask, LangChain, ChromaDB
- **AI**: Google Gemini, Vector Embeddings
- **Best Practices**: REST API design, Session management

---

## 💡 Pro Tips

1. **Custom Tones**: Edit `tones.py` to add more
2. **Theme Colors**: Change CSS variables for rebranding
3. **LLM Settings**: Adjust temperature in `app.py`
4. **Deployment**: Use Gunicorn + Nginx
5. **Scaling**: Add database persistence layer

---

## 🚀 Next Steps

1. Try different tone and level combinations
2. Upload your own documents
3. Review the code structure
4. Customize colors and styling
5. Add new AI tones
6. Deploy to production

---

## 📞 Quick Links

- 📖 Full README: `readme.md`
- 🛠️ Setup Guide: `SETUP.md`
- 📋 Features: `FEATURES.md`
- 🏗️ Implementation: `IMPLEMENTATION.md`
- ⚙️ Config: `config.py`

---

**Ready? Open http://localhost:5000 and start learning! 🎓🚀**
