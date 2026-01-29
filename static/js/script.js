/* ===========================
   Global State Management
   =========================== */

const state = {
    sessionId: null,
    currentTone: 'default',
    currentLevel: 'beginner',
    documents: [],
    chatHistory: [],
    dbInitialized: false,
    isLoading: false
};

/* ===========================
   Initialization
   =========================== */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Learn with AI...');
    await initializeSession();
    setupEventListeners();
    setupDragAndDrop();
    loadChatHistory();
});

async function initializeSession() {
    try {
        const response = await fetch('/api/session/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (data.success) {
            state.sessionId = data.session_id;
            console.log('Session created:', state.sessionId);
            showToast('Session initialized', 'success');
        }
    } catch (error) {
        console.error('Error creating session:', error);
        showToast('Error initializing session', 'error');
    }
}

function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // File input
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', handleFileSelect);

    // Upload area click and drag
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('click', () => fileInput.click());
    }
}

function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    if (!uploadArea) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.style.borderColor = 'var(--primary-color)';
            uploadArea.style.background = 'rgba(99, 102, 241, 0.1)';
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.style.borderColor = '';
            uploadArea.style.background = '';
        });
    });

    uploadArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        document.getElementById('fileInput').files = files;
        handleFileSelect({ target: { files } });
    });
}

/* ===========================
   Tab Navigation
   =========================== */

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab
    const tab = document.getElementById(tabName);
    if (tab) {
        tab.classList.add('active');
    }

    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
}

/* ===========================
   Setup Tab Functions
   =========================== */

async function selectTone(tone) {
    const toneButtons = document.querySelectorAll('.tone-btn');
    toneButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tone="${tone}"]`).classList.add('active');

    state.currentTone = tone;
    await updateSettings();
}

async function selectLevel(level) {
    const levelButtons = document.querySelectorAll('.level-btn');
    levelButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-level="${level}"]`).classList.add('active');

    state.currentLevel = level;
    await updateSettings();
}

async function updateSettings() {
    try {
        const response = await fetch('/api/settings/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tone: state.currentTone,
                level: state.currentLevel
            })
        });

        const data = await response.json();
        if (data.success) {
            showToast(`Settings updated: ${data.tone} tone, ${data.level} level`, 'success');
        }
    } catch (error) {
        console.error('Error updating settings:', error);
        showToast('Error updating settings', 'error');
    }
}

/* ===========================
   Documents Tab Functions
   =========================== */

function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length === 0) return;

    const allowedExtensions = ['pdf', 'txt', 'csv', 'json'];
    let validFiles = [];
    let errors = [];

    for (let file of files) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (allowedExtensions.includes(ext)) {
            validFiles.push(file);
        } else {
            errors.push(`${file.name} - Not supported`);
        }
    }

    if (errors.length > 0) {
        errors.forEach(error => showToast(error, 'warning'));
    }

    uploadFiles(validFiles);
}

async function uploadFiles(files) {
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
        const response = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            showToast(`${data.uploaded_files} file(s) uploaded`, 'success');
            listDocuments();
        } else {
            showToast(data.error || 'Upload failed', 'error');
        }
    } catch (error) {
        console.error('Error uploading files:', error);
        showToast('Error uploading files', 'error');
    }
}

