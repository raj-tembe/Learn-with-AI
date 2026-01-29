"""
Learn with AI - Flask Application
A RAG-based learning assistant with multi-document support
"""

from flask import Flask, render_template, request, jsonify, session
from dotenv import load_dotenv
import os
import tempfile
import shutil
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()
os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY")
os.environ["LANGCHAIN_TRACKING_V2"] = "true"

# Import necessary modules
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenAI
from tones import PROMPT_MAP, LEVELS
from vectordatabase import ingest_documents

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "learn-with-ai-secret-key-2026")

# Configuration
UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {'pdf', 'txt', 'csv', 'json'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Global variables for session management
session_data = {}


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def create_session():
    """Create a new user session"""
    session_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
    session_data[session_id] = {
        "db": None,
        "tone": "default",
        "level": "beginner",
        "documents": [],
        "created_at": datetime.now(),
        "last_activity": datetime.now()
    }
    return session_id


def cleanup_old_sessions():
    """Clean up sessions older than 1 hour"""
    cutoff_time = datetime.now() - timedelta(hours=1)
    to_delete = []
    for session_id, data in session_data.items():
        if data["created_at"] < cutoff_time:
            to_delete.append(session_id)
    for session_id in to_delete:
        del session_data[session_id]


@app.route('/')
def index():
    """Main page"""
    return render_template('index.html', tones=list(PROMPT_MAP.keys()), levels=LEVELS)


@app.route('/api/session/create', methods=['POST'])
def create_session_route():
    """Create a new session"""
    cleanup_old_sessions()
    session_id = create_session()
    session['session_id'] = session_id
    return jsonify({
        "success": True,
        "session_id": session_id,
        "tones": list(PROMPT_MAP.keys()),
        "levels": LEVELS
    })


@app.route('/api/settings/update', methods=['POST'])
def update_settings():
    """Update tone and level settings"""
    session_id = session.get('session_id')
    if not session_id or session_id not in session_data:
        return jsonify({"success": False, "error": "Invalid session"}), 400

    data = request.json
    tone = data.get('tone', 'default')
    level = data.get('level', 'beginner')

    if tone not in PROMPT_MAP:
        return jsonify({"success": False, "error": "Invalid tone"}), 400
    if level not in LEVELS:
        return jsonify({"success": False, "error": "Invalid level"}), 400

    session_data[session_id]['tone'] = tone
    session_data[session_id]['level'] = level
    session_data[session_id]['last_activity'] = datetime.now()

    return jsonify({
        "success": True,
        "tone": tone,
        "level": level
    })


@app.route('/api/documents/upload', methods=['POST'])
def upload_documents():
    """Upload documents"""
    session_id = session.get('session_id')
    if not session_id or session_id not in session_data:
        return jsonify({"success": False, "error": "Invalid session"}), 400

    uploaded_files = []
    errors = []

    # Handle file uploads
    if 'files' in request.files:
        files = request.files.getlist('files')
        for file in files:
            if file and allowed_file(file.filename):
                filename = f"{session_id}_{datetime.now().timestamp()}_{file.filename}"
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                uploaded_files.append(filepath)
                session_data[session_id]['documents'].append({
                    'name': file.filename,
                    'path': filepath,
                    'type': 'file',
                    'uploaded_at': datetime.now().isoformat()
                })
            elif file:
                errors.append(f"{file.filename} - File type not supported")

    # Handle wiki links
    wiki_links = request.form.getlist('wiki_links')
    for link in wiki_links:
        if link.strip():
            session_data[session_id]['documents'].append({
                'name': link,
                'path': link,
                'type': 'wiki',
                'uploaded_at': datetime.now().isoformat()
            })

    if not uploaded_files and not wiki_links:
        return jsonify({
            "success": False,
            "error": "No valid files or wiki links provided",
            "errors": errors
        }), 400

    session_data[session_id]['last_activity'] = datetime.now()

    return jsonify({
        "success": True,
        "uploaded_files": len(uploaded_files),
        "wiki_links": len(wiki_links),
        "total_documents": len(session_data[session_id]['documents']),
        "errors": errors
    })


@app.route('/api/documents/list', methods=['GET'])
def list_documents():
    """List uploaded documents"""
    session_id = session.get('session_id')
    if not session_id or session_id not in session_data:
        return jsonify({"success": False, "error": "Invalid session"}), 400

    documents = session_data[session_id]['documents']
    return jsonify({
        "success": True,
        "documents": documents,
        "total": len(documents)
    })


@app.route('/api/documents/ingest', methods=['POST'])
def ingest_documents_route():
    """Ingest documents into vector database"""
    session_id = session.get('session_id')
    if not session_id or session_id not in session_data:
        return jsonify({"success": False, "error": "Invalid session"}), 400

    documents = session_data[session_id]['documents']
    if not documents:
        return jsonify({"success": False, "error": "No documents to ingest"}), 400

    try:
        # Separate file paths and wiki links
        pdf_files = []
        text_files = []
        csv_files = []
        json_files = []
        wiki_links = []

        for doc in documents:
            if doc['type'] == 'wiki':
                wiki_links.append(doc['path'])
            else:
                filepath = doc['path']
                if filepath.endswith('.pdf'):
                    pdf_files.append(filepath)
                elif filepath.endswith('.txt'):
                    text_files.append(filepath)
                elif filepath.endswith('.csv'):
                    csv_files.append(filepath)
                elif filepath.endswith('.json'):
                    json_files.append(filepath)

        # Ingest documents
        persist_dir = os.path.join(UPLOAD_FOLDER, f"db_{session_id}")
        db = ingest_documents(
            pdf_files=pdf_files,
            text_files=text_files,
            csv_files=csv_files,
            json_files=json_files,
            wiki_links=wiki_links,
            persist_dir=persist_dir
        )

        session_data[session_id]['db'] = db
        session_data[session_id]['last_activity'] = datetime.now()

        return jsonify({
            "success": True,
            "message": "Documents ingested successfully",
            "documents_count": len(documents)
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Error ingesting documents: {str(e)}"
        }), 500


@app.route('/api/chat/ask', methods=['POST'])
def ask_question():
    """Ask a question to the AI"""
    session_id = session.get('session_id')
    if not session_id or session_id not in session_data:
        return jsonify({"success": False, "error": "Invalid session"}), 400

    data = request.json
    question = data.get('question', '').strip()

    if not question:
        return jsonify({"success": False, "error": "Question cannot be empty"}), 400

    # Check if documents are ingested
    db = session_data[session_id].get('db')
    if not db:
        return jsonify({
            "success": False,
            "error": "Please ingest documents first"
        }), 400

    try:
        tone = session_data[session_id]['tone']
        level = session_data[session_id]['level']

        # Get prompt template
        prompt_template = PROMPT_MAP.get(tone, PROMPT_MAP['default'])
        prompt = PromptTemplate.from_template(prompt_template)

        # Initialize LLM
        llm = ChatGoogleGenAI(
            model="gemini-2.5-flash",
            temperature=0.4,
            top_p=0.95
        )

        # Create chain
        output_parser = StrOutputParser()
        chain = prompt | llm | output_parser

        # Search for context
        context_docs = db.similarity_search(question, k=4)
        context = "\n".join([doc.page_content for doc in context_docs])

        # Generate response
        response = chain.invoke({
            "context": context,
            "question": question,
            "level": level
        })

        session_data[session_id]['last_activity'] = datetime.now()

        return jsonify({
            "success": True,
            "response": response,
            "tone": tone,
            "level": level,
            "sources": len(context_docs)
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Error processing question: {str(e)}"
        }), 500


@app.route('/api/session/info', methods=['GET'])
def session_info():
    """Get current session info"""
    session_id = session.get('session_id')
    if not session_id or session_id not in session_data:
        return jsonify({"success": False, "error": "Invalid session"}), 400

    data = session_data[session_id]
    return jsonify({
        "success": True,
        "session_id": session_id,
        "tone": data['tone'],
        "level": data['level'],
        "documents_count": len(data['documents']),
        "db_initialized": data['db'] is not None,
        "created_at": data['created_at'].isoformat(),
        "last_activity": data['last_activity'].isoformat()
    })


@app.route('/api/session/reset', methods=['POST'])
def reset_session():
    """Reset session"""
    session_id = session.get('session_id')
    if not session_id or session_id not in session_data:
        return jsonify({"success": False, "error": "Invalid session"}), 400

    # Clean up uploaded files
    persist_dir = os.path.join(UPLOAD_FOLDER, f"db_{session_id}")
    if os.path.exists(persist_dir):
        shutil.rmtree(persist_dir)

    # Delete session
    del session_data[session_id]
    session.pop('session_id', None)

    # Create new session
    new_session_id = create_session()
    session['session_id'] = new_session_id

    return jsonify({
        "success": True,
        "new_session_id": new_session_id
    })


@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle file too large error"""
    return jsonify({
        "success": False,
        "error": f"File too large. Maximum size: {MAX_FILE_SIZE / (1024*1024):.0f}MB"
    }), 413


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({"success": False, "error": "Endpoint not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({"success": False, "error": "Internal server error"}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)