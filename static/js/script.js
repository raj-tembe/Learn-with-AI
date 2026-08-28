/* ============================================================================
   LEARN WITH AI — WORKSPACE JAVASCRIPT ENGINE
   Cohere Enterprise Design System Integration
   ============================================================================ */

const appState = {
  sessionId: null,
  currentTone: 'default',
  currentLevel: 'beginner',
  documents: [],
  chatHistory: [],
  selectedSources: [],
  dbInitialized: false,
  isLoading: false,
  currentTab: 'sources',
  theme: localStorage.getItem('theme') || 'light',
  tones: [],
  levels: [],
  selectedFiles: [],
};

/* ============================================================================
   INITIALIZATION
   ============================================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  await initializeApp();
});

async function initializeApp() {
  // Set initial theme
  applyTheme(appState.theme);

  // Bind event listeners
  bindEventListeners();

  // Create new session
  await createNewSession();

  // Load initial documents
  await loadDocuments();

  // Initialize markdown & math renderer
  initializeMarkdownRenderer();
}

async function createNewSession() {
  try {
    const response = await fetch('/api/session/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();

    if (data.success) {
      appState.sessionId = data.session_id;
      appState.tones = data.tones || [];
      appState.levels = data.levels || [];

      // Populate dropdowns
      populateToneDropdown(appState.tones);
      populateLevelDropdown(appState.levels);

      // Update UI
      updateContextInfo();
    } else {
      showToast('Failed to create session', 'error');
    }
  } catch (error) {
    console.error('Error creating session:', error);
    showToast('Error initializing workspace session', 'error');
  }
}

function populateToneDropdown(tones) {
  const selectors = ['tone-selector', 'settings-tone'];
  selectors.forEach((id) => {
    const select = document.getElementById(id);
    if (select) {
      select.innerHTML = tones
        .map(
          (tone) =>
            `<option value="${tone}" ${tone === appState.currentTone ? 'selected' : ''}>${tone.charAt(0).toUpperCase() + tone.slice(1)}</option>`
        )
        .join('');
    }
  });
}

function populateLevelDropdown(levels) {
  const selectors = ['level-selector', 'settings-level'];
  selectors.forEach((id) => {
    const select = document.getElementById(id);
    if (select) {
      select.innerHTML = levels
        .map(
          (level) =>
            `<option value="${level}" ${level === appState.currentLevel ? 'selected' : ''}>${level.charAt(0).toUpperCase() + level.slice(1)}</option>`
        )
        .join('');
    }
  });
}

/* ============================================================================
   EVENT BINDINGS
   ============================================================================ */

