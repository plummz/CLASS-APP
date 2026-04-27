// ═══════════════════════════════════════════════════════════
// NOTEPAD - Module (Refactored to support Reviewers)
// ═══════════════════════════════════════════════════════════

window.notepadModule = {
  notes: [],
  reviewers: [],

  init: function() {
    this.loadNotes();
    this.render();
  },

  loadNotes: function() {
    const saved = localStorage.getItem('notepad-notes');
    this.notes = saved ? JSON.parse(saved) : [];
  },

  saveNotes: function() {
    localStorage.setItem('notepad-notes', JSON.stringify(this.notes));
  },

  loadReviewers: async function() {
    const client = window.sb || (typeof sb !== 'undefined' ? sb : null);
    const user = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
    if (!client || !user?.username) return;
    try {
      const { data, error } = await client
        .from('reviewers')
        .select('*')
        .eq('user_id', user.username)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        this.reviewers = data;
      }
    } catch (e) {
      console.warn('Failed to load reviewers', e);
    }
  },

  render: async function() {
    const page = document.getElementById('page-notepad');
    if (!page) return;

    await this.loadReviewers();

    page.innerHTML = `
      <div class="tool-page-header">
        <button class="tool-back-btn" onclick="window.goToPage('personal-tools')">← Back</button>
        <h1 class="tool-page-title">Notepad</h1>
      </div>

      <div class="notepad-container">
        
        <!-- Private Reviewers Section -->
        <div class="notepad-header" style="margin-top: 10px;">
          <h2 style="margin: 0; color: #00ffb8;">My Reviewers (AI Summaries)</h2>
          <div class="notepad-controls">
            <button class="notepad-btn" onclick="window.goToPage('file-summarizer')">+ New Summarizer</button>
          </div>
        </div>
        <div class="notepad-list" id="notepad-reviewers-list">
          <div class="notepad-empty"><p>Loading reviewers...</p></div>
        </div>

        <!-- Local Notes Section -->
        <div class="notepad-header" style="margin-top: 30px;">
          <h2 style="margin: 0; color: #00d4ff;">My Notes</h2>
          <div class="notepad-controls">
            <button class="notepad-btn" onclick="notepadModule.showForm()">+ New Note</button>
            <button class="notepad-btn delete" onclick="notepadModule.clearAll()">Clear All</button>
          </div>
        </div>
        <div class="notepad-list" id="notepad-list">
          ${this.notes.length === 0 ? '<div class="notepad-empty"><p>No notes yet. Create your first reminder!</p></div>' : ''}
        </div>

        <div class="notepad-form" id="notepad-form" style="display: none;">
          <h3 style="color: #00d4ff; margin-top: 0;">Create New Note</h3>
          <input type="text" id="note-title" placeholder="Note Title" maxlength="100">
          <textarea id="note-content" placeholder="Write your note here..." maxlength="2000"></textarea>
          <div class="notepad-form-buttons">
            <button onclick="notepadModule.saveNote()">Save Note</button>
            <button class="cancel" onclick="notepadModule.hideForm()">Cancel</button>
          </div>
        </div>
      </div>
    `;

    this.renderNotes();
    this.renderReviewers();
  },

  renderNotes: function() {
    const listEl = document.getElementById('notepad-list');
    if (!listEl) return;

    if (this.notes.length === 0) {
      listEl.innerHTML = '<div class="notepad-empty"><p>No notes yet. Create your first reminder!</p></div>';
      return;
    }

    listEl.innerHTML = this.notes.map((note, index) => {
      const date = new Date(note.date);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      return \`
        <div class="notepad-item">
          <div class="notepad-item-header">
            <div class="notepad-item-title">\${this.escapeHtml(note.title)}</div>
            <div class="notepad-item-date">\${dateStr} \${timeStr}</div>
          </div>
          <div class="notepad-item-content">\${this.escapeHtml(note.content)}</div>
          <div class="notepad-item-actions">
            <button onclick="notepadModule.editNote(\${index})">Edit</button>
            <button class="delete" onclick="notepadModule.deleteNote(\${index})">Delete</button>
          </div>
        </div>
      \`;
    }).join('');
  },

  renderReviewers: function() {
    const listEl = document.getElementById('notepad-reviewers-list');
    if (!listEl) return;

    if (this.reviewers.length === 0) {
      listEl.innerHTML = '<div class="notepad-empty"><p>No AI summaries yet. Use the File Summarizer to extract notes!</p></div>';
      return;
    }

    listEl.innerHTML = this.reviewers.map((rev) => {
      const date = new Date(rev.created_at);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const statusBadge = rev.is_shared 
        ? '<span style="color: #00ff88; font-size: 0.8em; margin-left: 8px;">(Shared)</span>' 
        : '<span style="color: #888; font-size: 0.8em; margin-left: 8px;">(Private)</span>';

      return \`
        <div class="notepad-item" style="border-left-color: #00ffb8;">
          <div class="notepad-item-header">
            <div class="notepad-item-title">\${this.escapeHtml(rev.title)} \${statusBadge}</div>
            <div class="notepad-item-date">\${dateStr}</div>
          </div>
          <div class="notepad-item-content" style="max-height: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            \${this.escapeHtml(rev.summary_content)}
          </div>
          <div class="notepad-item-actions">
            <button onclick="window.reviewersModule && window.reviewersModule.openViewer('\${rev.id}')">Open / View</button>
            <button onclick="notepadModule.toggleShareReviewer('\${rev.id}', \${!rev.is_shared})">
              \${rev.is_shared ? 'Unshare from REVIEWER Page' : 'Share to REVIEWER Page'}
            </button>
            <button class="delete" onclick="notepadModule.deleteReviewer('\${rev.id}')">Delete</button>
          </div>
        </div>
      \`;
    }).join('');
  },

  toggleShareReviewer: async function(id, share) {
    const client = window.sb || (typeof sb !== 'undefined' ? sb : null);
    if (!client) return;
    try {
      const { error } = await client.from('reviewers')
        .update({ is_shared: share, shared_at: share ? new Date().toISOString() : null })
        .eq('id', id);
      if (!error) {
        const rev = this.reviewers.find(r => r.id === id);
        if (rev) rev.is_shared = share;
        this.renderReviewers();
      } else {
        alert('Error sharing: ' + error.message);
      }
    } catch(e) {
      console.error(e);
    }
  },

  deleteReviewer: async function(id) {
    if (!confirm('Are you sure you want to delete this reviewer? This cannot be undone.')) return;
    const client = window.sb || (typeof sb !== 'undefined' ? sb : null);
    if (!client) return;
    try {
      const { error } = await client.from('reviewers').delete().eq('id', id);
      if (!error) {
        this.reviewers = this.reviewers.filter(r => r.id !== id);
        this.renderReviewers();
      } else {
        alert('Error deleting: ' + error.message);
      }
    } catch(e) {
      console.error(e);
    }
  },

  showForm: function(editIndex = -1) {
    const form = document.getElementById('notepad-form');
    if (!form) return;

    form.style.display = 'block';

    if (editIndex >= 0 && this.notes[editIndex]) {
      const note = this.notes[editIndex];
      document.getElementById('note-title').value = note.title;
      document.getElementById('note-content').value = note.content;
      form.dataset.editIndex = editIndex;
    } else {
      document.getElementById('note-title').value = '';
      document.getElementById('note-content').value = '';
      delete form.dataset.editIndex;
    }

    document.getElementById('note-title').focus();
  },

  hideForm: function() {
    const form = document.getElementById('notepad-form');
    if (form) form.style.display = 'none';
  },

  saveNote: function() {
    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();

    if (!title || !content) {
      alert('Please fill in both title and content.');
      return;
    }

    const form = document.getElementById('notepad-form');
    const editIndex = form.dataset.editIndex;

    if (editIndex !== undefined && this.notes[editIndex]) {
      this.notes[editIndex].title = title;
      this.notes[editIndex].content = content;
    } else {
      this.notes.unshift({
        title,
        content,
        date: new Date().toISOString()
      });
    }

    this.saveNotes();
    this.hideForm();
    this.renderNotes();
  },

  editNote: function(index) {
    this.showForm(index);
  },

  deleteNote: function(index) {
    if (confirm('Delete this note?')) {
      this.notes.splice(index, 1);
      this.saveNotes();
      this.renderNotes();
    }
  },

  clearAll: function() {
    if (confirm('Delete all notes? This cannot be undone.')) {
      this.notes = [];
      this.saveNotes();
      this.renderNotes();
    }
  },

  escapeHtml: function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
