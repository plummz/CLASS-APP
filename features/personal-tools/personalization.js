// ═══════════════════════════════════════════════════════════
// PERSONALIZATION - Module (page-selection-first UI)
// ═══════════════════════════════════════════════════════════

window.personalizationModule = {
  // null = show page selector; set to page id = show that page's backgrounds
  activePage: null,

  pages: [
    { id: 'games',          label: 'Games',           icon: '🎮' },
    { id: 'personal-tools', label: 'Personal Tools',  icon: '🧰' },
    { id: 'alarm',          label: 'Alarm Clock',     icon: '⏰' },
    { id: 'notepad',        label: 'Notepad',         icon: '📝' },
    { id: 'calculator',     label: 'Calculator',      icon: '🔢' },
    { id: 'lobby',          label: 'Lobby',           icon: '🏠' },
    { id: 'chat',           label: 'Chat',            icon: '💬' },
    { id: 'music',          label: 'Music',           icon: '🎵' },
    { id: 'announcement',   label: 'Announcements',   icon: '📢' },
    { id: 'first',          label: 'First Semester',  icon: '📚' },
    { id: 'second',         label: 'Second Semester', icon: '📖' },
  ],

  // 10 premium coded backgrounds — improved quality
  codedBackgrounds: [
    ['neon-aurora',     'Neon Aurora',
      'radial-gradient(ellipse 80% 50% at 20% 10%, rgba(0,255,180,.32), transparent), radial-gradient(ellipse 60% 60% at 80% 90%, rgba(88,101,242,.36), transparent), linear-gradient(160deg,#020b18 0%,#0a0022 60%,#001f1a 100%)'],
    ['cyber-grid',      'Cyber Grid',
      'linear-gradient(rgba(0,212,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,.06) 1px, transparent 1px), radial-gradient(circle at 50% 0%, rgba(0,255,136,.18), transparent 55%), linear-gradient(180deg,#020c14,#030e1a)'],
    ['galaxy-violet',   'Galaxy Violet',
      'radial-gradient(ellipse 70% 60% at 15% 20%, rgba(147,51,234,.42), transparent), radial-gradient(ellipse 55% 55% at 85% 70%, rgba(0,212,255,.22), transparent), radial-gradient(circle at 50% 50%, rgba(255,0,128,.08), transparent 55%), linear-gradient(135deg,#040214,#15002a)'],
    ['aurora-field',    'Aurora Field',
      'radial-gradient(ellipse 90% 40% at 50% 0%, rgba(0,255,180,.28), transparent), radial-gradient(ellipse 60% 50% at 80% 60%, rgba(88,101,242,.34), transparent), radial-gradient(ellipse 50% 50% at 10% 80%, rgba(0,212,255,.22), transparent), linear-gradient(160deg,#021118,#130025)'],
    ['tokyo-neon',      'Tokyo Neon',
      'radial-gradient(circle at 15% 20%, rgba(0,212,255,.28), transparent 32%), radial-gradient(circle at 85% 75%, rgba(255,0,128,.24), transparent 34%), radial-gradient(circle at 50% 50%, rgba(0,255,136,.06), transparent 50%), linear-gradient(135deg,#040610,#0f1525)'],
    ['glass-nebula',    'Glass Nebula',
      'radial-gradient(ellipse 70% 50% at 25% 30%, rgba(199,125,255,.28), transparent), radial-gradient(ellipse 60% 55% at 75% 70%, rgba(0,212,255,.22), transparent), radial-gradient(ellipse 40% 40% at 60% 20%, rgba(0,255,180,.14), transparent), linear-gradient(135deg,#060214,#03111e)'],
    ['deep-ocean',      'Deep Ocean',
      'radial-gradient(ellipse 100% 60% at 50% 100%, rgba(0,212,255,.42), transparent), radial-gradient(circle at 80% 20%, rgba(0,180,255,.2), transparent 36%), linear-gradient(180deg,#001018,#010a14 50%,#000510)'],
    ['forest-night',    'Forest Night',
      'radial-gradient(ellipse 70% 50% at 10% 70%, rgba(34,197,94,.32), transparent), radial-gradient(circle at 90% 20%, rgba(134,239,172,.14), transparent 26%), radial-gradient(circle at 50% 50%, rgba(0,255,136,.06), transparent 60%), linear-gradient(135deg,#021007,#061c10)'],
    ['cyber-particles', 'Soft Particles',
      'radial-gradient(circle at 25% 25%, rgba(255,196,0,.18), transparent 30%), radial-gradient(circle at 75% 75%, rgba(255,65,108,.18), transparent 30%), radial-gradient(circle at 50% 50%, rgba(88,101,242,.12), transparent 50%), linear-gradient(135deg,#0c0808,#160c1a)'],
    ['calm-study',      'Calm Study',
      'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(99,179,237,.2), transparent), radial-gradient(ellipse 60% 60% at 80% 90%, rgba(147,51,234,.16), transparent), radial-gradient(circle at 20% 50%, rgba(0,255,200,.1), transparent 40%), linear-gradient(160deg,#040c14,#0a0020)'],
  ],

  // 5 live animated backgrounds
  liveBackgrounds: [
    {
      id: 'aurora-cyan',  label: 'Aurora Waves',
      background: 'radial-gradient(ellipse 90% 40% at 50% 0%, rgba(0,255,180,.28), transparent), radial-gradient(ellipse 60% 50% at 80% 60%, rgba(88,101,242,.34), transparent), linear-gradient(160deg,#021118,#130025)',
      motion: 'motion-pan'
    },
    {
      id: 'space-vortex', label: 'Space Vortex',
      background: 'conic-gradient(from 90deg at 50% 50%, #020617, #312e81, #0891b2, #020617, #4c1d95, #020617)',
      motion: 'motion-spin'
    },
    {
      id: 'ocean-pulse',  label: 'Ocean Pulse',
      background: 'radial-gradient(ellipse 100% 60% at 50% 100%, rgba(0,212,255,.42), transparent), linear-gradient(180deg,#001018,#000510)',
      motion: 'motion-wave'
    },
    {
      id: 'cyber-rain',   label: 'Cyber Rain',
      background: 'repeating-linear-gradient(90deg, rgba(0,212,255,.05) 0 2px, transparent 2px 38px), radial-gradient(circle at 80% 25%, rgba(0,255,136,.22), transparent 28%), linear-gradient(135deg,#020617,#08111f)',
      motion: 'motion-scan'
    },
    {
      id: 'cosmic-class', label: 'Cosmic Nebula',
      background: 'radial-gradient(ellipse 70% 60% at 15% 20%, rgba(147,51,234,.42), transparent), radial-gradient(circle at 80% 20%, rgba(199,125,255,.32), transparent 30%), linear-gradient(135deg,#040214,#15002a)',
      motion: 'motion-spin'
    },
  ],

  selectedBackgrounds: {},

  init: function() {
    this.activePage = null;
    this.loadSettings();
    this.syncToMainBgs();
    this.render();
  },

  loadSettings: function() {
    try {
      const saved = localStorage.getItem('personalization-backgrounds');
      this.selectedBackgrounds = saved ? JSON.parse(saved) : {};
    } catch(e) { this.selectedBackgrounds = {}; }
  },

  saveSettings: function() {
    try {
      localStorage.setItem('personalization-backgrounds', JSON.stringify(this.selectedBackgrounds));
    } catch(e) {}
  },

  saveToMainBgs: function(pageId, bg) {
    try {
      if (window.customPageBgs) {
        if (bg) window.customPageBgs[pageId] = bg;
        else delete window.customPageBgs[pageId];
      }
      const stored = JSON.parse(localStorage.getItem('customPageBgs') || '{}');
      if (bg) stored[pageId] = bg;
      else delete stored[pageId];
      localStorage.setItem('customPageBgs', JSON.stringify(stored));
    } catch(e) {}
  },

  syncToMainBgs: function() {
    try {
      const stored = JSON.parse(localStorage.getItem('customPageBgs') || '{}');
      let changed = false;
      Object.entries(this.selectedBackgrounds).forEach(([pageId, sel]) => {
        if (stored[pageId]) return;
        const mainBg = this.buildMainBg(sel);
        if (mainBg) { stored[pageId] = mainBg; changed = true; }
      });
      if (changed) {
        localStorage.setItem('customPageBgs', JSON.stringify(stored));
        if (window.customPageBgs) Object.assign(window.customPageBgs, stored);
      }
    } catch(e) {}
  },

  buildMainBg: function(sel) {
    if (!sel) return null;
    if (sel.type === 'coded')  return { type: 'coded', background: sel.value, title: sel.id };
    if (sel.type === 'live') {
      const live = this.liveBackgrounds.find(b => b.id === sel.value);
      if (!live) return null;
      return { type: 'animated', background: live.background, motion: live.motion, title: live.label };
    }
    if (sel.type === 'custom') return { type: 'image', url: sel.value, title: 'Custom Upload' };
    return null;
  },

  // ── Render ────────────────────────────────────────────────

  render: function() {
    const page = document.getElementById('page-personalization');
    if (!page) return;

    if (this.activePage === null) {
      this.renderPageSelector(page);
    } else {
      this.renderPageEditor(page, this.activePage);
    }
  },

  renderPageSelector: function(page) {
    const cards = this.pages.map(p => {
      const hasBg = !!this.selectedBackgrounds[p.id];
      return `
        <div class="pz-page-card ${hasBg ? 'has-bg' : ''}"
             onclick="personalizationModule.selectPage('${p.id}')">
          <span class="pz-page-icon">${p.icon}</span>
          <span class="pz-page-label">${p.label}</span>
          ${hasBg ? '<span class="pz-page-dot"></span>' : ''}
        </div>
      `;
    }).join('');

    page.innerHTML = `
      <div class="tool-page-header">
        <button class="tool-back-btn" onclick="window.goToPage('personal-tools')">← Back</button>
        <h1 class="tool-page-title">Personalization</h1>
      </div>
      <div class="pz-container">
        <p class="pz-hint">Choose a page to customize its background.</p>
        <div class="pz-page-grid">${cards}</div>
      </div>
    `;
  },

  renderPageEditor: function(page, pageId) {
    const pageInfo = this.pages.find(p => p.id === pageId);
    const currentBg = this.selectedBackgrounds[pageId];

    const codedHtml = this.codedBackgrounds.map(bg => {
      const bgId = `coded-${bg[0]}`;
      const isSelected = currentBg?.id === bgId;
      const escapedGrad = bg[2].replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `
        <div class="bg-option ${isSelected ? 'selected' : ''}"
             style="background: ${bg[2]};"
             onclick="personalizationModule.selectBackground('${pageId}', '${bgId}', '${bg[0]}', 'coded', '${escapedGrad}')"
             title="${bg[1]}">
          <div class="bg-label">${bg[1]}</div>
        </div>
      `;
    }).join('');

    const liveHtml = this.liveBackgrounds.map(bg => {
      const bgId = `live-${bg.id}`;
      const isSelected = currentBg?.id === bgId;
      return `
        <div class="live-bg-option ${isSelected ? 'selected' : ''}"
             style="background: ${bg.background};"
             onclick="personalizationModule.selectBackground('${pageId}', '${bgId}', '${bg.id}', 'live', null)"
             title="${bg.label}">
          <div class="bg-label">${bg.label}</div>
        </div>
      `;
    }).join('');

    const customHtml = currentBg?.type === 'custom' ? `
      <div class="bg-preview">
        <img src="${currentBg.value}" class="bg-preview-img" alt="Custom background">
        <button class="preview-remove-btn" onclick="personalizationModule.removeCustomBackground('${pageId}')">Remove Custom</button>
      </div>
    ` : '';

    page.innerHTML = `
      <div class="tool-page-header">
        <button class="tool-back-btn" onclick="personalizationModule.goBackToSelector()">← Pages</button>
        <h1 class="tool-page-title">${pageInfo?.icon || ''} ${pageInfo?.label || pageId}</h1>
      </div>
      <div class="pz-container">
        <div class="pz-section-title">Coded Backgrounds</div>
        <div class="background-grid">${codedHtml}</div>

        <div class="pz-section-title" style="margin-top:24px;">Live Animated</div>
        <div class="live-bg-grid">${liveHtml}</div>

        <div class="upload-bg-section" style="margin-top:24px;">
          <label class="upload-bg-label">Upload Custom Image</label>
          <input type="file" class="upload-bg-input" accept="image/*" id="upload-${pageId}"
                 onchange="personalizationModule.uploadBackground('${pageId}')">
          <button class="upload-bg-button" onclick="document.getElementById('upload-${pageId}').click()">
            📁 Choose Image
          </button>
          ${customHtml}
        </div>

        ${currentBg ? `
          <div style="margin-top:20px;text-align:center;">
            <button class="preview-remove-btn" onclick="personalizationModule.removeCustomBackground('${pageId}')">
              🗑 Clear Background for this Page
            </button>
          </div>
        ` : ''}
      </div>
    `;
  },

  selectPage: function(pageId) {
    this.activePage = pageId;
    this.render();
  },

  goBackToSelector: function() {
    this.activePage = null;
    this.render();
  },

  selectBackground: function(pageId, bgId, bgValue, type, gradient) {
    this.selectedBackgrounds[pageId] = { id: bgId, type: type, value: type === 'coded' ? gradient : bgValue };
    this.saveSettings();
    const mainBg = this.buildMainBg(this.selectedBackgrounds[pageId]);
    this.saveToMainBgs(pageId, mainBg);
    this.render();
  },

  uploadBackground: function(pageId) {
    const input = document.getElementById(`upload-${pageId}`);
    if (!input || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      this.selectedBackgrounds[pageId] = { id: 'custom-upload', type: 'custom', value: dataUrl };
      this.saveSettings();
      this.saveToMainBgs(pageId, { type: 'image', url: dataUrl, title: 'Custom Upload' });
      this.render();
    };
    reader.readAsDataURL(input.files[0]);
  },

  removeCustomBackground: function(pageId) {
    delete this.selectedBackgrounds[pageId];
    this.saveSettings();
    this.saveToMainBgs(pageId, null);
    this.render();
  },

  applyPageBackground: function() {}
};