function bindEventListeners() {
  // Tab Navigation
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const tab = e.currentTarget.dataset.tab;
      if (tab) switchTab(tab);
    });
  });

  // Buttons
  const addSourceBtn = document.getElementById('add-source-btn');
  if (addSourceBtn) addSourceBtn.addEventListener('click', openAddSourceModal);

  const newSessionBtn = document.getElementById('new-session-btn');
  if (newSessionBtn) newSessionBtn.addEventListener('click', createNewSession);

  const resetSessionBtn = document.getElementById('reset-session-btn');
  if (resetSessionBtn) resetSessionBtn.addEventListener('click', resetSession);

  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) settingsBtn.addEventListener('click', openSettingsModal);

  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);

  const settingsResetBtn = document.getElementById('settings-reset-btn');
  if (settingsResetBtn) settingsResetBtn.addEventListener('click', resetSession);

  // Chat composer attach button
  const attachBtn = document.getElementById('attach-source-btn');
  if (attachBtn) attachBtn.addEventListener('click', openAddSourceModal);

  // Sources search filter
  const sourcesSearch = document.getElementById('sources-search-input');
  if (sourcesSearch) {
    sourcesSearch.addEventListener('input', (e) => {
      filterDocuments(e.target.value);
    });
  }

  // Upload Zone bindings
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');
  if (uploadZone && fileInput) {
    uploadZone.addEventListener('click', (e) => {
      if (e.target.id !== 'file-input') fileInput.click();
    });
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.currentTarget.classList.add('active');
    });
    uploadZone.addEventListener('dragleave', (e) => {
      e.currentTarget.classList.remove('active');
    });
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.currentTarget.classList.remove('active');
      handleFileSelection(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', (e) => {
      handleFileSelection(e.target.files);
    });
  }

  const uploadBtn = document.getElementById('upload-btn');
  if (uploadBtn) uploadBtn.addEventListener('click', uploadSources);

  // Empty state launchpad drag & drop bindings
  const emptyStateLaunchpad = document.getElementById('sources-empty-state');
  if (emptyStateLaunchpad) {
    emptyStateLaunchpad.addEventListener('dragover', (e) => {
      e.preventDefault();
      emptyStateLaunchpad.style.borderColor = 'var(--action-blue)';
    });
    emptyStateLaunchpad.addEventListener('dragleave', () => {
      emptyStateLaunchpad.style.borderColor = '';
    });
    emptyStateLaunchpad.addEventListener('drop', (e) => {
      e.preventDefault();
      emptyStateLaunchpad.style.borderColor = '';
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        openAddSourceModal();
        handleFileSelection(e.dataTransfer.files);
      }
    });
  }

  // Settings modal theme switch toggle
  const settingsThemeToggle = document.getElementById('settings-theme-toggle');
  if (settingsThemeToggle) {
    settingsThemeToggle.addEventListener('change', (e) => {
      const newTheme = e.target.checked ? 'dark' : 'light';
      setTheme(newTheme);
    });
  }

  const settingsTone = document.getElementById('settings-tone');
  if (settingsTone) {
    settingsTone.addEventListener('change', (e) => {
      updateSettings(e.target.value, appState.currentLevel);
    });
  }

  const settingsLevel = document.getElementById('settings-level');
  if (settingsLevel) {
    settingsLevel.addEventListener('change', (e) => {
      updateSettings(appState.currentTone, e.target.value);
    });
  }

  // Chat input with auto-resize and Enter key listener
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + 'px';
    });
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  const sendBtn = document.getElementById('send-btn');
  if (sendBtn) sendBtn.addEventListener('click', sendMessage);

  const toneSelector = document.getElementById('tone-selector');
  if (toneSelector) {
    toneSelector.addEventListener('change', (e) => {
      appState.currentTone = e.target.value;
      updateSettings(e.target.value, appState.currentLevel, false);
    });
  }

  const levelSelector = document.getElementById('level-selector');
  if (levelSelector) {
    levelSelector.addEventListener('change', (e) => {
      appState.currentLevel = e.target.value;
      updateSettings(appState.currentTone, e.target.value, false);
    });
  }

  // Modals backdrop clicks
  const addModalBackdrop = document.getElementById('add-source-modal-backdrop');
  if (addModalBackdrop) {
    addModalBackdrop.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeAddSourceModal();
    });
  }

  const settingsModalBackdrop = document.getElementById('settings-modal-backdrop');
  if (settingsModalBackdrop) {
    settingsModalBackdrop.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeSettingsModal();
    });
  }

  const previewModalBackdrop = document.getElementById('preview-modal-backdrop');
  if (previewModalBackdrop) {
    previewModalBackdrop.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closePreviewModal();
    });
  }

  // Global search input (⌘K)
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
      }
    });
    searchInput.addEventListener('input', (e) => {
      filterDocuments(e.target.value);
    });
  }
}

/* ============================================================================
   NAVIGATION & TABS
   ============================================================================ */

function switchTab(tab) {
  appState.currentTab = tab;

  const tabMap = {
    sources: 'sources-tab',
    chat: 'chat-tab',
    studio: 'studio-tab',
    recent: 'recent-topics-tab',
    summaries: 'saved-summaries-tab',
  };

  Object.entries(tabMap).forEach(([t, elId]) => {
    const tabEl = document.getElementById(elId);
    if (tabEl) {
      if (t === tab) {
        tabEl.style.display = 'flex';
        tabEl.classList.remove('hidden');
      } else {
        tabEl.style.display = 'none';
        tabEl.classList.add('hidden');
      }
    }
  });

  // Update active sidebar nav item
  document.querySelectorAll('.sidebar-nav-item').forEach((btn) => {
    btn.classList.remove('active');
  });
  const activeNav = document.querySelector(`.sidebar-nav-item[data-tab="${tab}"]`);
  if (activeNav) activeNav.classList.add('active');

  // Re-render icons
  if (window.lucide) lucide.createIcons();

  // Chat tab specific focus & scroll
  if (tab === 'chat') {
    updateChatUI();
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    const chatInput = document.getElementById('chat-input');
    if (chatInput) setTimeout(() => chatInput.focus(), 80);
  }
}

