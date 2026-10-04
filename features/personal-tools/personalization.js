// ═══════════════════════════════════════════════════════════
// PERSONALIZATION - Module
// Theme (dark / light / match device), accent colour, and per-page or app-wide backgrounds.
// Backgrounds are stored in localStorage 'customPageBgs' (read by applyPageBackground in
// script.js); '*' is the app-wide background, used by any page without its own.
// ═══════════════════════════════════════════════════════════

window.personalizationModule = {
  // null = show the overview; a page id ('*' = all pages) = show that page's backgrounds
  activePage: null,
  activeCategory: 'Featured',

  pages: [
    { id: 'announcement',    label: 'Announcements',       icon: '📢' },
    { id: 'first',           label: '1st Year · 1st Sem',  icon: '📚' },
    { id: 'second',          label: '1st Year · 2nd Sem',  icon: '📖' },
    { id: 'y2first',         label: '2nd Year · 1st Sem',  icon: '📚' },
    { id: 'y2second',        label: '2nd Year · 2nd Sem',  icon: '📖' },
    { id: 'y3first',         label: '3rd Year · 1st Sem',  icon: '📚' },
    { id: 'y3second',        label: '3rd Year · 2nd Sem',  icon: '📖' },
    { id: 'y4first',         label: '4th Year · 1st Sem',  icon: '📚' },
    { id: 'y4second',        label: '4th Year · 2nd Sem',  icon: '📖' },
    { id: 'reviewers',       label: 'Reviewers',           icon: '🧠' },
    { id: 'file-summarizer', label: 'File Summarizer',     icon: '📄' },
    { id: 'ai',              label: 'AI Assistants',       icon: '🤖' },
    { id: 'chat',            label: 'Chat',                icon: '💬' },
    { id: 'calendar',        label: 'Calendar',            icon: '📅' },
    { id: 'music',           label: 'Music',               icon: '🎵' },
    { id: 'events',          label: 'Event Pictures',      icon: '🖼️' },
    { id: 'random',          label: 'Random Pictures',     icon: '📸' },
    { id: 'users',           label: 'User Directory',      icon: '👥' },
    { id: 'personal-tools',  label: 'Personal Tools',      icon: '🧰' },
    { id: 'notepad',         label: 'Notepad',             icon: '🗒️' },
    { id: 'alarm',           label: 'Alarm Clock',         icon: '⏰' },
    { id: 'calculator',      label: 'Calculator',          icon: '🔢' },
    { id: 'games',           label: 'Arcade',              icon: '🎮' },
  ],

  accents: ['#00d4ff', '#00ff88', '#a855f7', '#ff4fa3', '#ffb020', '#ff5d5d', '#38bdf8', '#facc15'],

  // Featured coded backgrounds (shown first)
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

  // Featured live animated backgrounds
  liveBackgrounds: [
    { id: 'aurora-cyan',  label: 'Aurora Waves', motion: 'motion-pan',
      background: 'radial-gradient(ellipse 90% 40% at 50% 0%, rgba(0,255,180,.28), transparent), radial-gradient(ellipse 60% 50% at 80% 60%, rgba(88,101,242,.34), transparent), linear-gradient(160deg,#021118,#130025)' },
    { id: 'space-vortex', label: 'Space Vortex', motion: 'motion-spin',
      background: 'conic-gradient(from 90deg at 50% 50%, #020617, #312e81, #0891b2, #020617, #4c1d95, #020617)' },
    { id: 'ocean-pulse',  label: 'Ocean Pulse', motion: 'motion-wave',
      background: 'radial-gradient(ellipse 100% 60% at 50% 100%, rgba(0,212,255,.42), transparent), linear-gradient(180deg,#001018,#000510)' },
    { id: 'cyber-rain',   label: 'Cyber Rain', motion: 'motion-scan',
      background: 'repeating-linear-gradient(90deg, rgba(0,212,255,.05) 0 2px, transparent 2px 38px), radial-gradient(circle at 80% 25%, rgba(0,255,136,.22), transparent 28%), linear-gradient(135deg,#020617,#08111f)' },
    { id: 'cosmic-class', label: 'Cosmic Nebula', motion: 'motion-spin',
      background: 'radial-gradient(ellipse 70% 60% at 15% 20%, rgba(147,51,234,.42), transparent), radial-gradient(circle at 80% 20%, rgba(199,125,255,.32), transparent 30%), linear-gradient(135deg,#040214,#15002a)' },
  ],

  selectedBackgrounds: {},

  // One catalogue: featured + live + the categorised presets defined in script.js
  getCatalog: function() {
    if (this._catalog) return this._catalog;
    const items = [];
    const seen = new Set();
    const add = (item) => { if (!seen.has(item.key)) { seen.add(item.key); items.push(item); } };
    this.codedBackgrounds.forEach(([id, title, background]) =>
      add({ key: `coded-${id}`, title, category: 'Featured', bg: { type: 'coded', background, title } }));
    this.liveBackgrounds.forEach((b) =>
      add({ key: `live-${b.id}`, title: b.label, category: 'Live', bg: { type: 'animated', background: b.background, motion: b.motion, title: b.label } }));
    const animated = typeof ANIMATED_BACKGROUND_PRESETS !== 'undefined' ? ANIMATED_BACKGROUND_PRESETS : [];
    animated.forEach((b) =>
      add({ key: `live-${b.id}`, title: b.title, category: 'Live', bg: { type: 'animated', background: b.background, motion: b.motion, title: b.title } }));
    const coded = typeof CODED_BACKGROUND_PRESETS !== 'undefined' ? CODED_BACKGROUND_PRESETS : [];
    coded.forEach((b) =>
      add({ key: `preset-${b.id}`, title: b.title, category: b.category || 'More', bg: { type: 'coded', background: b.background, title: b.title } }));
    this._catalog = items;
    return items;
  },

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
    // Photos used to be stored twice (here and in customPageBgs), which filled storage.
    // Keep only a marker here; the photo itself lives in customPageBgs.
    let slimmed = false;
    Object.values(this.selectedBackgrounds).forEach((sel) => {
      if (sel?.type === 'custom' && sel.value) { delete sel.value; slimmed = true; }
    });
    if (slimmed) this.saveSettings();
  },

  saveSettings: function() {
    try {
      localStorage.setItem('personalization-backgrounds', JSON.stringify(this.selectedBackgrounds));
    } catch(e) {}
  },

  readStoredBgs: function() {
    try { return JSON.parse(localStorage.getItem('customPageBgs') || '{}') || {}; } catch (_) { return {}; }
  },

  // Returns false when the browser refused to store it (storage full)
  saveToMainBgs: function(pageId, bg) {
    const stored = this.readStoredBgs();
    if (bg) stored[pageId] = bg;
    else delete stored[pageId];
    try {
      localStorage.setItem('customPageBgs', JSON.stringify(stored));
    } catch (e) {
      return false;
    }
    if (window.customPageBgs) {
      if (bg) window.customPageBgs[pageId] = bg;
      else delete window.customPageBgs[pageId];
    }
    return true;
  },

  // Older versions saved selections here without writing customPageBgs; carry them over once
  syncToMainBgs: function() {
    try {
      const stored = this.readStoredBgs();
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
    if (sel.type === 'coded' && sel.value) return { type: 'coded', background: sel.value, title: sel.id };
    if (sel.type === 'live') {
      const key = String(sel.id || '').startsWith('live-') ? sel.id : `live-${sel.value}`;
      const live = this.getCatalog().find((item) => item.key === key);
      return live ? live.bg : null;
    }
    return null;
  },

  refreshCurrentPageBackground: function() {
    try { if (typeof applyPageBackground === 'function') applyPageBackground(); } catch (_) {}
  },

  // ── Theme ─────────────────────────────────────────────────

  getThemeMode: function() {
    try { return localStorage.getItem('themeMode') || 'dark'; } catch (_) { return 'dark'; }
  },

  getAccent: function() {
    try { return localStorage.getItem('accentColor') || '#00d4ff'; } catch (_) { return '#00d4ff'; }
  },

  setTheme: function(mode) {
    if (typeof window.setThemeMode === 'function') window.setThemeMode(mode);
    this.render();
  },

  setAccent: function(color) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return;
    if (typeof window.setAccentColor === 'function') window.setAccentColor(color);
    const picker = document.getElementById('accent-picker');
    if (picker) picker.value = color;
    this.render();
  },

  // ── Render ────────────────────────────────────────────────

  render: function() {
    const page = document.getElementById('page-personalization');
    if (!page) return;
    if (this.activePage === null) this.renderPageSelector(page);
    else this.renderPageEditor(page, this.activePage);
  },

  renderPageSelector: function(page) {
    const esc = window.escapeHTML || ((v) => String(v ?? ''));
    const mode = this.getThemeMode();
    const accent = this.getAccent();
    const themeBtn = (value, label) => `
      <button type="button" class="pz-seg-btn ${mode === value ? 'active' : ''}" aria-pressed="${mode === value}"
              onclick="personalizationModule.setTheme('${value}')">${label}</button>`;
    const swatches = this.accents.map((c) => `
      <button type="button" class="pz-swatch ${c.toLowerCase() === accent.toLowerCase() ? 'active' : ''}"
              style="--swatch:${c}" aria-label="Accent ${c}" onclick="personalizationModule.setAccent('${c}')"></button>`).join('');

    const allBg = !!this.selectedBackgrounds['*'];
    const cards = this.pages.map((p) => {
      const hasBg = !!this.selectedBackgrounds[p.id];
      return `
        <button type="button" class="pz-page-card ${hasBg ? 'has-bg' : ''}"
             onclick="personalizationModule.selectPage('${p.id}')">
          <span class="pz-page-icon">${p.icon}</span>
          <span class="pz-page-label">${esc(p.label)}</span>
          ${hasBg ? '<span class="pz-page-dot" aria-label="Has its own background"></span>' : ''}
        </button>
      `;
    }).join('');

    page.innerHTML = `
      <div class="tool-page-header">
        <button class="tool-back-btn" onclick="window.goToPage('personal-tools')">← Back</button>
        <h1 class="tool-page-title">Personalization</h1>
      </div>
      <div class="pz-container">
        <div class="pz-section-title">Theme</div>
        <div class="pz-theme-card">
          <div class="pz-seg" role="group" aria-label="Theme">
            ${themeBtn('dark', '🌙 Dark')}${themeBtn('light', '☀️ Light')}${themeBtn('system', '📱 Match device')}
          </div>
          <div class="pz-accent-row">
            <span class="pz-accent-label">Accent colour</span>
            <div class="pz-swatches">${swatches}
              <label class="pz-swatch pz-swatch-custom" title="Custom colour">
                <input type="color" value="${esc(accent)}" aria-label="Custom accent colour"
                       onchange="personalizationModule.setAccent(this.value)">
              </label>
            </div>
          </div>
        </div>

        <div class="pz-section-title" style="margin-top:24px;">Backgrounds</div>
        <button type="button" class="pz-all-card ${allBg ? 'has-bg' : ''}" onclick="personalizationModule.selectPage('*')">
          <span class="pz-page-icon">🖼️</span>
          <span>
            <strong>All pages</strong>
            <small>${allBg ? 'Set. Pages with their own background keep it.' : 'One background for the whole app'}</small>
          </span>
        </button>
        <p class="pz-hint">Or choose a single page:</p>
        <div class="pz-page-grid">${cards}</div>
      </div>
    `;
  },

  renderPageEditor: function(page, pageId) {
    const esc = window.escapeHTML || ((v) => String(v ?? ''));
    const isAll = pageId === '*';
    const pageInfo = isAll ? { icon: '🖼️', label: 'All pages' } : this.pages.find((p) => p.id === pageId);
    const currentBg = this.selectedBackgrounds[pageId];
    const catalog = this.getCatalog();
    const categories = [...new Set(catalog.map((item) => item.category))].concat('Your photo');
    if (!categories.includes(this.activeCategory)) this.activeCategory = 'Featured';
    const chips = categories.map((cat) => `
      <button type="button" class="pz-chip ${cat === this.activeCategory ? 'active' : ''}" role="tab"
              aria-selected="${cat === this.activeCategory}"
              onclick="personalizationModule.setCategory('${esc(cat)}')">${esc(cat)}</button>`).join('');

    let body;
    if (this.activeCategory === 'Your photo') {
      const stored = this.readStoredBgs()[pageId];
      const photo = currentBg?.type === 'custom' && stored?.url ? stored.url : '';
      body = `
        <div class="upload-bg-section">
          <label class="upload-bg-label">Use your own photo</label>
          <input type="file" class="upload-bg-input" accept="image/*" id="pz-upload-input"
                 onchange="personalizationModule.uploadBackground('${esc(pageId)}')">
          <button type="button" class="upload-bg-button" onclick="document.getElementById('pz-upload-input').click()">📁 Choose Image</button>
          <p class="pz-hint" id="pz-upload-status" role="status" aria-live="polite">Large photos are resized so they fit on your device.</p>
          ${photo ? `<div class="bg-preview"><img src="${esc(photo)}" class="bg-preview-img" alt="Current background photo"></div>` : ''}
        </div>`;
    } else {
      const items = catalog.filter((item) => item.category === this.activeCategory);
      body = `<div class="background-grid">${items.map((item) => {
        const selected = currentBg?.id === item.key;
        const isLive = item.bg.type === 'animated';
        return `
          <button type="button" class="${isLive ? 'live-bg-option' : 'bg-option'} ${selected ? 'selected' : ''}"
               style="background: ${esc(item.bg.background)};" aria-pressed="${selected}"
               onclick="personalizationModule.choose('${esc(pageId)}', '${esc(item.key)}')" title="${esc(item.title)}">
            <div class="bg-label">${isLive ? '✦ ' : ''}${esc(item.title)}</div>
          </button>`;
      }).join('')}</div>`;
    }

    page.innerHTML = `
      <div class="tool-page-header">
        <button class="tool-back-btn" onclick="personalizationModule.goBackToSelector()">← Pages</button>
        <span class="pz-title-icon" aria-hidden="true">${pageInfo?.icon || ''}</span>
        <h1 class="tool-page-title">${esc(pageInfo?.label || pageId)}</h1>
      </div>
      <div class="pz-container">
        ${isAll ? '<p class="pz-hint">Applies to every page that has no background of its own. Games keep their own look.</p>' : ''}
        <div class="pz-chips" role="tablist" aria-label="Background categories">${chips}</div>
        ${body}
        ${currentBg ? `
          <div style="margin-top:20px;text-align:center;">
            <button type="button" class="preview-remove-btn" onclick="personalizationModule.removeCustomBackground('${esc(pageId)}')">
              🗑 ${isAll ? 'Remove the app-wide background' : 'Use the default background for this page'}
            </button>
          </div>
        ` : ''}
      </div>
    `;
  },

  setCategory: function(category) {
    this.activeCategory = category;
    this.render();
  },

  selectPage: function(pageId) {
    this.activePage = pageId;
    const current = this.selectedBackgrounds[pageId];
    const match = current && this.getCatalog().find((item) => item.key === current.id);
    this.activeCategory = current?.type === 'custom' ? 'Your photo' : (match?.category || 'Featured');
    this.render();
  },

  goBackToSelector: function() {
    this.activePage = null;
    this.render();
  },

  choose: function(pageId, key) {
    const item = this.getCatalog().find((entry) => entry.key === key);
    if (!item) return;
    if (!this.saveToMainBgs(pageId, item.bg)) {
      return window.customAlert?.('Could not save the background. Your browser storage is full.');
    }
    this.selectedBackgrounds[pageId] = item.bg.type === 'animated'
      ? { id: key, type: 'live', value: key.replace(/^live-/, '') }
      : { id: key, type: 'coded', value: item.bg.background };
    this.saveSettings();
    this.refreshCurrentPageBackground();
    this.render();
  },

  // Kept for older inline handlers
  selectBackground: function(pageId, bgId) {
    this.choose(pageId, bgId);
  },

  // Resize a photo so it fits comfortably in localStorage (about 5 MB for the whole app)
  shrinkImage: function(file, maxSide = 1600, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file is not an image this browser can read.')); };
      img.src = url;
    });
  },

  uploadBackground: async function(pageId) {
    const input = document.getElementById('pz-upload-input');
    const file = input?.files?.[0];
    if (!file) return;
    const status = document.getElementById('pz-upload-status');
    if (status) status.textContent = 'Preparing your photo…';
    try {
      let dataUrl = await this.shrinkImage(file);
      let saved = this.saveToMainBgs(pageId, { type: 'image', url: dataUrl, title: 'Custom Upload' });
      if (!saved) {
        // Try once more, smaller, before giving up
        dataUrl = await this.shrinkImage(file, 1100, 0.7);
        saved = this.saveToMainBgs(pageId, { type: 'image', url: dataUrl, title: 'Custom Upload' });
      }
      if (!saved) {
        if (status) status.textContent = 'Storage is full. Remove a photo background from another page and try again.';
        return;
      }
      this.selectedBackgrounds[pageId] = { id: 'custom-upload', type: 'custom' };
      this.saveSettings();
      this.refreshCurrentPageBackground();
      this.render();
    } catch (error) {
      if (status) status.textContent = error.message || 'Could not use that photo.';
    } finally {
      if (input) input.value = '';
    }
  },

  removeCustomBackground: function(pageId) {
    delete this.selectedBackgrounds[pageId];
    this.saveSettings();
    this.saveToMainBgs(pageId, null);
    this.refreshCurrentPageBackground();
    this.render();
  },

  applyPageBackground: function() {}
};
