"""
Learn with AI - Flask Application
A RAG-based learning assistant with multi-document support
"""

from flask import Flask, render_template, request, jsonify, session, send_from_directory
from dotenv import load_dotenv
import os
import secrets
import tempfile
import shutil
import uuid
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

# .env.example / SETUP.md / readme.md all instruct users to set GEMINI_API_KEY,
# so read that here. langchain-google-genai itself looks for GOOGLE_API_KEY,
# so we forward the value into that variable for the library to pick up.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
TEST_MODE = os.getenv('TEST_MODE', '').lower() in ('1', 'true', 'yes')

# Allow running in TEST_MODE when external credentials or dependencies are unavailable.
if not GEMINI_API_KEY and not TEST_MODE:
    raise RuntimeError(
        "GEMINI_API_KEY is not set. Create a .env file (see .env.example) "
        "with GEMINI_API_KEY=your_api_key_here and restart the app, or set TEST_MODE=1 to run a UI-only server."
    )

if GEMINI_API_KEY:
    os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY
    os.environ["LANGCHAIN_TRACKING_V2"] = "true"

# Import necessary modules
try:
    from langchain_core.prompts import PromptTemplate
    from langchain_core.output_parsers import StrOutputParser
    from langchain_google_genai import ChatGoogleGenerativeAI
except Exception:
    PromptTemplate = None
    StrOutputParser = None
    ChatGoogleGenerativeAI = None

from tones import PROMPT_MAP, LEVELS

# vectordatabase is lightweight in this repo; keep import but tolerate failures during TEST_MODE runs
try:
    from vectordatabase import ingest_documents
except Exception:
    ingest_documents = None

try:
    from sentence_transformers import CrossEncoder
    reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
except Exception:
    reranker = None

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY") or secrets.token_hex(32)

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


@app.context_processor
def inject_feature_flags():
    """Inject feature flags into all templates dynamically"""
    return {
        'feature_recent_topics': os.getenv('FEATURE_RECENT_TOPICS', 'false').lower() in ('1', 'true', 'yes'),
        'feature_saved_summaries': os.getenv('FEATURE_SAVED_SUMMARIES', 'false').lower() in ('1', 'true', 'yes'),
    }


@app.route('/')
def index():
    """SaaS Landing Page for app.learnwithai.ai"""
    return render_template('index.html', tones=list(PROMPT_MAP.keys()), levels=LEVELS)


@app.route('/app')
@app.route('/workspace')
def app_workspace():
    """SaaS Application Workspace"""
    return render_template('app.html', tones=list(PROMPT_MAP.keys()), levels=LEVELS)


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
    existing_wiki = {d['path'] for d in session_data[session_id]['documents'] if d.get('type') == 'wiki'}
    for link in wiki_links:
        link_str = link.strip()
        if link_str and link_str not in existing_wiki:
            session_data[session_id]['documents'].append({
                'name': link_str,
                'path': link_str,
                'type': 'wiki',
                'uploaded_at': datetime.now().isoformat()
            })
            existing_wiki.add(link_str)

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