function copySummaryText(btn) {
  const card = btn.closest('.summary-card');
  if (!card) return;
  const title = card.querySelector('.summary-title')?.textContent || '';
  const body = card.querySelector('.summary-snippet')?.textContent || '';
  const textToCopy = `${title}\n\n${body}`.trim();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast('✓ Summary copied to clipboard', 'info');
    });
  } else {
    showToast('✓ Summary selected', 'info');
  }
}

/* ============================================================================
   SOURCES MANAGEMENT
   ============================================================================ */

async function loadDocuments() {
  try {
    const response = await fetch('/api/documents/list', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();

    if (data.success) {
      appState.documents = data.documents || [];
      renderDocuments();
      updateContextInfo();
    }
  } catch (error) {
    console.error('Error loading documents:', error);
  }
}

function renderDocuments() {
  const container = document.getElementById('sources-list');
  const emptyState = document.getElementById('sources-empty-state');
  const toolbar = document.getElementById('sources-toolbar');
  const headerInfo = document.getElementById('sources-header-info');
  const chatActiveCount = document.getElementById('chat-active-sources-count');
  const groundingChips = document.getElementById('chat-grounding-chips');

  const docs = appState.documents || [];
  const totalCount = docs.length;

  if (headerInfo) {
    headerInfo.textContent = `${totalCount} source${totalCount === 1 ? '' : 's'} loaded`;
  }

  if (chatActiveCount) {
    if (appState.selectedSources.length === 0) {
      chatActiveCount.textContent = `${totalCount} source${totalCount === 1 ? '' : 's'} active`;
    } else {
      chatActiveCount.textContent = `${appState.selectedSources.length} of ${totalCount} active`;
    }
  }

  // Render grounding bar chips in Chat tab
  if (groundingChips) {
    if (totalCount === 0) {
      groundingChips.innerHTML = `<span style="font-size:12px;color:var(--text-muted);">No sources added yet</span>`;
    } else {
      const isAllActive = appState.selectedSources.length === 0;
      let chipsHTML = `
        <div class="grounding-chip ${isAllActive ? 'active' : ''}" onclick="selectAllSources();" title="Search across all sources">
          ✓ All (${totalCount})
        </div>
      `;

      docs.forEach((doc, idx) => {
        const docId = doc.path || doc.name;
        const isSelected = appState.selectedSources.includes(docId);
        const icon = getDocumentIcon(doc);
        chipsHTML += `
          <div class="grounding-chip ${isSelected ? 'active' : ''}" onclick="toggleSourceSelection(${idx});" title="Toggle ${escapeHtml(doc.name)}">
            <span>${icon}</span>
            <span>${escapeHtml(doc.name)}</span>
          </div>
        `;
      });
      groundingChips.innerHTML = chipsHTML;
    }
  }

  if (!container || !emptyState) return;

  if (totalCount === 0) {
    container.style.display = 'none';
    emptyState.style.display = 'flex';
    emptyState.style.flexDirection = 'column';
    if (toolbar) toolbar.style.display = 'none';
    return;
  }

  container.style.display = 'grid';
  emptyState.style.display = 'none';
  if (toolbar) toolbar.style.display = 'flex';

  const selectionStatus = document.getElementById('sources-selection-status');
  if (selectionStatus) {
    selectionStatus.textContent = appState.selectedSources.length === 0
      ? `Scope: All (${totalCount})`
      : `Scope: ${appState.selectedSources.length} Focused`;
  }

  container.innerHTML = docs
    .map((doc, index) => createSourceCard(doc, index))
    .join('');

  // Click card to toggle specific search scoping
  document.querySelectorAll('.source-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.source-action-btn')) {
        toggleSourceSelection(parseInt(card.dataset.docIndex, 10));
      }
    });
  });

  // Chat with Source button
  document.querySelectorAll('.source-chat-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const docIndex = parseInt(btn.dataset.docIndex, 10);
      chatWithSource(docIndex);
    });
  });

  // Preview button
  document.querySelectorAll('.source-preview-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const docIndex = parseInt(btn.dataset.docIndex, 10);
      openPreviewModal(appState.documents[docIndex]);
    });
  });

  // Delete button
  document.querySelectorAll('.source-delete-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const docIndex = parseInt(btn.dataset.docIndex, 10);
      deleteDocument(docIndex);
    });
  });

  if (window.lucide) lucide.createIcons();
}

