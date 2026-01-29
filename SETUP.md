# Learn with AI - Installation & Setup Guide

## 🎯 Quick Setup (5 minutes)

### 1. Get Gemini API Key
```bash
# Visit: https://makersuite.google.com/app/apikey
# Click "Create API key"
# Copy the key
```

### 2. Create .env File
Create a file named `.env` in the root directory:
```env
GEMINI_API_KEY=your_api_key_here
SECRET_KEY=learn-with-ai-secret-2026
```

### 3. Install Dependencies
```bash
# Create virtual environment
python -m venv venv

# Activate it
source venv/bin/activate  # Linux/Mac
# OR
venv\Scripts\activate  # Windows

# Install packages
pip install -r requirments.txt
```

### 4. Run the App
```bash
python app.py
```

### 5. Open in Browser
Navigate to: http://localhost:5000

---

## 🎨 Features Overview

### AI Tones
- **Default**: Balanced, structured approach
- **Professional**: Academic and technical
- **Informal**: Friendly and casual
- **Encouraging**: Motivating and supportive

### Learning Levels
- **Beginner**: Simple, foundational explanations
- **Intermediate**: Balanced depth and detail
- **Advanced**: Complex, expert-level content

### Supported Formats
- PDF files (.pdf)
- Text files (.txt)
- CSV data (.csv)
- JSON documents (.json)
- Wikipedia & Wiki links

---

## 💡 Usage Tips

1. **Upload multiple documents** for comprehensive knowledge base
2. **Add wiki links** for additional context
3. **Choose appropriate tone** for your communication style
4. **Select learning level** for customized explanations
5. **Use specific questions** for better answers
6. **Review history** to learn from past conversations

---

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Use different port
python app.py --port 5001
```

### Import Errors
```bash
# Reinstall dependencies
pip install --upgrade -r requirments.txt
```

### API Key Issues
- Verify key is correct in .env
- Check you have quota remaining
- Ensure you're using valid key from makersuite.google.com

---

## 📊 Production Deployment

### Using Gunicorn
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Using Docker
```dockerfile
FROM python:3.11
WORKDIR /app
COPY . .
RUN pip install -r requirments.txt
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

---

## 📚 Documentation

- Full README: `readme.md`
- AI Tones Config: `tones.py`
- Vector DB Setup: `vectordatabase.py`
- Frontend Code: `static/js/script.js`
- Styling: `static/css/style.css`

---

**Happy Learning! 🚀**
