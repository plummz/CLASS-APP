// ═══════════════════════════════════════════════════════════
// PUBLIC REVIEWERS - Module  v1.5.34
// ═══════════════════════════════════════════════════════════

window.reviewersModule = {
  sharedReviewers: [],
  filtered: [],
  searchQuery: '',

  init: function() {
    this.render();
  },

  isAdmin: function() {
    const u = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
    return u?.username === 'Marquillero';
  },

  currentUsername: function() {
    const u = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
    return u?.username || null;
  },

  loadReviewers: async function() {
    const client = window.sb || (typeof sb !== 'undefined' ? sb : null);
    if (!client) {
      console.warn('[Reviewers] Supabase client not ready.');
      return;
    }
    const { data, error } = await client
      .from('reviewers')
      .select('*')
      .eq('is_shared', true)
      .order('shared_at', { ascending: false });

    if (error) {
      console.error('[Reviewers] Load error:', error);
      throw error;
    }
    this.sharedReviewers = data || [];
    console.log('[Reviewers] Loaded:', this.sharedReviewers.length, 'items');
  },

  render: async function() {
    const page = document.getElementById('page-reviewers');
    if (!page) return;

    // Immediately paint base structure — never blank
    page.innerHTML = `
      <div class="reviewers-wrap">
        <div class="reviewers-header">
          <h1 class="reviewers-title">📄 Shared Reviewers</h1>
          <input type="search" class="reviewers-search" id="reviewers-search"
            placeholder="Search by title or contributor…">
        </div>
        <div class="reviewers-grid" id="reviewers-grid">
          <div class="reviewer-empty"><div class="reviewer-spinner"></div><p>Loading…</p></div>
        </div>
      </div>
    `;

    const searchEl = document.getElementById('reviewers-search');
    if (searchEl) {
      let searchDebounce = null;
      searchEl.addEventListener('input', (e) => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
          this.searchQuery = e.target.value.toLowerCase();
          this.applyFilter();
          this.renderGrid();
        }, 300);
      });
    }

    try {
      await this.loadReviewers();
      this.applyFilter();
      this.renderGrid();
    } catch (e) {
      const grid = document.getElementById('reviewers-grid');
      if (grid) grid.innerHTML = '<div class="reviewer-empty"><p>Failed to load shared content. Please refresh.</p></div>';
    }
  },

  applyFilter: function() {
    if (!this.searchQuery) {
      this.filtered = this.sharedReviewers;
      return;
    }
    this.filtered = this.sharedReviewers.filter(r =>
      (r.title || '').toLowerCase().includes(this.searchQuery) ||
      (r.contributor_name || '').toLowerCase().includes(this.searchQuery)
    );
  },

  renderGrid: function() {
    const grid = document.getElementById('reviewers-grid');
    if (!grid) return;

    if (this.filtered.length === 0) {
      grid.innerHTML = this.sharedReviewers.length === 0
        ? '<div class="reviewer-empty"><span>📚</span><p>No shared reviewers yet.</p><p class="reviewer-empty-hint">Share one from your Notepad!</p></div>'
        : '<div class="reviewer-empty"><span>🔍</span><p>No results found.</p></div>';
      return;
    }

    const me      = this.currentUsername();
    const isAdmin = this.isAdmin();

    grid.innerHTML = this.filtered.map(rev => {
      const date    = rev.shared_at ? new Date(rev.shared_at) : new Date(rev.created_at);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const preview = (rev.summary_content || '').slice(0, 100).trim();
      const canDel  = isAdmin || (me && rev.user_id === me);

      return `<div class="reviewer-card">
        <div class="reviewer-card-content" onclick="window.reviewersModule.openViewer(${rev.id})">
          <div class="reviewer-card-title">${this.esc(rev.title)}</div>
          <div class="reviewer-card-preview">${this.esc(preview)}${rev.summary_content?.length > 100 ? '…' : ''}</div>
          <div class="reviewer-card-footer">
            <span class="reviewer-card-by">By <strong>${this.esc(rev.contributor_name)}</strong></span>
            <span class="reviewer-card-date">${dateStr}</span>
          </div>
        </div>
        <div class="reviewer-card-actions">
          <button class="reviewer-view-btn" onclick="window.reviewersModule.openViewer(${rev.id})">View</button>
          ${canDel ? `<button class="reviewer-delete-btn" onclick="window.reviewersModule.deleteReviewer(${rev.id}, event)">Delete</button>` : ''}
        </div>
      </div>`;
    }).join('');
  },

  openViewer: async function(id) {
    let rev = this.sharedReviewers.find(r => r.id === id);
    if (!rev) {
      const client = window.sb || (typeof sb !== 'undefined' ? sb : null);
      if (client) {
        const { data } = await client.from('reviewers').select('*').eq('id', id).single();
        if (data) rev = data;
      }
    }
    if (!rev) { alert('Reviewer not found.'); return; }

    let overlay = document.getElementById('reviewer-viewer-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'reviewer-viewer-modal';
      overlay.className = 'reviewer-viewer-overlay';
      document.body.appendChild(overlay);
    }

    const dateStr = new Date(rev.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const safeId = String(rev.id).replace(/[^0-9]/g, '');
    overlay.innerHTML = `
      <div class="reviewer-viewer-paper">
        <button class="reviewer-close-btn" onclick="window.reviewersModule.closeViewer()">×</button>
        <div class="reviewer-paper-title">${this.esc(rev.title)}</div>
        <div class="reviewer-paper-meta">
          Shared by <strong>${this.esc(rev.contributor_name)}</strong>
          ${rev.original_file_name ? ` · Source: ${this.esc(rev.original_file_name)}` : ''}
          · ${dateStr}
        </div>
        <div class="reviewer-paper-content">${this.esc(rev.summary_content)}</div>
        <div class="reviewer-viewer-actions">
          <button class="reviewer-save-note-btn" onclick="window.reviewersModule.saveToNotepad(${safeId})">📝 Save to My Notes</button>
        </div>
      </div>
    `;
    setTimeout(() => overlay.classList.add('active'), 10);
  },

  closeViewer: function() {
    const overlay = document.getElementById('reviewer-viewer-modal');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
    }
  },

  deleteReviewer: async function(id, event) {
    event.stopPropagation();

    const rev = this.sharedReviewers.find(r => r.id === id);
    const me  = this.currentUsername();

    if (!this.isAdmin() && (!me || !rev || rev.user_id !== me)) {
      window.customAlert ? customAlert('You can only delete your own shared reviewers.') : alert('You can only delete your own shared reviewers.');
      return;
    }

    const doDelete = async () => {
      const client = window.sb || (typeof sb !== 'undefined' ? sb : null);
      if (!client) return;

      const { error } = await client.from('reviewers').delete().eq('id', id);
      if (error) {
        console.error('[Reviewers] Delete error:', error);
        window.customAlert ? customAlert('Delete failed: ' + (error.message || 'Unknown error')) : alert('Delete failed: ' + (error.message || 'Unknown error'));
        return;
      }

      console.log('[Reviewers] Deleted id:', id);
      this.sharedReviewers = this.sharedReviewers.filter(r => r.id !== id);
      this.applyFilter();
      this.renderGrid();
    };

    if (window.customConfirm) {
      customConfirm(`Delete "${rev?.title || 'this reviewer'}"?`, doDelete);
      return;
    }
    if (confirm(`Delete "${rev?.title || 'this reviewer'}"?`)) doDelete();
  },

  saveToNotepad: function(id) {
    const rev = this.sharedReviewers.find(r => r.id === id);
    if (!rev) return;

    try {
      const notes = JSON.parse(localStorage.getItem('notepad-notes') || '[]');
      const already = notes.some(n => n.title === rev.title && n.content === rev.summary_content);
      if (already) {
        window.showToast ? showToast('Already in your Notes.', 'info') : alert('Already in your Notes.');
        return;
      }
      notes.unshift({ title: rev.title, content: rev.summary_content, date: new Date().toISOString() });
      localStorage.setItem('notepad-notes', JSON.stringify(notes));
      if (window.notepadModule) window.notepadModule.notes = notes;
      window.showToast ? showToast('📝 Saved to your Notepad!', 'success') : alert('Saved to your Notepad!');
    } catch(e) {
      window.customAlert ? customAlert('Could not save to Notepad.') : alert('Could not save to Notepad.');
    }
  },

  esc: function(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  },
};