function createSourceCard(doc, index) {
  const docIdentifier = doc.path || doc.name;
  const isSelected = appState.selectedSources.includes(docIdentifier);
  const type = doc.type === 'file' ? getFileType(doc.name).toUpperCase() : 'WEB';
  const icon = getDocumentIcon(doc);

  return `
    <div class="source-card ${isSelected ? 'selected' : ''}" data-doc-index="${index}">
      <div class="source-card-header">
        <span class="source-card-type-badge">${icon} ${type}</span>
        <span class="source-card-status">● Grounded</span>
      </div>

      <div class="source-card-body">
        <div class="source-card-title" title="${escapeHtml(doc.name)}">${escapeHtml(doc.name)}</div>
        <div class="source-card-meta">
          <span>${doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active Session'}</span>
          <span>&bull;</span>
          <span>${isSelected ? '<strong style="color:#10B981;">Active Focus</strong>' : 'Ready for RAG'}</span>
        </div>
      </div>

      <div class="source-card-footer">
        <button class="source-action-btn source-chat-btn" data-doc-index="${index}" title="Ask AI Tutor about this document">
          💬 Chat
        </button>
        <div class="source-card-actions">
          <button class="source-action-btn source-preview-btn" data-doc-index="${index}" title="Preview Document">
            👁️ Preview
          </button>
          <button class="source-action-btn delete-btn source-delete-btn" data-doc-index="${index}" title="Remove Source">
            &times;
          </button>
        </div>
      </div>
    </div>
  `;
}

function chatWithSource(index) {
  const doc = appState.documents[index];
  if (!doc) return;
  const docId = doc.path || doc.name;
  appState.selectedSources = [docId];
  renderDocuments();
  updateSourceFilterBadge();
  switchTab('chat');

  const input = document.getElementById('chat-input');
  if (input) {
    input.placeholder = `Ask a question grounded specifically on ${doc.name}...`;
    input.focus();
  }
}

function selectAllSources() {
  appState.selectedSources = [];
  renderDocuments();
  updateSourceFilterBadge();
  showToast('Focused on all uploaded sources', 'info');
}

function toggleSourceSelection(index) {
  const doc = appState.documents[index];
  if (!doc) return;

  const docIdentifier = doc.path || doc.name;
  const idx = appState.selectedSources.indexOf(docIdentifier);

  if (idx > -1) {
    appState.selectedSources.splice(idx, 1);
  } else {
    appState.selectedSources.push(docIdentifier);
  }

  renderDocuments();
  updateSourceFilterBadge();
}

function clearSourceFilter() {
  appState.selectedSources = [];
  renderDocuments();
  updateSourceFilterBadge();
}

function updateSourceFilterBadge() {
  const badge = document.getElementById('chat-source-filter-badge');
  const nameEl = document.getElementById('chat-filter-name');
  if (!badge || !nameEl) return;

  if (appState.selectedSources.length === 0) {
    badge.style.display = 'none';
  } else {
    badge.style.display = 'inline-flex';
    nameEl.textContent = `${appState.selectedSources.length} selected source(s)`;
  }
}

function filterDocuments(query) {
  const q = (query || '').toLowerCase().trim();
  const container = document.getElementById('sources-list');
  if (!container) return;

  const items = container.querySelectorAll('.source-card');
  items.forEach((item) => {
    const docIndex = item.dataset.docIndex;
    const doc = appState.documents[docIndex];
    if (!doc) return;
    const matches = !q || doc.name.toLowerCase().includes(q) || (doc.type || '').toLowerCase().includes(q);
    item.style.display = matches ? 'flex' : 'none';
  });
}

function deleteDocument(index) {
  const doc = appState.documents[index];
  if (!doc) return;

  if (confirm(`Remove "${doc.name}" from this study session?`)) {
    const docIdentifier = doc.path || doc.name;
    appState.documents.splice(index, 1);
    appState.selectedSources = appState.selectedSources.filter((s) => s !== docIdentifier);

    renderDocuments();
    updateContextInfo();
    updateSourceFilterBadge();
    showToast(`✓ Removed ${doc.name}`, 'info');
  }
}

function getDocumentIcon(doc) {
  if (doc.type === 'wiki') return '🌐';
  const ext = getFileType(doc.name).toLowerCase();
  if (ext === 'pdf') return '📄';
  if (ext === 'csv') return '📊';
  if (ext === 'json') return '🔢';
  return '📝';
}

function getFileType(filename) {
  return filename ? filename.split('.').pop() : '';
}

