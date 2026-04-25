// Notepad Module
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
      <div class="page-header">
        <h1 class="page-title">📝 Notepad</h1>
      </div>
      <div class="notepad-container">
        <div class="notepad-header">
          <div class="notepad-title">My Reminders</div>
          <div class="notepad-controls">
            <button class="notepad-btn" onclick="notepadModule.showForm()">+ New Note</button>
            <button class="notepad-btn delete" onclick="notepadModule.clearAll()">Clear All</button>
          </div>
        </div>

        <div class="notepad-list" id="notepad-list">
          ${this.notes.length === 0 ? '<p style="color: #888; text-align: center;">No notes yet. Create your first reminder!</p>' : ''}
        </div>

        <div class="notepad-form" id="notepad-form" style="display: none;">
          <input type="text" id="note-title" placeholder="Note Title" maxlength="100">
          <textarea id="note-content" placeholder="Write your reminder here..." maxlength="1000"></textarea>
          <button onclick="notepadModule.saveNote()">Save Note</button>
          <button onclick="notepadModule.hideForm()">Cancel</button>
        </div>
      </div>
    `;

    this.renderNotes();
  },
  renderNotes: function() {
    const listEl = document.getElementById('notepad-list');
    if (!listEl) return;

    const notesHtml = this.notes.map((note, index) => `
      <div class="notepad-item">
        <div class="notepad-item-header">
          <div class="notepad-item-title">${this.escapeHtml(note.title)}</div>
          <div class="notepad-item-date">${new Date(note.date).toLocaleString()}</div>
          <button class="notepad-btn delete" onclick="notepadModule.deleteNote(${index})">Delete</button>
        </div>
        <div class="notepad-item-content">${this.escapeHtml(note.content)}</div>
      </div>
    `).join('');

    listEl.innerHTML = notesHtml || '<p style="color: #888; text-align: center;">No notes yet. Create your first reminder!</p>';
  },
  showForm: function() {
    const form = document.getElementById('notepad-form');
    if (form) form.style.display = 'block';
    document.getElementById('note-title').focus();
  },
  hideForm: function() {
    const form = document.getElementById('notepad-form');
    if (form) form.style.display = 'none';
    document.getElementById('note-title').value = '';
    document.getElementById('note-content').value = '';
  },
  saveNote: function() {
    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();

    if (!title || !content) {
      customAlert('Please fill in both title and content.');
      return;
    }

    this.notes.unshift({
      title,
      content,
      date: new Date().toISOString()
    });

    this.saveNotes();
    this.hideForm();
    this.renderNotes();
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
  },
  getNotes: function() {
    return this.notes;
  }
};