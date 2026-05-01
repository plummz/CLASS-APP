// ═══════════════════════════════════════════════════════════
// NOTEPAD - Module (Cloud Sync + Offline Support)
// ═══════════════════════════════════════════════════════════

window.notepadModule = {
  notes: [],
  searchQuery: '',
  syncStatus: 'synced',
  syncInProgress: false,
  userLoaded: false,
  firstLoginPromptShown: false,
  isOnline: navigator.onLine,
  onlineHandlerBound: false,
  pendingDeletes: {},
  pendingDeleteTimeouts: {},

  init: function() {
    this.setupOnlineHandler();
    this.loadNotes();
    this.render();
    this.checkFirstLogin();
  },

  setupOnlineHandler: function() {
    if (this.onlineHandlerBound) return;
    this.onlineHandlerBound = true;
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncStatus = 'syncing';
      this.render();
      this.syncNotes().then(() => {
        this.syncStatus = 'synced';
        this.render();
      });
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.syncStatus = 'offline';
      this.render();
    });
  },

  createLocalId: function() {
    return `note-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  },

  hydrateNote: function(note = {}) {
    return {
      title: note.title || '',
      content: note.content || '',
      date: note.date || note.updated_at || note.created_at || new Date().toISOString(),
      cloudId: note.cloudId || note.id || null,
      localId: note.localId || this.createLocalId(),
      sharedToReviewers: Boolean(note.sharedToReviewers || note.shared_to_reviewers),
    };
  },

  getStoredNotes: function() {
    try {
      const saved = JSON.parse(localStorage.getItem('notepad-notes') || '[]');
      return Array.isArray(saved) ? saved.map((note) => this.hydrateNote(note)) : [];
    } catch (_) {
      return [];
    }
  },

  persistLocalNotes: function() {
    localStorage.setItem('notepad-notes', JSON.stringify(this.notes.map((note) => this.hydrateNote(note))));
  },

  notesMatch: function(a, b) {
    if (a?.cloudId && b?.cloudId) return String(a.cloudId) === String(b.cloudId);
    if (a?.localId && b?.localId) return String(a.localId) === String(b.localId);
    return String(a?.title || '') === String(b?.title || '')
      && String(a?.content || '') === String(b?.content || '')
      && String(a?.date || '') === String(b?.date || '');
  },

  mergeLocalAndRemoteNotes: function(localNotes, remoteNotes) {
    const merged = (remoteNotes || []).map((note) => this.hydrateNote(note));
    for (const localNote of (localNotes || []).map((note) => this.hydrateNote(note))) {
      const alreadyPresent = merged.some((remoteNote) =>
        this.notesMatch(localNote, remoteNote)
        || (!localNote.cloudId && localNote.title === remoteNote.title && localNote.content === remoteNote.content)
      );
      if (!alreadyPresent) merged.unshift(localNote);
    }
    merged.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return merged;
  },

  saveExternalNote: async function(noteInput) {
    const note = this.hydrateNote(noteInput);
    const existingIndex = this.notes.findIndex((existing) =>
      this.notesMatch(existing, note)
      || (!existing.cloudId && existing.title === note.title && existing.content === note.content)
    );
    if (existingIndex >= 0) {
      this.notes[existingIndex] = {
        ...this.notes[existingIndex],
        ...note,
        localId: this.notes[existingIndex].localId || note.localId,
      };
    } else {
      this.notes.unshift(note);
    }
    await this.saveNotes();
    this.render();
    return note;
  },

  checkFirstLogin: async function() {
    const user = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
    if (!user || !user.username) return;

    const imported = localStorage.getItem('notepad-imported-to-cloud');
    if (imported === 'true') return;

    const local = localStorage.getItem('notepad-notes');
    const localNotes = local ? JSON.parse(local) : [];
    if (localNotes.length === 0) {
      localStorage.setItem('notepad-imported-to-cloud', 'true');
      return;
    }

    if (this.firstLoginPromptShown) return;
    this.firstLoginPromptShown = true;

    const client = window.sb || (typeof sb !== 'undefined' ? sb : null);
    if (!client || !navigator.onLine) {
      return;
    }

    const doImport = async () => {
      try {
        const records = localNotes.map(note => ({
          title: note.title,
          content: note.content,
          user_id: user.username,
          created_at: note.date || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        const { error } = await client.from('user_notes').insert(records);
        if (error) {
          console.error('[Notepad] Import error:', error);
          customAlert('Could not import notes. They remain in offline cache.');
        } else {
          customAlert('✅ Notes imported to cloud!');
          localStorage.setItem('notepad-imported-to-cloud', 'true');
          this.loadNotes();
          this.render();
        }
      } catch (ex) {
        console.error('[Notepad] Import exception:', ex);
      }
    };

    if (window.customConfirm) {
      customConfirm('Sync your ' + localNotes.length + ' local notes to the cloud?', doImport);
    } else {
      if (confirm('Sync your ' + localNotes.length + ' local notes to the cloud?')) doImport();
    }
  },

  loadNotes: async function() {
    const user = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
    const client = window.sb || (typeof sb !== 'undefined' ? sb : null);
    const localNotes = this.getStoredNotes();

    if (!user || !user.username || !client || !navigator.onLine) {
      this.notes = localNotes;
      this.syncStatus = user && user.username ? 'offline' : 'offline';
      return;
    }

    try {
      this.syncStatus = 'syncing';
      const { data, error } = await client
        .from('user_notes')
        .select('*')
        .eq('user_id', user.username)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[Notepad] Load error:', error);
        this.notes = localNotes;
        this.syncStatus = 'offline';
        return;
      }

      const remoteNotes = (data || []).map(record => ({
        title: record.title,
        content: record.content,
        date: record.updated_at || record.created_at,
        cloudId: record.id,
        sharedToReviewers: record.shared_to_reviewers || false
      }));

      this.notes = this.mergeLocalAndRemoteNotes(localNotes, remoteNotes);
      this.persistLocalNotes();
      this.syncStatus = 'synced';
    } catch (ex) {
      console.error('[Notepad] Load exception:', ex);
      this.notes = localNotes;
      this.syncStatus = 'offline';
    }
  },

  syncNotes: async function() {
    const user = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
    const client = window.sb || (typeof sb !== 'undefined' ? sb : null);

    if (!user || !user.username || !client || !navigator.onLine) return;

    try {
      this.syncStatus = 'syncing';
      await this.saveNotes();
      await this.loadNotes();
      this.syncStatus = 'synced';
      if (this.render) this.render();
    } catch (ex) {
      console.error('[Notepad] Sync exception:', ex);
      this.syncStatus = 'offline';
    }
  },

  saveNotes: async function() {
    const user = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
    this.notes = this.notes.map((note) => this.hydrateNote(note));
    this.persistLocalNotes();

    if (!user || !user.username || !navigator.onLine) return;

    const client = window.sb || (typeof sb !== 'undefined' ? sb : null);
    if (!client) return;

    try {
      this.syncStatus = 'syncing';
      if (this.render) this.render();

      for (const note of this.notes) {
        if (note.cloudId) {
          const { error } = await client
            .from('user_notes')
            .update({
              title: note.title,
              content: note.content,
              updated_at: new Date().toISOString()
            })
            .eq('id', note.cloudId);
          if (error) console.error('[Notepad] Update error:', error);
        } else {
          const { data, error } = await client
            .from('user_notes')
            .insert([{
              title: note.title,
              content: note.content,
              user_id: user.username,
              created_at: note.date || new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
            .select();

          if (error) {
            console.error('[Notepad] Insert error:', error);
          } else if (data && data[0]) {
            note.cloudId = data[0].id;
          }
        }
      }

      this.persistLocalNotes();
      this.syncStatus = 'synced';
      if (this.render) this.render();
    } catch (ex) {
      console.error('[Notepad] Save exception:', ex);
      this.syncStatus = 'offline';
    }
  },

  render: function() {
    const page = document.getElementById('page-notepad');
    if (!page) return;

    const user = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
    const syncIcon = this.syncStatus === 'synced' ? '☁️ Synced' :
                     this.syncStatus === 'syncing' ? '⏱️ Syncing…' : '⚠️ Offline';

    let offlineBanner = '';
    if (!navigator.onLine || !user || !user.username) {
      offlineBanner = `<div class="notepad-offline-banner">📡 Log in to sync across devices</div>`;
    }

    page.innerHTML = `
      ${offlineBanner}
      <div class="tool-page-header">
        <button class="tool-back-btn" onclick="window.goToPage('personal-tools')">← Back</button>
        <h1 class="tool-page-title">Notepad</h1>
        <div class="notepad-sync-status">${syncIcon}</div>
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

      const sharedWarning = note.sharedToReviewers ? '<div class="notepad-shared-warning">⚠️ Shared to Reviewers (local edits won\'t update)</div>' : '';

      return `
        <div class="notepad-item">
          <div class="notepad-item-header">
            <div class="notepad-item-title">${this.escapeHtml(note.title)}</div>
            <div class="notepad-item-date">${dateStr} ${timeStr}</div>
          </div>
          ${sharedWarning}
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

  saveNote: async function() {
    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();

    if (!title || !content) {
      customAlert('Please fill in both title and content.');
      return;
    }

    const form = document.getElementById('notepad-form');
    const editIndex = form.dataset.editIndex;

    if (editIndex !== undefined && this.notes[editIndex]) {
      this.notes[editIndex].title = title;
      this.notes[editIndex].content = content;
      this.notes[editIndex].date = new Date().toISOString();
    } else {
      this.notes.unshift(this.hydrateNote({
        title,
        content,
        date: new Date().toISOString()
      }));
    }

    await this.saveNotes();
    this.hideForm();
    this.render();
  },

  editNote: function(index) {
    this.showForm(index);
  },

  deleteNote: async function(index) {
    const note = this.notes[index];
    if (!note) return;

    const title = note.title || 'Note';
    const key = `delete-${index}-${Date.now()}`;

    this.pendingDeletes[key] = { index, note };
    this.notes.splice(index, 1);
    await this.saveNotes();
    this.render();

    const showUndoToast = () => {
      const t = document.createElement('div');
      t.className = 'app-toast app-toast-info';
      t.innerHTML = `Deleted '${this.escapeHtml(title)}' <span style="cursor:pointer;text-decoration:underline;margin:0 8px" onclick="window.notepadModule.undoDelete('${key}')">Undo</span> <span style="cursor:pointer;opacity:0.6" onclick="this.parentElement.remove()">×</span>`;
      document.body.appendChild(t);
      requestAnimationFrame(() => t.classList.add('show'));

      clearTimeout(this.pendingDeleteTimeouts[key]);
      this.pendingDeleteTimeouts[key] = setTimeout(async () => {
        delete this.pendingDeletes[key];
        delete this.pendingDeleteTimeouts[key];
        t.classList.remove('show');
        setTimeout(() => t.remove(), 220);

        const client = window.sb || (typeof sb !== 'undefined' ? sb : null);
        if (note.cloudId && client && navigator.onLine) {
          try {
            await client.from('user_notes').delete().eq('id', note.cloudId);
          } catch (ex) {
            console.error('[Notepad] Delete error:', ex);
          }
        }
      }, 5000);
    };

    if (window.showToast) {
      window.showToast(`Deleted '${title}'`, 'info');
    }
    showUndoToast();
  },

  undoDelete: async function(key) {
    const pending = this.pendingDeletes[key];
    if (!pending) return;

    clearTimeout(this.pendingDeleteTimeouts[key]);
    delete this.pendingDeletes[key];
    delete this.pendingDeleteTimeouts[key];

    this.notes.splice(pending.index, 0, pending.note);
    await this.saveNotes();
    this.render();

    if (window.showToast) {
      showToast('✅ Restored!', 'success');
    }
  },

  clearAll: async function() {
    if (this.notes.length === 0) return;

    const key = `clear-${Date.now()}`;
    const savedNotes = [...this.notes];

    this.pendingDeletes[key] = { notes: savedNotes };
    this.notes = [];
    await this.saveNotes();
    this.render();

    const showUndoToast = () => {
      const t = document.createElement('div');
      t.className = 'app-toast app-toast-info';
      t.innerHTML = `Deleted ${savedNotes.length} note(s) <span style="cursor:pointer;text-decoration:underline;margin:0 8px" onclick="window.notepadModule.undoClearAll('${key}')">Undo</span> <span style="cursor:pointer;opacity:0.6" onclick="this.parentElement.remove()">×</span>`;
      document.body.appendChild(t);
      requestAnimationFrame(() => t.classList.add('show'));

      clearTimeout(this.pendingDeleteTimeouts[key]);
      this.pendingDeleteTimeouts[key] = setTimeout(async () => {
        delete this.pendingDeletes[key];
        delete this.pendingDeleteTimeouts[key];
        t.classList.remove('show');
        setTimeout(() => t.remove(), 220);

        const client = window.sb || (typeof sb !== 'undefined' ? sb : null);
        if (client && navigator.onLine) {
          try {
            const ids = savedNotes.filter(n => n.cloudId).map(n => n.cloudId);
            if (ids.length > 0) {
              for (const id of ids) {
                await client.from('user_notes').delete().eq('id', id);
              }
            }
          } catch (ex) {
            console.error('[Notepad] Clear error:', ex);
          }
        }
      }, 5000);
    };

    if (window.showToast) {
      showToast(`Deleted ${savedNotes.length} note(s)`, 'info');
    }
    showUndoToast();
  },

  undoClearAll: async function(key) {
    const pending = this.pendingDeletes[key];
    if (!pending || !pending.notes) return;

    clearTimeout(this.pendingDeleteTimeouts[key]);
    delete this.pendingDeletes[key];
    delete this.pendingDeleteTimeouts[key];

    this.notes = pending.notes;
    await this.saveNotes();
    this.render();

    if (window.showToast) {
      showToast('✅ Restored!', 'success');
    }
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
        note.sharedToReviewers = true;

        if (note.cloudId && navigator.onLine) {
          try {
            await client.from('user_notes').update({
              shared_to_reviewers: true,
              updated_at: new Date().toISOString()
            }).eq('id', note.cloudId);
          } catch (ex) {
            console.error('[Notepad] Cloud share flag error:', ex);
          }
        }

        await this.saveNotes();
        if (window.showToast) {
          showToast('✅ Shared to Reviewers!', 'success');
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
        this.render();
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