function updateContextInfo() {
  const count = appState.documents ? appState.documents.length : 0;
  const sourcesCountEl = document.getElementById('sources-count');
  if (sourcesCountEl) {
    sourcesCountEl.textContent = `${count} source${count !== 1 ? 's' : ''}`;
  }
  const headerInfoEl = document.getElementById('sources-header-info');
  if (headerInfoEl) {
    headerInfoEl.textContent = `${count} indexed document${count !== 1 ? 's' : ''}`;
  }
}

/* ============================================================================
   FILE UPLOADS & INGESTION
   ============================================================================ */

function handleFileSelection(files) {
  appState.selectedFiles = Array.from(files);
  renderSelectedFiles();
}

function renderSelectedFiles() {
  const container = document.getElementById('selected-files-container');
  const list = document.getElementById('selected-files-list');
  if (!container || !list) return;

  if (appState.selectedFiles.length === 0) {
    container.style.display = 'none';
    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.value = '';
    return;
  }

  container.style.display = 'block';
  list.innerHTML = appState.selectedFiles
    .map(
      (file, index) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--soft-stone);border-radius:4px;border:1px solid var(--border-light);">
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(file.name)}</div>
        <div style="font-size:11px;color:var(--slate);">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
      </div>
      <button class="document-action-btn" onclick="removeSelectedFile(${index})" title="Remove">
        &times;
      </button>
    </div>
  `
    )
    .join('');
}

function removeSelectedFile(index) {
  appState.selectedFiles.splice(index, 1);
  renderSelectedFiles();
}

async function uploadSources() {
  if (appState.isLoading) return;

  const webSourceInput = document.getElementById('web-source-input');
  const webSource = webSourceInput ? webSourceInput.value.trim() : '';

  if (appState.selectedFiles.length === 0 && !webSource) {
    showToast('Please select files or enter a Wikipedia / Web link', 'warning');
    return;
  }

  appState.isLoading = true;
  const uploadBtn = document.getElementById('upload-btn');
  if (uploadBtn) {
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';
  }

  const formData = new FormData();
  appState.selectedFiles.forEach((file) => {
    formData.append('files', file);
  });
  if (webSource) {
    formData.append('wiki_links', webSource);
  }

  try {
    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();

    if (data.success) {
      showToast(`✓ ${data.uploaded_files + data.wiki_links} source(s) added`, 'success');

      // Reset form
      appState.selectedFiles = [];
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
      if (webSourceInput) webSourceInput.value = '';
      renderSelectedFiles();

      // Reload document list
      await loadDocuments();

      // Start ingestion into Chroma vector DB
      await ingestDocuments();

      closeAddSourceModal();
    } else {
      showToast(data.error || 'Upload failed', 'error');
    }
  } catch (error) {
    console.error('Error uploading:', error);
    showToast('Upload error', 'error');
  } finally {
    appState.isLoading = false;
    if (uploadBtn) {
      uploadBtn.disabled = false;
      uploadBtn.textContent = 'Add Sources';
    }
  }
}

async function ingestDocuments() {
  try {
    const progressCont = document.getElementById('upload-progress-container');
    const progressItems = document.getElementById('upload-progress-items');
    if (progressCont && progressItems) {
      progressCont.style.display = 'block';
      progressItems.innerHTML = `
        <div style="text-align:center;padding:12px;">
          <div style="font-size:13px;font-weight:600;margin-bottom:4px;">Indexing &amp; Vectorizing Knowledge Base...</div>
          <div style="font-size:11px;color:var(--slate);">Generating embeddings with sentence-transformers</div>
        </div>
      `;
    }

    const response = await fetch('/api/documents/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();

    if (data.success) {
      appState.dbInitialized = true;
      showToast('✓ Knowledge base indexed & ready for AI Tutor', 'success');
      if (progressCont) progressCont.style.display = 'none';
    } else {
      showToast(data.error || 'Ingestion failed', 'error');
    }
  } catch (error) {
    console.error('Error ingesting:', error);
    showToast('Ingestion error', 'error');
  }
}

async function loadSampleDataset() {
  if (appState.isLoading) return;
  appState.isLoading = true;
  showToast('⚡ Loading Quantum Computing demo notebook...', 'info');

  try {
    const res = await fetch('/api/documents/sample', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('✓ Quantum Computing Primer loaded', 'success');
      await loadDocuments();
      await ingestDocuments();
    } else {
      showToast(data.error || 'Error loading sample dataset', 'error');
    }
  } catch (err) {
    console.error('Sample loading error:', err);
    showToast('Failed to load sample dataset', 'error');
  } finally {
    appState.isLoading = false;
  }
}

function openAddSourceModal(mode = 'file') {
  const modal = document.getElementById('add-source-modal-backdrop');
  if (modal) modal.classList.add('active');
  if (mode === 'web') {
    const webInput = document.getElementById('web-source-input');
    if (webInput) {
      setTimeout(() => webInput.focus(), 150);
    }
  }
}

function closeAddSourceModal() {
  const modal = document.getElementById('add-source-modal-backdrop');
  if (modal) modal.classList.remove('active');
  appState.selectedFiles = [];
  const fileInput = document.getElementById('file-input');
  if (fileInput) fileInput.value = '';
  const webInput = document.getElementById('web-source-input');
  if (webInput) webInput.value = '';
  renderSelectedFiles();
}

function openPreviewModal(doc) {
  if (!doc) return;
  const titleEl = document.getElementById('preview-title');
  const metaEl = document.getElementById('preview-meta');
  const contentEl = document.getElementById('preview-content');

  if (titleEl) titleEl.textContent = doc.name;
  if (metaEl) metaEl.textContent = `${doc.type.toUpperCase()} • Indexed into session`;
  if (contentEl) {
    contentEl.innerHTML = `
      <div style="padding:16px;background:var(--bg-surface-alt);border:1px solid var(--border-color);border-radius:8px;font-family:var(--font-mono);font-size:13px;line-height:1.6;color:var(--text-main);">
        <strong>Document Path:</strong> ${escapeHtml(doc.path)}<br>
        <strong>Ingested At:</strong> ${doc.uploaded_at || 'Active Session'}<br><br>
        <p style="color:var(--text-muted);">
          This document is indexed in your private ephemeral Chroma vector database and active for grounded semantic search and cross-encoder re-ranking.
        </p>
      </div>
    `;
  }

  const modal = document.getElementById('preview-modal-backdrop');
  if (modal) modal.classList.add('active');
}

function closePreviewModal() {
  const modal = document.getElementById('preview-modal-backdrop');
  if (modal) modal.classList.remove('active');
}

function showComingSoonModal(featureName = 'Feature', featureDesc = '') {
  const modal = document.getElementById('coming-soon-modal-backdrop');
  const title = document.getElementById('coming-soon-feature-title');
  const desc = document.getElementById('coming-soon-feature-desc');

  if (title) title.textContent = `${featureName} - Coming Soon...`;
  if (desc && featureDesc) desc.textContent = featureDesc;
  if (modal) modal.classList.add('active');
}

function closeComingSoonModal() {
  const modal = document.getElementById('coming-soon-modal-backdrop');
  if (modal) modal.classList.remove('active');
}

/* ============================================================================
   AI TUTOR & CHAT
   ============================================================================ */

function askPrompt(promptText) {
  const chatInput = document.getElementById('chat-input');
  if (!chatInput) return;
  chatInput.value = promptText;
  sendMessage();
}

function clearChat() {
  appState.chatHistory = [];
  const messagesContainer = document.getElementById('chat-messages');
  if (messagesContainer) messagesContainer.innerHTML = '';
  updateChatUI();
  showToast('Chat history cleared', 'info');
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const question = input.value.trim();

  if (!question || appState.isLoading) return;

  // If no sources are uploaded yet, provide an intelligent onboarding response
  if (!appState.documents || appState.documents.length === 0) {
    addMessageToUI('user', question);
    input.value = '';
    setTimeout(() => {
      addMessageToUI(
        'assistant',
        `👋 **Welcome to Learn with AI!**\n\nTo provide strict, fact-grounded answers citing your exact material, I need at least one learning source.\n\nPlease click **[+ Add Source](#)** or the **Attach Source** button below to upload your PDFs, lecture notes, CSV data, JSON files, or paste a Wikipedia article.\n\nOnce added, I will instantly index your files and answer any question with verified page and row citations!`
      );
    }, 200);
    return;
  }

  // If documents exist but DB is not ingested yet, auto-ingest seamlessly
  if (!appState.dbInitialized) {
    showToast('⚙️ Vectorizing documents for chat...', 'info');
    await ingestDocuments();
  }

  appState.isLoading = true;
  input.disabled = true;
  const sendBtn = document.getElementById('send-btn');
  if (sendBtn) sendBtn.disabled = true;

  // Add User Message to UI
  addMessageToUI('user', question);
  input.value = '';

  // Add Thinking / Reranking Indicator
  const messagesContainer = document.getElementById('chat-messages');
  const thinkingMsg = document.createElement('div');
  thinkingMsg.className = 'chat-message';
  thinkingMsg.innerHTML = `
    <div class="chat-message-avatar">AI</div>
    <div class="chat-message-content">
      <div class="chat-message-label">Learn with AI Tutor &bull; Searching &amp; Cross-Encoder Re-Ranking...</div>
      <div class="chat-message-text">
        <span class="thinking-dots">
          <span>●</span> <span>●</span> <span>●</span>
        </span>
      </div>
    </div>
  `;
  if (messagesContainer) {
    messagesContainer.appendChild(thinkingMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  try {
    const response = await fetch('/api/chat/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: question,
        source_ids: appState.selectedSources,
      }),
    });
    const data = await response.json();

    if (data.success) {
      thinkingMsg.remove();

      addMessageToUI('assistant', data.response, data.citations || []);

      appState.chatHistory.push({
        user: question,
        assistant: data.response,
        citations: data.citations || [],
        tone: data.tone,
        level: data.level,
      });
    } else {
      thinkingMsg.remove();
      addMessageToUI(
        'assistant',
        `⚠️ **Retrieval Notice:** ${data.error || 'Could not retrieve answer from the current sources.'}`
      );
    }
  } catch (error) {
    console.error('Error sending message:', error);
    thinkingMsg.remove();
    showToast('Error communicating with AI Tutor', 'error');
  } finally {
    appState.isLoading = false;
    input.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
    input.focus();
  }
}

