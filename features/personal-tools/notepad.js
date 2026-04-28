// ═══════════════════════════════════════════════════════════
// NOTEPAD - Module (Refactored)
// ═══════════════════════════════════════════════════════════

window.notepadModule = {
  notes: [],

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

  renderNotes: function() {
    const listEl = document.getElementById('notepad-list');
    if (!listEl) return;

    if (this.notes.length === 0) {
      listEl.innerHTML = '<div class="notepad-empty"><p>No notes yet. Create your first reminder!</p></div>';
      return;
    }

    const notesHtml = this.notes.map((note, index) => {
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

  shareNote: async function(index) {
    const note = this.notes[index];
    if (!note) return;

    const client = window.sb || (typeof sb !== 'undefined' ? sb : null);
    const user = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);

    if (!client || !user) {
      customAlert('Not logged in. Cannot share note.');
      return;
    }

    try {
      const { error } = await client.from('reviewers').insert([{
        title: note.title,
        summary_content: note.content,
        contributor_name: user.username || user.display_name || 'Anonymous',
        user_id: user.username,
        original_file_name: note.title,
        summary_type: 'shared-note',
        is_shared: true,
        created_at: note.date,
      }]);

      if (error) {
        console.error('[Notepad] Share error:', error);
        customAlert('Could not share note: ' + (error.message || 'Unknown error'));
      } else {
        console.log('[Notepad] Note shared:', note.title);
        customAlert('Shared to Reviewer page!');
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