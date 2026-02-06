# Learn with AI 🧠

A modern, user-friendly web application that brings the power of **NotebookLM-style learning** to life. Upload your documents and wiki links, choose your preferred AI tone, and get personalized explanations at your learning level.

## 🌟 Features

### Core Features
- **Multi-Document Support**: Upload PDF, TXT, CSV, JSON files and add Wikipedia/wiki links
- **AI Tone Selection**: Choose from 4 communication styles
  - 📊 **Default**: Balanced, structured approach
  - 💼 **Professional**: Academic and technical explanations
  - 😊 **Informal**: Friendly and casual tone
  - ⭐ **Encouraging**: Motivating and supportive guidance

- **Learning Levels**: Customize explanations for your expertise
  - 🌱 **Beginner**: Starting fresh, needs simple explanations
  - ⛰️ **Intermediate**: Some experience, balanced detail
  - 🚀 **Advanced**: Expert level, in-depth analysis

- **Chat Interface**: Ask unlimited questions about your documents
- **Chat History**: Review and replay previous conversations
- **Session Management**: Multiple independent learning sessions

### Technical Features
- 🔒 **Secure Session Management**: Each user gets an isolated session
- 📊 **Vector Database**: Semantic search for relevant context
- 🤖 **Google Gemini AI**: State-of-the-art LLM responses
- 🎨 **Modern UI**: Clean, responsive, intuitive interface
- 📱 **Mobile Friendly**: Works on desktop, tablet, and mobile
- ⚡ **Real-time Processing**: Instant document ingestion and responses

## 📋 Tech Stack

### Backend
- **Flask** - Python web framework
- **LangChain** - LLM orchestration and RAG
- **ChromaDB** - Vector database for semantic search
- **Google Gemini API** - AI model for responses
- **HuggingFace Embeddings** - Document embeddings

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with variables and animations
- **JavaScript** - Interactive UI and API communication
- **Font Awesome** - Beautiful icons

### Document Processing
- PyPDF2 - PDF handling
- BeautifulSoup - Web scraping
- LangChain Community Loaders - Multiple format support

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- pip (Python package manager)
- Google Gemini API Key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/raj-tembe/Learn-with-AI.git
cd Learn-with-AI
```

2. **Create a virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirments.txt
```

4. **Setup environment variables**
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_api_key_here
SECRET_KEY=your_secret_key_here
```

Get your Gemini API key from: https://makersuite.google.com/app/apikey

5. **Run the application**
```bash
python app.py
```

6. **Access the app**
Open your browser and navigate to: `http://localhost:5000`

## 📚 How to Use

### Step 1: Configure Preferences
1. Start at the **Setup** tab
2. Select your preferred **AI Tone**
3. Choose your **Learning Level**

### Step 2: Upload Documents
1. Go to the **Documents** tab
2. Upload files (PDF, TXT, CSV, JSON) by clicking or dragging
3. Add wiki links (e.g., Wikipedia articles)
4. Click **"Ingest & Process Documents"** when ready

### Step 3: Start Learning
1. Navigate to the **Chat** tab
2. Type your questions about the uploaded documents
3. Get AI-powered explanations tailored to your tone and level

### Step 4: Review History
1. Check the **History** tab to see previous conversations
2. Click any question to replay the conversation

## 🏗️ Project Structure

```
Learn-with-AI/
├── app.py                 # Main Flask application
├── tones.py              # AI tone templates
├── vectordatabase.py     # Document processing & embeddings
├── requirments.txt       # Python dependencies
├── readme.md             # This file
├── .env                  # Environment variables (create this)
├── template/
│   └── index.html        # Main HTML template
├── static/
│   ├── css/
│   │   └── style.css     # Comprehensive styling
│   └── js/
│       └── script.js     # Frontend JavaScript
└── uploads/              # Temporary storage (auto-created)
```

## 🔑 Key Components

### Backend

#### `app.py` - Flask Application
- Session management with isolated user contexts
- File upload handling with validation
- Document ingestion orchestration
- Chat API endpoints
- Error handling and security

