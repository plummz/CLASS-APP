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
  saving: false,
  expanded: {},

  init: async function() {
    this.setupOnlineHandler();
    // Show the offline copy right away, then refresh once the cloud notes arrive
    this.notes = this.getStoredNotes();
    this.render();
    await this.loadNotes();
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
      tags: note.tags || '',
      // true = edited on this device and not yet uploaded
      dirty: Boolean(note.dirty),
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
    try {
      localStorage.setItem('notepad-notes', JSON.stringify(this.notes.map((note) => this.hydrateNote(note))));
    } catch (error) {
      console.warn('[Notepad] Could not save the offline copy:', error);
    }
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
      const matchIndex = merged.findIndex((remoteNote) =>
        this.notesMatch(localNote, remoteNote)
        || (!localNote.cloudId && localNote.title === remoteNote.title && localNote.content === remoteNote.content)
      );
      if (matchIndex === -1) {
        merged.unshift(localNote);
        continue;
      }
      const remoteNote = merged[matchIndex];
      // Keep an offline edit that is newer than the cloud copy, and upload it on the next save
      if (localNote.dirty || new Date(localNote.date) > new Date(remoteNote.date)) {
        if (localNote.title !== remoteNote.title || localNote.content !== remoteNote.content || localNote.tags !== remoteNote.tags) {
          merged[matchIndex] = { ...remoteNote, title: localNote.title, content: localNote.content, tags: localNote.tags, date: localNote.date, dirty: true, localId: localNote.localId };
        }
      } else {
        merged[matchIndex].localId = localNote.localId;
      }
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
        sharedToReviewers: record.shared_to_reviewers || false,
        tags: record.tags || '',
      }));

      this.notes = this.mergeLocalAndRemoteNotes(localNotes, remoteNotes);
      this.persistLocalNotes();
      this.syncStatus = 'synced';
      // Upload offline edits found during the merge
      if (this.notes.some((note) => note.dirty || !note.cloudId)) this.saveNotes();
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

    // Only changed or new notes are uploaded. Previously every save rewrote every note
    // with the current time, which sent one request per note and broke the date order.
    const pending = this.notes.filter((note) => note.dirty || !note.cloudId);
    if (!pending.length) {
      this.syncStatus = 'synced';
      return;
    }
    if (this.saving) {
      this.saveAgain = true;
      return;
    }
    this.saving = true;

    try {
      this.syncStatus = 'syncing';
      this.updateSyncBadge();

      for (const note of pending) {
        if (note.cloudId) {
          const { error } = await client
            .from('user_notes')
            .update({
              title: note.title,
              content: note.content,
              tags: note.tags || null,
              updated_at: note.date || new Date().toISOString()
            })
            .eq('id', note.cloudId);
          if (error) console.error('[Notepad] Update error:', error);
          else note.dirty = false;
        } else {
          const { data, error } = await client
            .from('user_notes')
            .insert([{
              title: note.title,
              content: note.content,
              tags: note.tags || null,
              user_id: user.username,
              created_at: note.date || new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
            .select();

          if (error) {
            console.error('[Notepad] Insert error:', error);
          } else if (data && data[0]) {
            note.cloudId = data[0].id;
            note.dirty = false;
          }
        }
      }

      this.persistLocalNotes();
      this.syncStatus = this.notes.some((note) => note.dirty || !note.cloudId) ? 'offline' : 'synced';
      this.updateSyncBadge();
    } catch (ex) {
      console.error('[Notepad] Save exception:', ex);
      this.syncStatus = 'offline';
      this.updateSyncBadge();
    } finally {
      this.saving = false;
      if (this.saveAgain) {
        this.saveAgain = false;
        this.saveNotes();
      }
    }
  },

  syncLabel: function() {
    return this.syncStatus === 'synced' ? '☁️ Synced' :
           this.syncStatus === 'syncing' ? '⏱️ Syncing…' : '⚠️ Offline';
  },

  // Updates just the badge, so a background save doesn't wipe a half-typed note
  updateSyncBadge: function() {
    const badge = document.querySelector('#page-notepad .notepad-sync-status');
    if (badge) badge.textContent = this.syncLabel();
  },

  render: function() {
    const page = document.getElementById('page-notepad');
    if (!page) return;

    // Don't wipe a note that is being written
    const openForm = document.getElementById('notepad-form');
    if (openForm && openForm.style.display !== 'none' && page.contains(openForm)) {
      this.renderNotes();
      this.updateSyncBadge();
      return;
    }

    const user = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
    const syncIcon = this.syncLabel();

    let offlineBanner = '';
    if (!user || !user.username) {
      offlineBanner = `<div class="notepad-offline-banner">📡 Log in to sync across devices</div>`;
    } else if (!navigator.onLine) {
      offlineBanner = `<div class="notepad-offline-banner">📡 You're offline. Notes are saved on this device and sync when you reconnect.</div>`;
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

        <!-- The form sits above the list so it opens on screen, not below a long list -->
        <div class="notepad-form" id="notepad-form" style="display: none;">
          <h3 id="notepad-form-title" style="color: #00d4ff; margin-top: 0;">Create New Note</h3>
          <input type="text" id="note-title" placeholder="Note Title" maxlength="100" enterkeyhint="next">
          <textarea id="note-content" placeholder="Write your note here..." maxlength="10000"
            oninput="notepadModule.updateCharCount()"></textarea>
          <div class="notepad-char-count" id="notepad-char-count" aria-live="polite"></div>
          <input type="text" id="note-tags" placeholder="Tags / Subject (e.g. Math, Science)" maxlength="100" style="margin-top:8px;">
          <div class="notepad-form-buttons">
            <button type="button" id="notepad-save-btn" onclick="notepadModule.saveNote()">Save Note</button>
            <button type="button" class="cancel" onclick="notepadModule.hideForm()">Cancel</button>
          </div>
        </div>

        <div class="notepad-list" id="notepad-list">
          ${this.notes.length === 0 ? (window.uiEmpty ? uiEmpty({ icon: '🗒️', title: 'No notes yet', text: 'Write reminders, lecture notes or to-dos and find them here anytime.', action: '+ New note', onclick: 'notepadModule.showForm()' }) : '<div class="notepad-empty"><p>No notes yet. Create your first reminder!</p></div>') : ''}
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
      .filter(({ note }) => !q || (note.title || '').toLowerCase().includes(q) || (note.content || '').toLowerCase().includes(q) || (note.tags || '').toLowerCase().includes(q));

    if (this.notes.length === 0) {
      listEl.innerHTML = (window.uiEmpty ? uiEmpty({ icon: '🗒️', title: 'No notes yet', text: 'Write reminders, lecture notes or to-dos and find them here anytime.', action: '+ New note', onclick: 'notepadModule.showForm()' }) : '<div class="notepad-empty"><p>No notes yet. Create your first reminder!</p></div>');
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

      const content = String(note.content || '');
      const isLong = content.length > 320 || content.split('\n').length > 7;
      const expanded = Boolean(this.expanded[note.localId]);
      const sharedWarning = note.sharedToReviewers ? '<div class="notepad-shared-warning">⚠️ Shared to Reviewers (local edits won\'t update)</div>' : '';
      const tagsHtml = note.tags ? `<div class="notepad-item-tags">${note.tags.split(',').map(t => `<span class="notepad-tag">${this.escapeHtml(t.trim())}</span>`).filter(Boolean).join('')}</div>` : '';

      return `
        <div class="notepad-item">
          <div class="notepad-item-header">
            <div class="notepad-item-title">${this.escapeHtml(note.title)}</div>
            <div class="notepad-item-date">${dateStr} ${timeStr}${note.dirty ? ' · not synced' : ''}</div>
          </div>
          ${tagsHtml}
          ${sharedWarning}
          <div class="notepad-item-content ${isLong && !expanded ? 'clamped' : ''}">${this.escapeHtml(note.content)}</div>
          ${isLong ? `<button type="button" class="notepad-more-btn" onclick="notepadModule.toggleExpand('${this.escapeHtml(note.localId)}')">${expanded ? 'Show less' : 'Show more'}</button>` : ''}
          <div class="notepad-item-actions">
            <button type="button" onclick="notepadModule.editNote(${index})">Edit</button>
            <button type="button" onclick="notepadModule.shareNote(${index})">Share to Reviewers</button>
            <button type="button" class="delete" onclick="notepadModule.deleteNote(${index})">Delete</button>
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
      const tagsEl = document.getElementById('note-tags');
      if (tagsEl) tagsEl.value = note.tags || '';
      form.dataset.editIndex = editIndex;
    } else {
      document.getElementById('note-title').value = '';
      document.getElementById('note-content').value = '';
      const tagsEl = document.getElementById('note-tags');
      if (tagsEl) tagsEl.value = '';
      delete form.dataset.editIndex;
    }

    const heading = document.getElementById('notepad-form-title');
    if (heading) heading.textContent = form.dataset.editIndex !== undefined ? 'Edit Note' : 'Create New Note';
    this.updateCharCount();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('note-title').focus({ preventScroll: true });
  },

  updateCharCount: function() {
    const area = document.getElementById('note-content');
    const label = document.getElementById('notepad-char-count');
    if (!area || !label) return;
    const max = Number(area.getAttribute('maxlength')) || 10000;
    const used = area.value.length;
    label.textContent = used > max * 0.8 ? `${used.toLocaleString()} / ${max.toLocaleString()}` : '';
  },

  toggleExpand: function(localId) {
    this.expanded[localId] = !this.expanded[localId];
    this.renderNotes();
  },

  hideForm: function() {
    const form = document.getElementById('notepad-form');
    if (form) {
      form.style.display = 'none';
      delete form.dataset.editIndex;
    }
  },

  saveNote: async function() {
    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();
    const tagsEl = document.getElementById('note-tags');
    const tags = tagsEl ? tagsEl.value.trim() : '';

    if (!title || !content) {
      customAlert('Please fill in both title and content.');
      return;
    }

    const form = document.getElementById('notepad-form');
    const saveBtn = document.getElementById('notepad-save-btn');
    if (saveBtn?.disabled) return; // ignore double taps
    if (saveBtn) saveBtn.disabled = true;
    const editIndex = form.dataset.editIndex;

    if (editIndex !== undefined && this.notes[editIndex]) {
      const note = this.notes[editIndex];
      note.title = title;
      note.content = content;
      note.tags = tags;
      note.date = new Date().toISOString();
      note.dirty = true;
      // Keep the newest note at the top
      this.notes.splice(Number(editIndex), 1);
      this.notes.unshift(note);
    } else {
      this.notes.unshift(this.hydrateNote({
        title,
        content,
        tags,
        date: new Date().toISOString(),
        dirty: true,
      }));
    }

    this.hideForm();
    if (saveBtn) saveBtn.disabled = false;
    this.render();
    await this.saveNotes();
    this.renderNotes();
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
      const response = await (window.authFetch ? window.authFetch('/api/reviewers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      }) : fetch('/api/reviewers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      }));

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[Notepad] Share error:', errorData);
          if (errorData.error && errorData.error.includes('42P01')) {
            customAlert('Reviewers table not found. Ask your admin to run the database migration (010_reviewers_table.sql).');
          } else {
            customAlert('Could not share: ' + (errorData.error || 'Unknown error'));
          }
        } else {
          const text = await response.text();
          console.error(`Expected JSON but received ${contentType} from /api/reviewers. Status: ${response.status}. Preview: ${text.slice(0, 100)}`);
          customAlert('Unable to share right now. Please try again or sign in again.');
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

  // Also escapes quotes, because some values go inside HTML attributes (e.g. the search box)
  escapeHtml: function(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
