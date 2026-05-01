// ═══════════════════════════════════════════════════════════
// PUBLIC REVIEWERS - Module (Upvoting + Trending) v1.6.6
// ═══════════════════════════════════════════════════════════

window.reviewersModule = {
  sharedReviewers: [],
  filtered: [],
  displayed: [],
  searchQuery: '',
  sortBy: 'trending',
  voteCounts: {},
  userVotes: {},
  pendingDeletes: {},
  pendingDeleteTimeouts: {},
  pageSize: 20,
  currentPage: 1,
  eventsBound: false,

  init: function() {
    this.sortBy = localStorage.getItem('reviewers-sort-by') || 'trending';
    this.currentPage = 1;
    this.bindEvents();
    this.render();
  },

  bindEvents: function() {
    if (this.eventsBound) return;
    this.eventsBound = true;

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const page = document.getElementById('page-reviewers');
      const overlay = document.getElementById('reviewer-viewer-modal');
      
      if (!(page && page.contains(btn)) && !(overlay && overlay.contains(btn))) return;

      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');

      if (action === 'vote') this.toggleVote(id, e);
      else if (action === 'view') this.openViewer(id);
      else if (action === 'delete') this.deleteReviewer(id, e);
      else if (action === 'close-viewer') this.closeViewer();
      else if (action === 'save-note') this.saveToNotepad(id, e);
      else if (action === 'load-more') this.loadMore();
    });
  },

  isAdmin: function() {
    const u = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
    return !!u?.isAdmin;
  },

  currentUsername: function() {
    const u = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
    return u?.username || null;
  },

  idsMatch: function(a, b) {
    return String(a) === String(b);
  },

  findReviewerById: function(id) {
    return this.sharedReviewers.find(r => this.idsMatch(r.id, id)) || null;
  },

  restoreReviewer: function(rev) {
    if (!rev || this.findReviewerById(rev.id)) return;
    this.sharedReviewers.push(rev);
    this.applyFilter();
    this.renderGrid();
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

    await this.loadVoteCounts();
  },

  loadVoteCounts: async function() {
    const client = window.sb || (typeof sb !== 'undefined' ? sb : null);
    if (!client) return;

    try {
      const { data: votes, error: voteError } = await client
        .from('reviewer_votes')
        .select('reviewer_id, user_id');

      if (voteError) {
        console.warn('[Reviewers] Vote load error:', voteError);
      } else {
        this.voteCounts = {};
        this.userVotes = {};
        const me = this.currentUsername();

        (votes || []).forEach(vote => {
          this.voteCounts[vote.reviewer_id] = (this.voteCounts[vote.reviewer_id] || 0) + 1;
          if (me && vote.user_id === me) {
            this.userVotes[vote.reviewer_id] = true;
          }
        });
      }

      // Count contributions per author for contributor badges
      const contributorCounts = {};
      (this.sharedReviewers || []).forEach(rev => {
        contributorCounts[rev.user_id] = (contributorCounts[rev.user_id] || 0) + 1;
      });
      this.contributorCounts = contributorCounts;

      console.log('[Reviewers] Vote counts and contributor stats loaded');
    } catch (ex) {
      console.error('[Reviewers] Vote load exception:', ex);
    }
  },

  render: async function() {
    const page = document.getElementById('page-reviewers');
    if (!page) return;

    // Immediately paint base structure — never blank
    page.innerHTML = `
      <div class="reviewers-wrap">
        <div class="reviewers-header">
          <h1 class="reviewers-title">📄 Shared Reviewers</h1>
          <div class="reviewers-controls">
            <input type="search" class="reviewers-search" id="reviewers-search"
              placeholder="Search by title or contributor…">
            <select class="reviewers-sort" id="reviewers-sort">
              <option value="trending">🔥 Trending</option>
              <option value="newest">📅 Newest</option>
              <option value="author">👤 By Author</option>
            </select>
          </div>
        </div>
        <div class="reviewers-grid" id="reviewers-grid">
          <div class="reviewer-empty"><div class="reviewer-spinner"></div><p>Loading…</p></div>
        </div>
      </div>
    `;

    const searchEl = document.getElementById('reviewers-search');
    const sortEl = document.getElementById('reviewers-sort');

    if (sortEl) {
      sortEl.value = this.sortBy;
      sortEl.addEventListener('change', (e) => {
        this.sortBy = e.target.value;
        localStorage.setItem('reviewers-sort-by', this.sortBy);
        this.applyFilter();
        this.renderGrid();
      });
    }

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
    let result = this.sharedReviewers;

    if (this.searchQuery) {
      result = result.filter(r =>
        (r.title || '').toLowerCase().includes(this.searchQuery) ||
        (r.contributor_name || '').toLowerCase().includes(this.searchQuery)
      );
    }

    if (this.sortBy === 'trending') {
      result.sort((a, b) => (this.voteCounts[b.id] || 0) - (this.voteCounts[a.id] || 0));
    } else if (this.sortBy === 'newest') {
      result.sort((a, b) => new Date(b.shared_at || b.created_at) - new Date(a.shared_at || a.created_at));
    } else if (this.sortBy === 'author') {
      result.sort((a, b) => (a.contributor_name || '').localeCompare(b.contributor_name || ''));
    }

    this.filtered = result;
    this.currentPage = 1;
    this.updateDisplayed();
  },

  updateDisplayed: function() {
    const start = 0;
    const end = this.currentPage * this.pageSize;
    this.displayed = this.filtered.slice(start, end);
  },

  loadMore: function() {
    this.currentPage++;
    this.updateDisplayed();
    this.renderGrid();
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

    if (this.displayed.length === 0) {
      this.updateDisplayed();
    }

    const me      = this.currentUsername();
    const isAdmin = this.isAdmin();

    let html = this.displayed.map(rev => {
      const date    = rev.shared_at ? new Date(rev.shared_at) : new Date(rev.created_at);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const preview = (rev.summary_content || '').slice(0, 150).trim();
      const canDel  = isAdmin || (me && String(rev.user_id) === String(me));
      const safeId = String(rev.id).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');
      const voteCount = this.voteCounts[rev.id] || 0;
      const hasVoted = this.userVotes[rev.id] || false;
      const voteClass = hasVoted ? 'voted' : '';
      const contributorCount = this.contributorCounts?.[rev.user_id] || 0;
      const isContributor = contributorCount >= 5;

      return `<div class="reviewer-card">
        <div class="reviewer-card-header">
          ${isContributor ? '<div class="reviewer-card-contributor-badge">⭐ Contributor</div>' : '<div></div>'}
          <div class="reviewer-card-badge">👍 ${voteCount}</div>
        </div>
        <div class="reviewer-card-content" data-action="view" data-id="${safeId}">
          <div class="reviewer-card-title">${this.esc(rev.title)}</div>
          <div class="reviewer-card-preview">${this.esc(preview)}${rev.summary_content?.length > 150 ? '…' : ''}</div>
          <div class="reviewer-card-footer">
            <span class="reviewer-card-by">By <strong>${this.esc(rev.contributor_name)}</strong></span>
            <span class="reviewer-card-date">${dateStr}</span>
          </div>
        </div>
        <div class="reviewer-card-actions">
          <button class="reviewer-vote-btn ${voteClass}" data-action="vote" data-id="${safeId}">👍</button>
          <button class="reviewer-view-btn" data-action="view" data-id="${safeId}">View</button>
          ${canDel ? `<button class="reviewer-delete-btn" data-action="delete" data-id="${safeId}">Delete</button>` : ''}
        </div>
      </div>`;
    }).join('');

    if (this.displayed.length < this.filtered.length) {
      html += `<div class="reviewer-load-more"><button class="reviewer-load-more-btn" data-action="load-more">Load More</button></div>`;
    }

    grid.innerHTML = html;
  },

  openViewer: async function(id) {
    let rev = this.findReviewerById(id);
    if (!rev) {
      const client = window.sb || (typeof sb !== 'undefined' ? sb : null);
      if (client) {
        try {
          const { data } = await client.from('reviewers').select('*').eq('id', id).single();
          if (data) rev = data;
        } catch (_) {}
      }
    }
    if (!rev) {
      window.showToast ? showToast('Reviewer not found.', 'error') : alert('Reviewer not found.');
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
    const safeIdStr = String(rev.id).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    overlay.innerHTML = `
      <div class="reviewer-viewer-paper">
        <button class="reviewer-close-btn" data-action="close-viewer">×</button>
        <div class="reviewer-paper-title">${this.esc(rev.title)}</div>
        <div class="reviewer-paper-meta">
          Shared by <strong>${this.esc(rev.contributor_name)}</strong>
          ${rev.original_file_name ? ` · Source: ${this.esc(rev.original_file_name)}` : ''}
          · ${dateStr}
        </div>
        <div class="reviewer-paper-content">${this.smartBold(rev.summary_content)}</div>
        <div class="reviewer-viewer-actions">
          <button class="reviewer-save-note-btn" data-action="save-note" data-id="${safeIdStr}">📝 Save to My Notes</button>
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
    event?.stopPropagation?.();

    const rev = this.findReviewerById(id);
    const me  = this.currentUsername();

    if (!rev) {
      window.showToast ? showToast('Reviewer not found.', 'error') : alert('Reviewer not found.');
      return;
    }

    if (!this.isAdmin() && (!me || String(rev.user_id) !== String(me))) {
      window.customAlert ? customAlert('You can only delete your own shared reviewers.') : alert('You can only delete your own shared reviewers.');
      return;
    }

    const title = rev.title || 'Reviewer';
    const doDelete = async () => {
    const key = `delete-${id}-${Date.now()}`;

    this.pendingDeletes[key] = { id, rev };
    this.sharedReviewers = this.sharedReviewers.filter(r => !this.idsMatch(r.id, id));
    this.applyFilter();
    this.renderGrid();

    const showUndoToast = () => {
      const t = document.createElement('div');
      t.className = 'app-toast app-toast-info';
      t.innerHTML = `Deleted '${this.esc(title)}' <span style="cursor:pointer;text-decoration:underline;margin:0 8px" onclick="window.reviewersModule.undoDelete('${key}')">Undo</span> <span style="cursor:pointer;opacity:0.6" onclick="this.parentElement.remove()">×</span>`;
      document.body.appendChild(t);
      requestAnimationFrame(() => t.classList.add('show'));

      clearTimeout(this.pendingDeleteTimeouts[key]);
      this.pendingDeleteTimeouts[key] = setTimeout(async () => {
        delete this.pendingDeletes[key];
        delete this.pendingDeleteTimeouts[key];
        t.classList.remove('show');
        setTimeout(() => t.remove(), 220);

        const client = window.sb || (typeof sb !== 'undefined' ? sb : null);
        if (!client) return;

        const response = await (window.authFetch ? window.authFetch(`/api/reviewers/${rev.id}`, { method: 'DELETE' }) : fetch(`/api/reviewers/${rev.id}`, { method: 'DELETE' }));
        if (!response.ok) {
          const contentType = response.headers.get('content-type') || '';
          let errorMsg = 'Delete failed.';
          if (contentType.includes('application/json')) {
            const data = await response.json().catch(() => ({}));
            errorMsg = data.error || errorMsg;
          } else {
            const text = await response.text();
            console.error(`Expected JSON but received ${contentType} from /api/reviewers. Status: ${response.status}. Preview: ${text.slice(0, 100)}`);
            errorMsg = 'Unable to complete this action. Please try again.';
          }
          console.error('[Reviewers] Delete error:', errorMsg);
          this.restoreReviewer(rev);
          if (window.showToast) {
            showToast(`Could not delete '${title}'.`, 'error');
          }
        }
      }, 5000);
    };

    if (window.showToast) {
      showToast(`Deleted '${title}'`, 'info');
    }
    showUndoToast();
    };

    if (window.customConfirm) {
      customConfirm(`Delete '${title}' from the shared reviewers page?`, doDelete);
      return;
    }

    if (!window.confirm(`Delete '${title}' from the shared reviewers page?`)) {
      return;
    }

    await doDelete();
  },

  undoDelete: async function(key) {
    const pending = this.pendingDeletes[key];
    if (!pending) return;

    clearTimeout(this.pendingDeleteTimeouts[key]);
    delete this.pendingDeletes[key];
    delete this.pendingDeleteTimeouts[key];

    this.restoreReviewer(pending.rev);

    if (window.showToast) {
      showToast('✅ Restored!', 'success');
    }
  },

  toggleVote: async function(reviewerId, event) {
    event.stopPropagation();

    const me = this.currentUsername();
    if (!me) {
      window.showToast ? showToast('Log in to upvote.', 'info') : alert('Log in to upvote.');
      return;
    }

    const client = window.sb || (typeof sb !== 'undefined' ? sb : null);
    if (!client || !navigator.onLine) {
      window.showToast ? showToast('You\'re offline.', 'info') : alert('You\'re offline.');
      return;
    }

    try {
      const hasVoted = this.userVotes[reviewerId];

      if (hasVoted) {
        const { error } = await client
          .from('reviewer_votes')
          .delete()
          .match({ reviewer_id: reviewerId, user_id: me });

        if (error) {
          console.error('[Reviewers] Unvote error:', error);
          return;
        }

        this.voteCounts[reviewerId] = Math.max(0, (this.voteCounts[reviewerId] || 0) - 1);
        delete this.userVotes[reviewerId];
      } else {
        const { error } = await client
          .from('reviewer_votes')
          .insert([{ reviewer_id: reviewerId, user_id: me }]);

        if (error) {
          console.error('[Reviewers] Vote error:', error);
          if (error.code === '23505') {
            this.userVotes[reviewerId] = true;
          }
          return;
        }

        this.voteCounts[reviewerId] = (this.voteCounts[reviewerId] || 0) + 1;
        this.userVotes[reviewerId] = true;
      }

      this.applyFilter();
      this.renderGrid();
    } catch (ex) {
      console.error('[Reviewers] Vote exception:', ex);
    }
  },

  saveToNotepad: async function(id, event) {
    const btn = event?.target;
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.5';
    }

    try {
      const rev = this.findReviewerById(id);
      if (!rev) {
        if (btn) btn.disabled = false;
        return;
      }

      const existingNotes = window.notepadModule?.getNotes?.() || JSON.parse(localStorage.getItem('notepad-notes') || '[]');
      const already = existingNotes.some(n => n.title === rev.title && n.content === rev.summary_content);
      if (already) {
        window.showToast ? showToast('Already in your Notes.', 'info') : alert('Already in your Notes.');
        if (btn) btn.disabled = false;
        return;
      }

      const note = { title: rev.title, content: rev.summary_content, date: new Date().toISOString() };
      if (window.notepadModule?.saveExternalNote) {
        await window.notepadModule.saveExternalNote(note);
      } else {
        const notes = JSON.parse(localStorage.getItem('notepad-notes') || '[]');
        notes.unshift(note);
        localStorage.setItem('notepad-notes', JSON.stringify(notes));
        if (window.notepadModule) window.notepadModule.notes = notes;
      }

      window.showToast ? showToast('📝 Saved to your Notepad!', 'success') : alert('Saved to your Notepad!');

      if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    } catch(e) {
      window.customAlert ? customAlert('Could not save to Notepad.') : alert('Could not save to Notepad.');
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    }
  },

  esc: function(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  },

  smartBold: function(text) {
    if (!text) return '';
    // Safety note: escape the full user string first, then add only fixed
    // <strong> wrappers around already-escaped text. None of the capture
    // groups reintroduce raw user HTML into the DOM.
    const escaped = this.esc(text);

    // Bold patterns:
    // 1. **term** markdown → <strong>term</strong>
    // 2. ALL CAPS words (3+ chars, not common stop words)
    // 3. Terms that come after "Definition:", "Formula:", "Note:", "Important:", "Key:", etc.
    // Each replacement injects only literal <strong> tags around escaped text.
    return escaped
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\b([A-Z]{3,})\b/g, (m) => {
        const skip = ['THE','AND','FOR','NOT','BUT','ARE','HAS','HAD','WAS','WERE','CAN','WILL','ALSO','FROM'];
        return skip.includes(m) ? m : `<strong>${m}</strong>`;
      })
      .replace(/(Definition|Formula|Note|Important|Key|Example|Theorem|Law|Rule|Equation):\s*/gi,
        (m) => `<strong>${m}</strong>`);
  },
};