async function addWikiLink() {
    const wikiInput = document.getElementById('wikiInput');
    const link = wikiInput.value.trim();

    if (!link) {
        showToast('Please enter a wiki link', 'warning');
        return;
    }

    if (!isValidUrl(link)) {
        showToast('Please enter a valid URL', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('wiki_links', link);

    try {
        const response = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            showToast('Wiki link added', 'success');
            wikiInput.value = '';
            listDocuments();
        }
    } catch (error) {
        console.error('Error adding wiki link:', error);
        showToast('Error adding wiki link', 'error');
    }
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

async function listDocuments() {
    try {
        const response = await fetch('/api/documents/list');
        const data = await response.json();

        if (data.success) {
            state.documents = data.documents;
            renderDocumentsList();

            // Show/hide ingest button
            const ingestBtn = document.getElementById('ingestBtn');
            if (data.total > 0) {
                ingestBtn.style.display = 'block';
            } else {
                ingestBtn.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error listing documents:', error);
    }
}

function renderDocumentsList() {
    const list = document.getElementById('documentsList');
    const emptyState = `
        <p class="empty-state">
            <i class="fas fa-inbox"></i>
            No documents uploaded yet
        </p>
    `;

    if (state.documents.length === 0) {
        list.innerHTML = emptyState;
        return;
    }

    list.innerHTML = state.documents.map(doc => `
        <div class="document-item">
            <div class="document-icon">
                ${doc.type === 'wiki' ? '<i class="fas fa-globe"></i>' : getFileIcon(doc.name)}
            </div>
            <div class="document-info">
                <div class="document-name">${doc.name}</div>
                <div class="document-type">${doc.type.toUpperCase()}</div>
            </div>
            <button class="document-remove" onclick="removeDocument('${doc.name}')" title="Remove">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'pdf': '<i class="fas fa-file-pdf"></i>',
        'txt': '<i class="fas fa-file-alt"></i>',
        'csv': '<i class="fas fa-table"></i>',
        'json': '<i class="fas fa-code"></i>'
    };
    return icons[ext] || '<i class="fas fa-file"></i>';
}

async function removeDocument(docName) {
    state.documents = state.documents.filter(doc => doc.name !== docName);
    renderDocumentsList();
    showToast('Document removed', 'info');
}

async function ingestDocuments() {
    if (state.documents.length === 0) {
        showToast('No documents to ingest', 'warning');
        return;
    }

    const ingestBtn = document.getElementById('ingestBtn');
    const ingestStatus = document.getElementById('ingestStatus');

    ingestBtn.style.display = 'none';
    ingestStatus.style.display = 'flex';
    state.isLoading = true;

    try {
        const response = await fetch('/api/documents/ingest', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (data.success) {
            state.dbInitialized = true;
            ingestStatus.style.display = 'none';
            showToast('Documents processed successfully! Ready to chat.', 'success');
            switchTab('chat');
        } else {
            showToast(data.error || 'Error processing documents', 'error');
            ingestBtn.style.display = 'block';
            ingestStatus.style.display = 'none';
        }
    } catch (error) {
        console.error('Error ingesting documents:', error);
        showToast('Error processing documents', 'error');
        ingestBtn.style.display = 'block';
        ingestStatus.style.display = 'none';
    } finally {
        state.isLoading = false;
    }
}

/* ===========================
   Chat Functions
   =========================== */

function handleChatKeypress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const question = chatInput.value.trim();

    if (!question) {
        showToast('Please enter a question', 'warning');
        return;
    }

    if (!state.dbInitialized) {
        showToast('Please ingest documents first', 'warning');
        return;
    }

    // Add user message to chat
    addChatMessage(question, 'user');
    chatInput.value = '';

    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;
    state.isLoading = true;

    // Update status
    document.getElementById('statusText').textContent = 'Thinking...';

    try {
        const response = await fetch('/api/chat/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question })
        });

        const data = await response.json();
        if (data.success) {
            addChatMessage(data.response, 'assistant');
            saveToHistory(question, data.response);
            document.getElementById('statusText').textContent = `${data.tone} tone • ${data.level} level • ${data.sources} sources`;
        } else {
            addChatMessage(`Error: ${data.error}`, 'assistant');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        addChatMessage('Sorry, an error occurred. Please try again.', 'assistant');
    } finally {
        sendBtn.disabled = false;
        state.isLoading = false;
    }
}

function addChatMessage(message, sender) {
    const chatMessages = document.getElementById('chatMessages');

    // Remove welcome message if present
    const welcome = chatMessages.querySelector('.chat-welcome');
    if (welcome) {
        welcome.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    messageDiv.innerHTML = `<div class="chat-bubble">${escapeHtml(message)}</div>`;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function saveToHistory(question, response) {
    const historyItem = {
        question,
        response,
        timestamp: new Date().toLocaleString(),
        tone: state.currentTone,
        level: state.currentLevel
    };

    state.chatHistory.push(historyItem);
    localStorage.setItem('chatHistory', JSON.stringify(state.chatHistory));
    loadChatHistory();
}

function loadChatHistory() {
    const saved = localStorage.getItem('chatHistory');
    state.chatHistory = saved ? JSON.parse(saved) : [];
    renderHistoryList();
}

function renderHistoryList() {
    const historyList = document.getElementById('historyList');
    const clearBtn = document.getElementById('clearHistoryBtn');

    if (state.chatHistory.length === 0) {
        historyList.innerHTML = `
            <p class="empty-state">
                <i class="fas fa-inbox"></i>
                No chat history yet
            </p>
        `;
        clearBtn.style.display = 'none';
        return;
    }

    clearBtn.style.display = 'block';
    historyList.innerHTML = state.chatHistory.map((item, index) => `
        <div class="history-item" onclick="viewHistoryItem(${index})">
            <div class="history-question">${escapeHtml(item.question)}</div>
            <div class="history-time">${item.timestamp}</div>
        </div>
    `).join('');
}

function viewHistoryItem(index) {
    const item = state.chatHistory[index];
    switchTab('chat');

    // Add messages to chat
    setTimeout(() => {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';
        addChatMessage(item.question, 'user');
        addChatMessage(item.response, 'assistant');
    }, 100);
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all chat history?')) {
        state.chatHistory = [];
        localStorage.removeItem('chatHistory');
        renderHistoryList();
        showToast('Chat history cleared', 'success');
    }
}

/* ===========================
   Session Management
   =========================== */

async function resetSession() {
    if (confirm('Are you sure? This will clear all documents and start a new session.')) {
        try {
            const response = await fetch('/api/session/reset', {
                method: 'POST'
            });

            const data = await response.json();
            if (data.success) {
                state.sessionId = data.new_session_id;
                state.documents = [];
                state.dbInitialized = false;
                state.chatHistory = [];
                document.getElementById('chatMessages').innerHTML = `
                    <div class="chat-welcome">
                        <i class="fas fa-robot"></i>
                        <h3>Welcome to Learn with AI</h3>
                        <p>Upload documents first, then start asking questions!</p>
                    </div>
                `;
                renderDocumentsList();
                showToast('New session started', 'success');
                switchTab('setup');
            }
        } catch (error) {
            console.error('Error resetting session:', error);
            showToast('Error resetting session', 'error');
        }
    }
}

/* ===========================
   Toast Notifications
   =========================== */

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-times-circle',
        warning: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };

    toast.innerHTML = `
        <i class="toast-icon ${icons[type]}"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

/* ===========================
   Utility Functions
   =========================== */

function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
}

console.log('Learn with AI script loaded successfully');