#### `tones.py` - AI Personality Templates
Defines 4 different prompt templates for different communication styles.

#### `vectordatabase.py` - RAG Pipeline
- Document loaders (PDF, TXT, CSV, JSON, Web)
- Text chunking and embeddings
- Vector database creation
- Semantic search functionality

### Frontend

#### `index.html` - User Interface
- 4-tab interface (Setup, Documents, Chat, History)
- Responsive sidebar navigation
- Document upload with drag-and-drop
- Real-time chat interface
- Chat history viewer

#### `style.css` - Modern Styling
- CSS variables for theming
- Responsive grid layouts
- Smooth animations and transitions
- Dark-mode ready design
- Mobile-first approach

#### `script.js` - Client Logic
- API communication
- Session management
- File handling
- Chat message management
- Toast notifications
- Local storage for history

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main application page |
| `/api/session/create` | POST | Create new session |
| `/api/settings/update` | POST | Update tone & level |
| `/api/documents/upload` | POST | Upload files/wiki links |
| `/api/documents/list` | GET | List all documents |
| `/api/documents/ingest` | POST | Process documents |
| `/api/chat/ask` | POST | Ask question to AI |
| `/api/session/info` | GET | Get session info |
| `/api/session/reset` | POST | Reset session |

## 🎨 Customization

### Adding New Tones
Edit `tones.py`:
```python
custom_tone = """
Your custom prompt template here...
"""

PROMPT_MAP = {
    "default": default_tone,
    "professional": prof_tone,
    "informal": informal_tone,
    "encouraging": encouraging_tone,
    "custom": custom_tone  # Add here
}
```

### Changing Colors
Edit `style.css` CSS variables:
```css
:root {
    --primary-color: #6366f1;
    --primary-dark: #4f46e5;
    --success-color: #10b981;
    /* ... etc */
}
```

### Modifying LLM Settings
In `app.py`, adjust the ChatGoogleGenAI initialization:
```python
llm = ChatGoogleGenAI(
    model="gemini-2.5-flash",  # Change model
    temperature=0.4,            # Adjust creativity (0-1)
    top_p=0.95                  # Control diversity
)
```

## 📁 Supported Document Types

| Format | Extension | Handler |
|--------|-----------|---------|
| PDF | `.pdf` | PyPDFLoader |
| Text | `.txt` | TextLoader |
| CSV | `.csv` | CSVLoader |
| JSON | `.json` | JSONLoader |
| Web | URLs | BeautifulSoupWebLoader |

## ⚠️ Limitations & Notes

- Maximum file size: 50MB per file
- Sessions expire after 1 hour of inactivity
- Requires valid Google Gemini API key
- Internet connection required
- Documents are processed server-side

## 🚀 Performance Optimizations

- Session cleanup to remove old data
- Efficient vector similarity search (k=4)
- Lazy loading of documents
- Toast notification system for feedback
- Async/await for non-blocking operations

## 🐛 Troubleshooting

### Issue: API Key Error
**Solution**: Verify `GEMINI_API_KEY` in `.env` file and ensure it's valid.

### Issue: Documents not processing
**Solution**: Check file formats are supported and file size < 50MB.

### Issue: Slow responses
**Solution**: Reduce number of documents or disable other browser tabs.

### Issue: CORS errors
**Solution**: Ensure Flask is running on the correct port (5000).

## 📝 Future Enhancements

- [ ] Export chat history to PDF
- [ ] Multi-language support
- [ ] Advanced search filters
- [ ] Document annotation tools
- [ ] Real-time collaboration
- [ ] Custom LLM model selection
- [ ] Premium features & storage
- [ ] Mobile native app

## 📄 License

This project is open source and available under the AGPL-3.0 License.

## 👨‍💻 Contributing

Contributions are welcome! Please feel free to:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📧 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Email: r4jtembe@gmail.com

## 🙏 Acknowledgments

- Built with LangChain for RAG
- Google Gemini API for AI responses
- ChromaDB for vector storage
- HuggingFace for embeddings

---

**Made with ❤️ by Raj Tembe**

*Learn better, learn smarter, learn with AI!* 🚀