@app.route('/api/documents/sample', methods=['POST'])
def load_sample_document():
    """Load a sample quantum computing document for instant demonstration"""
    session_id = session.get('session_id')
    if not session_id or session_id not in session_data:
        session_id = str(uuid.uuid4())
        session['session_id'] = session_id
        session_data[session_id] = {
            'documents': [],
            'vectorstore': None,
            'chat_history': [],
            'settings': {'tone': 'default', 'level': 'beginner'},
            'last_activity': datetime.now()
        }

    sample_filename = "quantum_computing_primer.txt"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{sample_filename}")
    sample_content = (
        "Quantum Computing and Quantum Mechanics Primer\n\n"
        "1. Qubits and Superposition:\n"
        "Unlike classical bits which exist strictly as 0 or 1, quantum bits (qubits) exist in a superposition "
        "state represented mathematically as |psi> = alpha|0> + beta|1>, where |alpha|^2 + |beta|^2 = 1.\n\n"
        "2. Coherence and Decoherence Times:\n"
        "Superconducting transmon qubits operate in cryogenic dilution refrigerators at temperatures below 15 millikelvin. "
        "Energy relaxation time (T1) is approximately 90 microseconds, while dephasing decoherence time (T2) is approximately 120 microseconds.\n\n"
        "3. Quantum Algorithms:\n"
        "Shor's algorithm achieves polynomial time prime factorization O((log N)^3) compared to exponential classical algorithms. "
        "Grover's search algorithm achieves quadratic speedup O(sqrt(N)) for unstructured database queries.\n\n"
        "4. Quantum Error Correction:\n"
        "Surface codes protect quantum information across a two-dimensional grid of physical data and syndrome qubits "
        "with an error threshold of approximately 1%."
    )
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(sample_content)

    doc_entry = {
        'name': sample_filename,
        'path': filepath,
        'type': 'file',
        'uploaded_at': datetime.now().isoformat()
    }
    session_data[session_id]['documents'].append(doc_entry)
    session_data[session_id]['last_activity'] = datetime.now()

    return jsonify({
        "success": True,
        "document": doc_entry,
        "total_documents": len(session_data[session_id]['documents'])
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
    # Optional: restrict retrieval to selected sources (list of document names or paths)
    source_ids = data.get('source_ids') or []

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

        # Get prompt template (if available)
        prompt_template = PROMPT_MAP.get(tone, PROMPT_MAP['default'])

        # Search for context
        docs = db.similarity_search(question, k=10)

        # If the client provided source_ids (names or paths), filter the retrieved
        # chunks to only those that originate from the selected sources.
        if source_ids:
            allowed_paths = set()
            for docmeta in session_data[session_id]['documents']:
                if docmeta.get('name') in source_ids or docmeta.get('path') in source_ids:
                    allowed_paths.add(docmeta.get('path'))
            if allowed_paths:
                docs = [d for d in docs if d.metadata.get('source') in allowed_paths]

        if not docs:
            return jsonify({
                "success": False,
                "error": "No retrievable chunks found for the question with the selected sources."
            }), 400

        # Rerank if reranker is available
        if reranker is not None:
            pairs = [[question, doc.page_content] for doc in docs]
            scores = reranker.predict(pairs)
            scored_docs = list(zip(docs, scores))
            scored_docs = sorted(scored_docs, key=lambda x: x[1], reverse=True)
            reranked_docs = [doc for doc, score in scored_docs[:3]]
        else:
            # Fallback: take first three retrieved docs
            scored_docs = [(doc, 0.0) for doc in docs]
            reranked_docs = docs[:3]

        # Join context into text, preserving rerank order
        context = "\n\n".join(doc.page_content for doc in reranked_docs)

        # Generate response using Google Gemini or simulated fallback
        response = None
        formatted_prompt = prompt_template.format(
            context=context,
            question=question,
            level=level
        )

        try:
            from google import genai
            client = genai.Client()
            for model_name in ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"]:
                try:
                    res = client.models.generate_content(model=model_name, contents=formatted_prompt)
                    if res and res.text:
                        response = res.text
                        break
                except Exception as model_err:
                    continue
        except Exception:
            pass

        if not response and ChatGoogleGenerativeAI is not None and PromptTemplate is not None and StrOutputParser is not None:
            try:
                for model_name in ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-2.5-flash-lite"]:
                    try:
                        prompt = PromptTemplate.from_template(prompt_template)
                        llm = ChatGoogleGenerativeAI(model=model_name)
                        output_parser = StrOutputParser()
                        chain = prompt | llm | output_parser
                        response = chain.invoke({"context": context, "question": question, "level": level})
                        if response:
                            break
                    except Exception:
                        continue
            except Exception:
                pass

        if not response:
            snippet = context[:800].replace('\n', ' ')
            response = f"**Direct Answer:**\nBased on your documents, regarding **{question}**:\n\n{snippet}\n\n---\n*Note: Simulated grounded response for your {level} study session.*"

        # Build citation metadata from top-ranked chunks
        citations = []
        for doc, score in (scored_docs[:3] if scored_docs else [(d, 0.0) for d in reranked_docs]):
            m = getattr(doc, 'metadata', {}) or {}
            citation = {
                "source": m.get('source'),
                "source_type": m.get('source_type'),
                "score": float(score)
            }
            if 'page' in m:
                citation['page'] = m.get('page')
            if 'row' in m:
                citation['row'] = m.get('row')
            citations.append(citation)

        session_data[session_id]['last_activity'] = datetime.now()

        return jsonify({
            "success": True,
            "response": response,
            "tone": tone,
            "level": level,
            "sources": len(reranked_docs),
            "citations": citations
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


@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    """Serve uploaded files from the uploads folder."""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@app.route('/api/studio/generate', methods=['POST'])
def studio_generate():
    """Placeholder endpoint for Studio artifact generation.

    Returns 501 when backend generation is not implemented yet.
    """
    data = request.json or {}
    artifact_type = data.get('type')
    # For now, acknowledge request and return not-implemented
    return jsonify({
        "success": False,
        "error": "Studio generation not implemented on backend",
        "required": {
            "type": "string",
            "sources": "array of source ids or names",
            "instructions": "optional prompt"
        }
    }), 501


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
