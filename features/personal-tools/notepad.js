// ═══════════════════════════════════════════════════════════
// NOTEPAD - Module (Refactored)
// ═══════════════════════════════════════════════════════════

window.notepadModule = {
  notes: [],
  searchQuery: '',

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

  render: function() {
    const page = document.getElementById('page-notepad');
    if (!page) return;

    page.innerHTML = `
      <div class="tool-page-header">
        <button class="tool-back-btn" onclick="window.goToPage('personal-tools')">← Back</button>
        <h1 class="tool-page-title">Notepad</h1>
      </div>

      <div class="notepad-container">
        <div class="notepad-header">
          <h2 style="margin: 0; color: #00d4ff;">My Notes</h2>
          <div class="notepad-controls">
            <button class="notepad-btn" onclick="notepadModule.showForm()">+ New Note</button>
            <button class="notepad-btn delete" onclick="notepadModule.clearAll()">Clear All</button>
          </div>
        </div>

        <input type="search" id="notepad-search" class="notepad-search-input"
          placeholder="🔍 Search notes…" oninput="notepadModule.onSearch(this.value)"
          value="${this.escapeHtml(this.searchQuery)}">

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
  },

  onSearch: function(value) {
    this.searchQuery = value;
    this.renderNotes();
  },

  renderNotes: function() {
    const listEl = document.getElementById('notepad-list');
    if (!listEl) return;

    const q = (this.searchQuery || '').toLowerCase().trim();
    const visible = this.notes
      .map((note, index) => ({ note, index }))
      .filter(({ note }) => !q || (note.title || '').toLowerCase().includes(q) || (note.content || '').toLowerCase().includes(q));

    if (this.notes.length === 0) {
      listEl.innerHTML = '<div class="notepad-empty"><p>No notes yet. Create your first reminder!</p></div>';
      return;
    }
    if (visible.length === 0) {
      listEl.innerHTML = '<div class="notepad-empty"><p>No notes match your search.</p></div>';
      return;
    }

    const notesHtml = visible.map(({ note, index }) => {
      const date = new Date(note.date);
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <div class="notepad-item">
          <div class="notepad-item-header">
            <div class="notepad-item-title">${this.escapeHtml(note.title)}</div>
            <div class="notepad-item-date">${dateStr} ${timeStr}</div>
          </div>
          <div class="notepad-item-content">${this.escapeHtml(note.content)}</div>
          <div class="notepad-item-actions">
            <button onclick="notepadModule.editNote(${index})">Edit</button>
            <button onclick="notepadModule.shareNote(${index})">Share to Reviewers</button>
            <button class="delete" onclick="notepadModule.deleteNote(${index})">Delete</button>
          </div>
        </div>
      `;
    }).join('');

    listEl.innerHTML = notesHtml;
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
      customAlert('Please fill in both title and content.');
      return;
    }

    const form = document.getElementById('notepad-form');
    const editIndex = form.dataset.editIndex;

    if (editIndex !== undefined && this.notes[editIndex]) {
      // Update existing note
      this.notes[editIndex].title = title;
      this.notes[editIndex].content = content;
    } else {
      // Create new note
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
    const doDelete = () => {
      this.notes.splice(index, 1);
      this.saveNotes();
      this.renderNotes();
    };
    if (window.customConfirm) { customConfirm('Delete this note?', doDelete); return; }
    if (confirm('Delete this note?')) doDelete();
  },

  clearAll: function() {
    const doClear = () => {
      this.notes = [];
      this.saveNotes();
      this.renderNotes();
    };
    if (window.customConfirm) { customConfirm('Delete all notes? This cannot be undone.', doClear); return; }
    if (confirm('Delete all notes? This cannot be undone.')) doClear();
  },

  shareNote: async function(index) {
    const note = this.notes[index];
    if (!note) return;

    const client = window.sb || (typeof sb !== 'undefined' ? sb : null);
    const user = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);

    if (!client) {
      customAlert('Could not connect to server. Please try again.');
      return;
    }
    if (!user || !user.username) {
      customAlert('Log in first before sharing a note.');
      return;
    }

    const now = new Date().toISOString();
    const record = {
      title:              note.title,
      summary_content:    note.content,
      contributor_name:   user.display_name || user.username,
      user_id:            user.username,
      original_file_name: note.title,
      summary_type:       'shared-note',
      is_shared:          true,
      created_at:         note.date || now,
      shared_at:          now,
    };

    console.log('[Notepad] Sharing note:', record.title, '| user_id:', record.user_id);

    try {
      const { error } = await client.from('reviewers').insert([record]);

      if (error) {
        console.error('[Notepad] Share error:', error.code, error.message);
        if (error.code === '42P01') {
          customAlert('Reviewers table not found. Ask your admin to run the database migration (010_reviewers_table.sql).');
        } else {
          customAlert('Could not share: ' + (error.message || 'Unknown error'));
        }
      } else {
        console.log('[Notepad] Note shared successfully:', record.title);
        if (window.showToast) {
          showToast('✅ Shared to Reviewers!', 'success');
          // Show a follow-up toast with a navigation link after brief delay
          setTimeout(() => {
            const t = document.createElement('div');
            t.className = 'app-toast app-toast-info';
            t.innerHTML = '📄 <span style="cursor:pointer;text-decoration:underline" onclick="window.goToPage&&goToPage(\'reviewers\')">View Reviewers →</span>';
            document.body.appendChild(t);
            requestAnimationFrame(() => t.classList.add('show'));
            setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 220); }, 5000);
          }, 400);
        } else {
          customAlert('✅ Shared to Reviewer page! Other users can now see it.');
        }
      }
    } catch (ex) {
      console.error('[Notepad] Share exception:', ex);
      customAlert('Failed to share note.');
    }
  },

  getNotes: function() {
    return this.notes;
  },

  escapeHtml: function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};