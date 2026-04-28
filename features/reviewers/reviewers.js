// ═══════════════════════════════════════════════════════════
// PUBLIC REVIEWERS - Module
// ═══════════════════════════════════════════════════════════

window.reviewersModule = {
  sharedReviewers: [],

  init: function() {
    this.render();
  },

  loadReviewers: async function() {
    const client = window.sb || (typeof sb !== 'undefined' ? sb : null);
    if (!client) return;
    try {
      const { data, error } = await client
        .from('reviewers')
        .select('*')
        .eq('is_shared', true)
        .order('shared_at', { ascending: false });
      
      if (!error && data) {
        this.sharedReviewers = data;
      }
    } catch (e) {
      console.warn('Failed to load shared reviewers', e);
    }
  },

  render: async function() {
    const page = document.getElementById('page-reviewers');
    if (!page) return;

    // Immediately show the base UI so the page never looks blank
    page.innerHTML = `
      <div class="reviewers-wrap">
        <h1 class="reviewers-title">Shared Reviewers</h1>
        <div class="reviewers-grid" id="reviewers-grid">
          <div class="reviewer-empty"><p>Loading shared reviewers…</p></div>
        </div>
      </div>
    `;

    try {
      await this.loadReviewers();
      this.renderGrid();
    } catch (e) {
      console.error('[Reviewers] Failed to load:', e);
      const grid = document.getElementById('reviewers-grid');
      if (grid) grid.innerHTML = '<div class="reviewer-empty"><p>Failed to load shared content. Please refresh.</p></div>';
    }
  },

  renderGrid: function() {
    const grid = document.getElementById('reviewers-grid');
    if (!grid) return;

    if (this.sharedReviewers.length === 0) {
      grid.innerHTML = '<div class="reviewer-empty"><p>No shared reviewers yet. Be the first to share one from your Notepad!</p></div>';
      return;
    }

    const user = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
    const currentUserId = user?.username || null;

    grid.innerHTML = this.sharedReviewers.map((rev) => {
      const date = rev.shared_at ? new Date(rev.shared_at) : new Date(rev.created_at);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const isOwner = currentUserId && rev.user_id === currentUserId;

      return \`
        <div class="reviewer-card">
          <div class="reviewer-card-content" onclick="window.reviewersModule.openViewer('\${rev.id}')">
            <div class="reviewer-card-title">\${this.escapeHtml(rev.title)}</div>
            <div class="reviewer-card-preview">\${this.escapeHtml(rev.summary_content)}</div>
            <div class="reviewer-card-footer">
              <span>By: \${this.escapeHtml(rev.contributor_name)}</span>
              <span>\${dateStr}</span>
            </div>
          </div>
          \${isOwner ? \`<button class="reviewer-delete-btn" onclick="window.reviewersModule.deleteSharedNote('\${rev.id}', event)">🗑️</button>\` : ''}
        </div>
      \`;
    }).join('');
  },

  openViewer: async function(id) {
    const client = window.sb || (typeof sb !== 'undefined' ? sb : null);
    if (!client) return;
    try {
      // First check local loaded lists to avoid extra fetch if possible
      let rev = this.sharedReviewers.find(r => r.id === id);
      if (!rev && window.notepadModule && window.notepadModule.reviewers) {
        rev = window.notepadModule.reviewers.find(r => r.id === id);
      }
      
      // If not found in cache, fetch from db
      if (!rev) {
        const { data, error } = await client.from('reviewers').select('*').eq('id', id).single();
        if (!error && data) rev = data;
      }

      if (!rev) {
        alert('Reviewer not found. It may have been deleted.');
        return;
      }

      let overlay = document.getElementById('reviewer-viewer-modal');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'reviewer-viewer-modal';
        overlay.className = 'reviewer-viewer-overlay';
        document.body.appendChild(overlay);
      }

      const dateStr = new Date(rev.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

      overlay.innerHTML = \`
        <div class="reviewer-viewer-paper">
          <button class="reviewer-close-btn" onclick="window.reviewersModule.closeViewer()">×</button>
          <div class="reviewer-paper-title">\${this.escapeHtml(rev.title)}</div>
          <div class="reviewer-paper-meta">
            Shared by \${this.escapeHtml(rev.contributor_name)} | Source: \${this.escapeHtml(rev.original_file_name)} | \${dateStr}
          </div>
          <div class="reviewer-paper-content">\${this.escapeHtml(rev.summary_content)}</div>
        </div>
      \`;

      // Trigger animation
      setTimeout(() => overlay.classList.add('active'), 10);

    } catch (e) {
      console.error('Error opening viewer:', e);
    }
  },

  closeViewer: function() {
    const overlay = document.getElementById('reviewer-viewer-modal');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
    }
  },

  deleteSharedNote: async function(id, event) {
    event.stopPropagation();
    if (!confirm('Delete this shared note?')) return;

    const client = window.sb || (typeof sb !== 'undefined' ? sb : null);
    if (!client) return;

    try {
      const { error } = await client.from('reviewers').delete().eq('id', id);
      if (error) {
        console.error('[Reviewers] Delete error:', error);
        alert('Failed to delete note.');
      } else {
        console.log('[Reviewers] Note deleted:', id);
        this.sharedReviewers = this.sharedReviewers.filter(r => r.id !== id);
        this.renderGrid();
      }
    } catch (ex) {
      console.error('[Reviewers] Delete exception:', ex);
      alert('Failed to delete note.');
    }
  },

  escapeHtml: function(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
};