function addMessageToUI(role, content, citations = []) {
  const messagesContainer = document.getElementById('chat-messages');
  const emptyState = document.getElementById('chat-empty-state');
  if (!messagesContainer) return;

  if (emptyState) emptyState.style.display = 'none';

  const messageEl = document.createElement('div');
  messageEl.className = `chat-message ${role}`;

  if (role === 'user') {
    messageEl.innerHTML = `
      <div class="chat-message-avatar">U</div>
      <div class="chat-message-content">
        <div class="chat-message-label">You</div>
        <div class="chat-message-text">${escapeHtml(content)}</div>
      </div>
    `;
  } else {
    let renderedContent = content;
    if (window.md) {
      try {
        renderedContent = window.md.render(content);
      } catch (e) {
        renderedContent = escapeHtml(content);
      }
    }

    let citationsHTML = '';
    if (citations && citations.length > 0) {
      const uniqueSources = {};
      citations.forEach((c) => {
        if (c.source) {
          uniqueSources[c.source] = c;
        }
      });

      citationsHTML = `
        <div class="chat-message-sources">
          <span class="chat-message-sources-label">GROUNDED CITATIONS:</span>
          ${Object.values(uniqueSources)
            .map((c) => {
              let sourceText = (c.source || '').split('/').pop();
              if (c.page) sourceText += ` • p. ${c.page}`;
              if (c.row) sourceText += ` • row ${c.row}`;
              return `<span class="chat-message-source-item">📄 ${escapeHtml(sourceText)}</span>`;
            })
            .join('')}
        </div>
      `;
    }

    messageEl.innerHTML = `
      <div class="chat-message-avatar ai">AI</div>
      <div class="chat-message-content">
        <div class="chat-message-label">Learn with AI Tutor</div>
        <div class="chat-message-text markdown-content">${renderedContent}</div>
        ${citationsHTML}
      </div>
    `;
  }

  messagesContainer.appendChild(messageEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Render LaTeX formulas & syntax highlighting
  renderMathAndCode();
}

function updateChatUI() {
  const messagesContainer = document.getElementById('chat-messages');
  const emptyState = document.getElementById('chat-empty-state');
  if (!messagesContainer || !emptyState) return;

  if (appState.chatHistory.length === 0) {
    emptyState.style.display = 'flex';
  } else {
    emptyState.style.display = 'none';
  }
}

/* ============================================================================
   STUDY STUDIO SYNTHESIS
   ============================================================================ */

function handleStudioClick(type) {
  if (!appState.documents || appState.documents.length === 0) {
    showToast(`Please upload sources first to generate a ${type}`, 'warning');
    openAddSourceModal();
    return;
  }

  switchTab('chat');

  const prompts = {
    'Study Guide': 'Please generate a comprehensive, structured Study Guide covering all core topics, formulas, theorems, and chapter summaries from my uploaded sources.',
    'Flashcards': 'Please generate 8-10 high-yield active recall flashcards (in Question and Answer pairs) based strictly on my indexed documents.',
    'Quiz': 'Please create an interactive 5-question multiple choice practice quiz with detailed explanations based on my materials.',
    'Mind Map': 'Please generate a clear hierarchical text outline and Concept Map illustrating how the key topics in my sources connect.',
    'Notes': 'Please synthesize concise, bulleted executive revision notes and formula cheat sheets from my documents.',
    'Report': 'Please generate a structured academic briefing report synthesizing all uploaded sources with executive summary and key findings.',
  };

  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.value = prompts[type] || `Generate a ${type} based on my uploaded sources.`;
    sendMessage();
  }
}

