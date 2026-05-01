(function () {
  window.classAppFeatures = window.classAppFeatures || {};

  function getVersion() {
    return window.CLASS_APP_VERSION || '0.0.0';
  }

  function getChangelog() {
    return Array.isArray(window.CLASS_APP_CHANGELOG) ? window.CLASS_APP_CHANGELOG : [];
  }

  function getLatestLocalUpdate() {
    return getChangelog()[0] || { version: getVersion(), date: '', title: 'Software Update', summary: '', changes: [] };
  }

  function hasUnseenUpdate() {
    return localStorage.getItem('seenSoftwareVersion') !== getVersion();
  }

  function refreshUpdateIndicator() {
    const btn = document.getElementById('admin-update-btn');
    if (!btn) return;
    const latest = getLatestLocalUpdate();
    const unseen = hasUnseenUpdate();
    btn.classList.toggle('has-update', unseen);
    btn.title = unseen ? `New update available: Version ${latest.version}` : `Software updates - Version ${getVersion()}`;
    btn.setAttribute('aria-label', btn.title);
  }

  function showFloatingUpdate(update, seenKey) {
    window.removeDynamicModal?.('floating-update-note');
    const note = document.createElement('div');
    note.id = 'floating-update-note';
    note.className = 'floating-update-note';
    note.innerHTML = `
      <button class="floating-update-close" aria-label="Close update">&times;</button>
      <div class="floating-update-kicker">App Update</div>
      <strong>${window.escapeHTML(update.title || 'New update')}</strong>
      <p>${window.escapeHTML(update.message || update.body || '')}</p>
    `;
    document.body.appendChild(note);
    note.querySelector('button')?.addEventListener('click', () => {
      note.classList.remove('show');
      setTimeout(() => note.remove(), 220);
    });
    note.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      if (seenKey && seenKey !== 'seenSoftwareVersion') localStorage.setItem(seenKey, '1');
      openChangelogModal();
    });
    requestAnimationFrame(() => note.classList.add('show'));
    setTimeout(() => {
      if (!document.body.contains(note)) return;
      note.classList.remove('show');
      setTimeout(() => note.remove(), 220);
    }, 6500);
  }

  function showSoftwareUpdateBanner() {
    const seenVersion = localStorage.getItem('seenSoftwareVersion');
    if (seenVersion === getVersion()) return;
    const latest = getLatestLocalUpdate();
    showFloatingUpdate({
      id: `version-${getVersion()}`,
      title: `New Update Applied - Version ${getVersion()}`,
      version: getVersion(),
      message: latest.summary || 'Tap the ! button or View Updates in the lobby to see the latest changes.',
    }, 'seenSoftwareVersion');
  }

  function ensureAdminUpdateControl() {
    if (document.getElementById('admin-update-btn')) return;
    const controls = document.querySelector('.sidebar-controls');
    if (!controls) return;
    const btn = document.createElement('button');
    btn.id = 'admin-update-btn';
    btn.className = 'theme-toggle-btn admin-update-btn';
    btn.title = 'View software updates';
    btn.setAttribute('aria-label', 'View software updates');
    btn.textContent = '!';
    btn.addEventListener('click', openChangelogModal);
    controls.appendChild(btn);
    refreshUpdateIndicator();
  }

  async function fetchAppUpdates() {
    refreshUpdateIndicator();
    if (localStorage.getItem('seenSoftwareVersion') !== getVersion()) showSoftwareUpdateBanner();
    if (!window.sb) return;
    const { data, error } = await window.sb.from('app_updates')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error || !data || !data.length) return;
    const update = data[0];
    const expiresAt = update.expires_at ? new Date(update.expires_at).getTime() : null;
    if (expiresAt && Date.now() > expiresAt) return;
    const seenKey = `seenAppUpdate:${update.id}`;
    if (localStorage.getItem(seenKey)) return;
    showFloatingUpdate(update, seenKey);
    refreshUpdateIndicator();
  }

  function openChangelogModal() {
    window.removeDynamicModal?.('changelog-modal');
    localStorage.setItem('seenSoftwareVersion', getVersion());
    refreshUpdateIndicator();
    const latest = getLatestLocalUpdate();
    const entries = getChangelog().map((entry) => `
      <div class="changelog-entry">
        <div class="changelog-version">Version ${window.escapeHTML(entry.version)} <span>${window.escapeHTML(entry.date)}</span></div>
        <p class="modal-text align-left"><strong>${window.escapeHTML(entry.title || 'Update')}</strong> - ${window.escapeHTML(entry.summary || '')}</p>
        <ul>${(entry.changes || []).map((change) => `<li>${window.escapeHTML(change)}</li>`).join('')}</ul>
      </div>
    `).join('');
    document.body.insertAdjacentHTML('beforeend', `
      <div id="changelog-modal" class="custom-modal-overlay blur-bg high-z" style="display:flex;">
        <div class="custom-modal-box changelog-modal-box border-blue">
          <button class="modal-close-btn" type="button" data-close-modal-id="changelog-modal">&times;</button>
          <h3 class="modal-title text-blue">Software Updates</h3>
          <div class="update-version-grid">
            <div class="update-version-card"><span>Current App Version</span><strong>${window.escapeHTML(getVersion())}</strong></div>
            <div class="update-version-card"><span>Latest Update Version</span><strong>${window.escapeHTML(latest.version)}</strong></div>
          </div>
          <div class="update-summary-box">
            <strong>${window.escapeHTML(latest.title || 'Latest update')}</strong><br>
            ${window.escapeHTML(latest.summary || '')}<br>
            <small>Released: ${window.escapeHTML(latest.date || 'Unknown')}</small>
          </div>
          <div class="changelog-list">${entries}</div>
          ${window.isAdmin ? `<button class="btn-primary full-width mt-10" type="button" onclick="window.removeDynamicModal('changelog-modal'); window.openAdminUpdateComposer();">Post Admin Update</button>` : ''}
          <button class="btn-secondary full-width mt-10 changelog-close-action" type="button" data-close-modal-id="changelog-modal">Close</button>
        </div>
      </div>
    `);
  }

  function openAdminUpdateComposer() {
    if (!window.isAdmin) return window.customAlert?.('Admin only.');
    window.removeDynamicModal?.('admin-update-modal');
    document.body.insertAdjacentHTML('beforeend', `
      <div id="admin-update-modal" class="custom-modal-overlay blur-bg high-z" style="display:flex;">
        <div class="custom-modal-box small-box border-blue">
          <button class="modal-close-btn" type="button" data-close-modal-id="admin-update-modal">&times;</button>
          <h3 class="modal-title text-blue">Post App Update</h3>
          <input id="admin-update-title" class="modal-input" placeholder="Title" maxlength="80">
          <textarea id="admin-update-message" class="modal-input" placeholder="Message" style="height:100px;resize:none;margin-top:10px;"></textarea>
          <button class="btn-primary full-width mt-10" type="button" onclick="window.postAdminUpdate()">Post Update</button>
        </div>
      </div>
    `);
  }

  async function postAdminUpdate() {
    if (!window.isAdmin) return window.customAlert?.('Admin only.');
    const title = document.getElementById('admin-update-title')?.value.trim();
    const message = document.getElementById('admin-update-message')?.value.trim();
    if (!title || !message) return window.customAlert?.('Title and message are required.');
    const { error } = await window.sb.from('app_updates').insert([{
      title,
      message,
      active: true,
      created_by: window.currentUser?.username,
    }]);
    if (error) return window.customAlert?.(error.message);
    window.removeDynamicModal?.('admin-update-modal');
    window.showToast?.('App update posted.');
    fetchAppUpdates();
  }

  const feature = {
    name: 'updates',
    getLatestLocalUpdate,
    refreshUpdateIndicator,
    ensureAdminUpdateControl,
    fetchAppUpdates,
    openChangelogModal,
    openAdminUpdateComposer,
    postAdminUpdate,
  };

  window.classAppFeatures.updates = feature;
  window.fetchAppUpdates = fetchAppUpdates;
  window.ensureAdminUpdateControl = ensureAdminUpdateControl;
  window.openChangelogModal = openChangelogModal;
  window.openAdminUpdateComposer = openAdminUpdateComposer;
  window.postAdminUpdate = postAdminUpdate;
})();
