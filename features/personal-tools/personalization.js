// ═══════════════════════════════════════════════════════════
// PERSONALIZATION - Module
// ═══════════════════════════════════════════════════════════

window.personalizationModule = {
  pages: [
    { id: 'personal-tools', label: 'Personal Tools' },
    { id: 'alarm', label: 'Alarm Clock' },
    { id: 'notepad', label: 'Notepad' },
    { id: 'calculator', label: 'Calculator' },
    { id: 'lobby', label: 'Lobby' },
    { id: 'games', label: 'Games' },
    { id: 'chat', label: 'Chat' },
    { id: 'music', label: 'Music' },
    { id: 'announcement', label: 'Announcements' },
    { id: 'first', label: 'First Semester' },
    { id: 'second', label: 'Second Semester' }
  ],

  // 10 premium coded backgrounds — match exact gradients from CODED_BACKGROUND_PRESETS in script.js
  codedBackgrounds: [
    ['terminal-nexus', 'Terminal Nexus',
      'radial-gradient(circle at 18% 28%, rgba(0,255,136,.24), transparent 26%), linear-gradient(90deg, rgba(0,255,136,.08) 1px, transparent 1px), linear-gradient(180deg,#020807,#061421)'],
    ['circuit-campus', 'Circuit Campus',
      'linear-gradient(135deg, rgba(0,212,255,.16) 25%, transparent 25%), radial-gradient(circle at 80% 20%, rgba(0,255,136,.22), transparent 30%), linear-gradient(135deg,#03111f,#0d0620)'],
    ['galaxy-violet', 'Galaxy Violet',
      'radial-gradient(circle at 20% 30%, rgba(147,51,234,.34), transparent 28%), radial-gradient(circle at 78% 64%, rgba(0,212,255,.20), transparent 32%), linear-gradient(135deg,#030712,#13001f)'],
    ['aurora-field', 'Aurora Field',
      'linear-gradient(120deg, rgba(0,255,200,.24), transparent 38%), radial-gradient(circle at 80% 20%, rgba(88,101,242,.32), transparent 34%), linear-gradient(135deg,#02111f,#120024)'],
    ['tokyo-blue', 'Cyberpunk City',
      'radial-gradient(circle at 18% 22%, rgba(0,212,255,.24), transparent 28%), radial-gradient(circle at 84% 74%, rgba(255,0,128,.20), transparent 30%), linear-gradient(135deg,#050816,#111827)'],
    ['cosmic-river', 'Cosmic Dust',
      'linear-gradient(110deg, transparent 18%, rgba(0,212,255,.18) 28%, rgba(199,125,255,.18) 48%, transparent 60%), linear-gradient(135deg,#020617,#12001e)'],
    ['ocean-dashboard', 'Deep Ocean',
      'radial-gradient(circle at 50% 90%, rgba(0,212,255,.36), transparent 40%), linear-gradient(180deg,#001b2e,#03001c)'],
    ['forest-console', 'Forest Night',
      'radial-gradient(circle at 20% 72%, rgba(34,197,94,.26), transparent 28%), radial-gradient(circle at 80% 20%, rgba(190,242,100,.18), transparent 24%), linear-gradient(135deg,#031407,#081c12)'],
    ['sunset-code', 'Sunrise Glow',
      'radial-gradient(circle at 22% 18%, rgba(255,196,0,.32), transparent 28%), radial-gradient(circle at 80% 75%, rgba(255,65,108,.28), transparent 34%), linear-gradient(135deg,#1b1200,#13001d)'],
    ['rose-hologram', 'Galactic Void',
      'radial-gradient(circle at 30% 25%, rgba(244,63,94,.26), transparent 26%), radial-gradient(circle at 78% 62%, rgba(147,51,234,.26), transparent 34%), linear-gradient(135deg,#080012,#1b0321)'],
  ],

  // 5 live animated backgrounds — include gradient + motion for main app compatibility
  liveBackgrounds: [
    {
      id: 'aurora-cyan', label: 'Aurora Waves',
      background: 'linear-gradient(120deg, rgba(0,255,200,.28), transparent 38%), radial-gradient(circle at 80% 20%, rgba(88,101,242,.42), transparent 34%), linear-gradient(135deg,#02111f,#120024 62%,#001b1c)',
      motion: 'motion-pan'
    },
    {
      id: 'space-vortex', label: 'Space Vortex',
      background: 'conic-gradient(from 90deg at 50% 50%, #020617, #312e81, #0891b2, #020617, #4c1d95, #020617)',
      motion: 'motion-spin'
    },
    {
      id: 'ocean-pulse', label: 'Ocean Pulse',
      background: 'radial-gradient(circle at 50% 90%, rgba(0,212,255,.42), transparent 38%), linear-gradient(180deg,#001b2e,#03001c)',
      motion: 'motion-wave'
    },
    {
      id: 'cyber-rain', label: 'Cyber Rain',
      background: 'repeating-linear-gradient(90deg, rgba(0,212,255,.05) 0 2px, transparent 2px 38px), radial-gradient(circle at 80% 25%, rgba(0,255,136,.22), transparent 28%), linear-gradient(135deg,#020617,#08111f)',
      motion: 'motion-scan'
    },
    {
      id: 'cosmic-class', label: 'Cosmic Nebula',
      background: 'radial-gradient(circle at 20% 80%, rgba(0,255,136,.22), transparent 30%), radial-gradient(circle at 80% 20%, rgba(199,125,255,.32), transparent 30%), linear-gradient(135deg,#020617,#100020)',
      motion: 'motion-spin'
    },
  ],

  // selectedBackgrounds tracks which bg-option ID is active per page (UI state only)
  selectedBackgrounds: {},

  init: function() {
    this.loadSettings();
    this.syncToMainBgs();
    this.render();
  },

  loadSettings: function() {
    try {
      const saved = localStorage.getItem('personalization-backgrounds');
      this.selectedBackgrounds = saved ? JSON.parse(saved) : {};
    } catch (e) {
      this.selectedBackgrounds = {};
    }
  },

  saveSettings: function() {
    try {
      localStorage.setItem('personalization-backgrounds', JSON.stringify(this.selectedBackgrounds));
    } catch (e) {}
  },

  // Write a background entry to the main app's customPageBgs object + localStorage.
  // Only mutates — never replaces — the object so script.js in-memory ref stays valid.
  saveToMainBgs: function(pageId, bg) {
    try {
      // Update in-memory object if it's exposed on window (set by script.js)
      if (window.customPageBgs) {
        if (bg) window.customPageBgs[pageId] = bg;
        else delete window.customPageBgs[pageId];
      }
      // Always persist to localStorage so new sessions pick it up
      const stored = JSON.parse(localStorage.getItem('customPageBgs') || '{}');
      if (bg) stored[pageId] = bg;
      else delete stored[pageId];
      localStorage.setItem('customPageBgs', JSON.stringify(stored));
    } catch (e) {}
  },

  // On init: push any personalization selections that aren't already in customPageBgs.
  syncToMainBgs: function() {
    try {
      const stored = JSON.parse(localStorage.getItem('customPageBgs') || '{}');
      let changed = false;

      Object.entries(this.selectedBackgrounds).forEach(([pageId, sel]) => {
        if (stored[pageId]) return; // main app already has a setting — don't overwrite
        const mainBg = this.buildMainBg(sel);
        if (mainBg) { stored[pageId] = mainBg; changed = true; }
      });

      if (changed) {
        localStorage.setItem('customPageBgs', JSON.stringify(stored));
        // Reflect into in-memory object if available
        if (window.customPageBgs) {
          Object.assign(window.customPageBgs, stored);
        }
      }
    } catch (e) {}
  },

  // Convert a personalization selection record to the format expected by applyPageBackground().
  buildMainBg: function(sel) {
    if (!sel) return null;
    if (sel.type === 'coded') {
      return { type: 'coded', background: sel.value, title: sel.id };
    }
    if (sel.type === 'live') {
      const live = this.liveBackgrounds.find(b => b.id === sel.value);
      if (!live) return null;
      return { type: 'animated', background: live.background, motion: live.motion, title: live.label };
    }
    if (sel.type === 'custom') {
      return { type: 'image', url: sel.value, title: 'Custom Upload' };
    }
    return null;
  },

  render: function() {
    const page = document.getElementById('page-personalization');
    if (!page) return;

    let html = `
      <div class="tool-page-header">
        <button class="tool-back-btn" onclick="window.goToPage('personal-tools')">← Back</button>
        <h1 class="tool-page-title">Personalization</h1>
      </div>

      <div class="personalization-container">
        <div class="personalization-section">
          <h2 class="personalization-section-title">Page Backgrounds</h2>
          <p style="color: #aaa; margin-bottom: 20px;">Customize the background for each page. Changes take effect when you next visit that page.</p>
    `;

    this.pages.forEach(pageInfo => {
      const currentBg = this.selectedBackgrounds[pageInfo.id];

      html += `
        <div class="personalization-subsection">
          <div class="personalization-page-title">${pageInfo.label}</div>

          <div>
            <h4 style="color: #00d4ff; margin-top: 0; margin-bottom: 12px; font-size: 0.9em; text-transform: uppercase; letter-spacing: 0.5px;">Coded Backgrounds</h4>
            <div class="background-grid">
              ${this.codedBackgrounds.map(bg => {
                const bgId = `coded-${bg[0]}`;
                const isSelected = currentBg?.id === bgId;
                const escapedGrad = bg[2].replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                return `
                  <div class="bg-option ${isSelected ? 'selected' : ''}"
                       style="background: ${bg[2]};"
                       onclick="personalizationModule.selectBackground('${pageInfo.id}', '${bgId}', '${bg[0]}', 'coded', '${escapedGrad}')"
                       title="${bg[1]}">
                    <div class="bg-label">${bg[1]}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div style="margin-top: 15px;">
            <h4 style="color: #00d4ff; margin: 0 0 12px 0; font-size: 0.9em; text-transform: uppercase; letter-spacing: 0.5px;">Live Animated Backgrounds</h4>
            <div class="live-bg-grid">
              ${this.liveBackgrounds.map(bg => {
                const bgId = `live-${bg.id}`;
                const isSelected = currentBg?.id === bgId;
                return `
                  <div class="live-bg-option ${isSelected ? 'selected' : ''}"
                       style="background: ${bg.background};"
                       onclick="personalizationModule.selectBackground('${pageInfo.id}', '${bgId}', '${bg.id}', 'live', null)"
                       title="${bg.label}">
                    <div class="bg-label">${bg.label}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="upload-bg-section">
            <label class="upload-bg-label">Upload a custom image</label>
            <input type="file" class="upload-bg-input" accept="image/*" id="upload-${pageInfo.id}"
                   onchange="personalizationModule.uploadBackground('${pageInfo.id}')">
            <button class="upload-bg-button" onclick="document.getElementById('upload-${pageInfo.id}').click()">
              📁 Choose Image
            </button>
            ${currentBg?.type === 'custom' ? `
              <div class="bg-preview">
                <img src="${currentBg.value}" class="bg-preview-img" alt="Custom background">
                <button class="preview-remove-btn" onclick="personalizationModule.removeCustomBackground('${pageInfo.id}')">Remove Custom</button>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    });

    html += `
        </div>

        <div class="personalization-section">
          <h2 class="personalization-section-title">Live Preview</h2>
          <div class="preview-zone" id="preview-zone"></div>
        </div>
      </div>
    `;

    page.innerHTML = html;
  },

  selectBackground: function(pageId, bgId, bgValue, type, gradient) {
    this.selectedBackgrounds[pageId] = {
      id: bgId,
      type: type,
      value: type === 'coded' ? gradient : bgValue
    };
    this.saveSettings();

    // Persist to main app's customPageBgs
    const mainBg = this.buildMainBg(this.selectedBackgrounds[pageId]);
    this.saveToMainBgs(pageId, mainBg);

    // Determine preview gradient
    let previewGrad = gradient;
    if (type === 'live') {
      const liveBg = this.liveBackgrounds.find(b => b.id === bgValue);
      previewGrad = liveBg ? liveBg.background : null;
    }

    this.render();
    this.updatePreview(previewGrad);
  },

  uploadBackground: function(pageId) {
    const input = document.getElementById(`upload-${pageId}`);
    if (!input || !input.files[0]) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      this.selectedBackgrounds[pageId] = {
        id: 'custom-upload',
        type: 'custom',
        value: dataUrl
      };
      this.saveSettings();
      this.saveToMainBgs(pageId, { type: 'image', url: dataUrl, title: 'Custom Upload' });
      this.render();
      this.updatePreview(null, dataUrl);
    };
    reader.readAsDataURL(input.files[0]);
  },

  removeCustomBackground: function(pageId) {
    delete this.selectedBackgrounds[pageId];
    this.saveSettings();
    this.saveToMainBgs(pageId, null);
    this.render();
  },

  updatePreview: function(gradient, imageUrl) {
    const preview = document.getElementById('preview-zone');
    if (!preview) return;

    preview.style.background = '';
    preview.style.backgroundImage = '';

    if (imageUrl) {
      preview.style.backgroundImage = `linear-gradient(rgba(0,0,0,.2), rgba(0,0,0,.2)), url('${imageUrl}')`;
      preview.style.backgroundSize = 'cover';
      preview.style.backgroundPosition = 'center';
    } else if (gradient) {
      preview.style.background = gradient;
    }
  },

  // Legacy stub — backgrounds are now applied automatically by the main app router
  applyPageBackground: function() {}
};