/* ============================================================================
   SETTINGS & THEME
   ============================================================================ */

async function updateSettings(tone, level, showNotification = true) {
  try {
    const response = await fetch('/api/settings/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tone, level }),
    });
    const data = await response.json();

    if (data.success) {
      appState.currentTone = tone;
      appState.currentLevel = level;

      // Sync dropdowns
      const toneSel = document.getElementById('tone-selector');
      if (toneSel) toneSel.value = tone;
      const levelSel = document.getElementById('level-selector');
      if (levelSel) levelSel.value = level;
      const setTone = document.getElementById('settings-tone');
      if (setTone) setTone.value = tone;
      const setLevel = document.getElementById('settings-level');
      if (setLevel) setLevel.value = level;

      if (showNotification) showToast('✓ Persona settings updated', 'success');
    }
  } catch (error) {
    console.error('Error updating settings:', error);
  }
}

function toggleTheme() {
  const newTheme = appState.theme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

function setTheme(theme) {
  appState.theme = theme;
  applyTheme(theme);
  localStorage.setItem('theme', theme);

  const toggle = document.getElementById('settings-theme-toggle');
  if (toggle) toggle.checked = (theme === 'dark');

  const statusText = document.getElementById('settings-theme-status-text');
  if (statusText) {
    statusText.textContent = theme === 'dark' ? 'Dark theme is currently active' : 'Light canvas is currently active';
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);

  const icon = document.getElementById('theme-icon');
  if (icon) {
    if (theme === 'light') {
      icon.innerHTML = `
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      `;
    } else {
      icon.innerHTML = `
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      `;
    }
  }
}

async function resetSession() {
  if (confirm('Are you sure? This will clear all documents, vector embeddings, and chat history.')) {
    try {
      const response = await fetch('/api/session/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (data.success) {
        appState.sessionId = data.new_session_id;
        appState.documents = [];
        appState.chatHistory = [];
        appState.selectedSources = [];
        appState.dbInitialized = false;

        renderDocuments();
        updateChatUI();
        updateContextInfo();
        updateSourceFilterBadge();

        showToast('✓ Notebook reset', 'success');
        closeSettingsModal();
      }
    } catch (error) {
      console.error('Error resetting:', error);
      showToast('Error resetting notebook', 'error');
    }
  }
}

function openSettingsModal() {
  const toneEl = document.getElementById('settings-tone');
  if (toneEl) toneEl.value = appState.currentTone;
  const levelEl = document.getElementById('settings-level');
  if (levelEl) levelEl.value = appState.currentLevel;

  const toggle = document.getElementById('settings-theme-toggle');
  if (toggle) toggle.checked = (appState.theme === 'dark');

  const statusText = document.getElementById('settings-theme-status-text');
  if (statusText) {
    statusText.textContent = appState.theme === 'dark' ? 'Dark theme is currently active' : 'Light canvas is currently active';
  }

  const modal = document.getElementById('settings-modal-backdrop');
  if (modal) modal.classList.add('active');
}

function closeSettingsModal() {
  const modal = document.getElementById('settings-modal-backdrop');
  if (modal) modal.classList.remove('active');
}

/* ============================================================================
   MARKDOWN, MATH & TOASTS
   ============================================================================ */

function initializeMarkdownRenderer() {
  // Markdown-it is initialized in base.html
}

function renderMathAndCode() {
  if (typeof renderMathInElement !== 'undefined') {
    try {
      renderMathInElement(document.body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
        ],
      });
    } catch (e) {
      console.warn('KaTeX render error:', e);
    }
  }

  document.querySelectorAll('pre code').forEach((block) => {
    if (window.hljs) hljs.highlightElement(block);
  });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  toast.innerHTML = `
    <span>${icons[type] || 'ℹ'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}
