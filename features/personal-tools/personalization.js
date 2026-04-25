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

  codedBackgrounds: [
    ['terminal-nexus', 'Terminal Nexus', 'radial-gradient(circle at 18% 28%, rgba(0,255,136,.24), transparent 26%), linear-gradient(90deg, rgba(0,255,136,.08) 1px, transparent 1px), linear-gradient(180deg,#020807,#061421)'],
    ['circuit-campus', 'Circuit Campus', 'linear-gradient(135deg, rgba(0,212,255,.16) 25%, transparent 25%), radial-gradient(circle at 80% 20%, rgba(0,255,136,.22), transparent 30%), linear-gradient(135deg,#03111f,#0d0620)'],
    ['neon-grid', 'Neon Grid', 'linear-gradient(90deg, rgba(0,212,255,.1) 1px, transparent 1px), linear-gradient(180deg, rgba(255,0,150,.1) 1px, transparent 1px), linear-gradient(135deg, #0a0e27 0%, #1a1a2e 100%)'],
    ['aurora-borealis', 'Aurora Borealis', 'radial-gradient(ellipse at 20% 0%, rgba(0,255,136,.3) 0%, transparent 40%), radial-gradient(ellipse at 80% 10%, rgba(0,212,255,.2) 0%, transparent 35%), linear-gradient(180deg, #0a0f1f, #000000)'],
    ['cyberpunk-city', 'Cyberpunk City', 'radial-gradient(circle at 30% 70%, rgba(255,0,150,.2) 0%, transparent 25%), linear-gradient(45deg, rgba(0,212,255,.15) 25%, transparent 25%), linear-gradient(135deg,#1a0033,#330066,#0a0a1a)'],
    ['cosmic-dust', 'Cosmic Dust', 'radial-gradient(ellipse at 20% 80%, rgba(138,43,226,.15) 0%, transparent 30%), radial-gradient(circle at 80% 20%, rgba(0,255,136,.12) 0%, transparent 28%), linear-gradient(180deg, #0f0c29, #302b63, #24243e)'],
    ['deep-ocean', 'Deep Ocean', 'radial-gradient(circle at 50% 50%, rgba(0,212,255,.2) 0%, transparent 50%), linear-gradient(135deg, rgba(0,255,136,.08) 0%, transparent 50%), linear-gradient(180deg, #0a1628, #1a2f50)'],
    ['forest-night', 'Forest Night', 'radial-gradient(ellipse at 60% 40%, rgba(34,139,34,.15) 0%, transparent 40%), linear-gradient(135deg, rgba(0,255,136,.1) 0%, transparent 45%), linear-gradient(180deg, #0d1f0d, #1a3a1a, #0d1f0d)'],
    ['sunrise-gradient', 'Sunrise', 'linear-gradient(135deg, rgba(255,100,50,.15) 0%, rgba(255,200,0,.1) 50%, rgba(100,200,255,.08) 100%), linear-gradient(180deg, #1a0000, #330000, #0a1a2e)'],
    ['galactic-void', 'Galactic Void', 'radial-gradient(circle at 15% 25%, rgba(200,100,255,.2) 0%, transparent 30%), radial-gradient(circle at 85% 75%, rgba(0,212,255,.15) 0%, transparent 35%), linear-gradient(180deg, #0a0014, #1a0033, #000000)'],
  ],

  liveBackgrounds: [
    { id: 'animated-stars', label: 'Animated Stars' },
    { id: 'floating-particles', label: 'Floating Particles' },
    { id: 'aurora-waves', label: 'Aurora Waves' },
    { id: 'pulsing-grid', label: 'Pulsing Grid' },
    { id: 'cosmic-nebula', label: 'Cosmic Nebula' },
  ],

  selectedBackgrounds: {},

  init: function() {
    this.loadSettings();
    this.render();
  },

  loadSettings: function() {
    const saved = localStorage.getItem('personalization-backgrounds');
    this.selectedBackgrounds = saved ? JSON.parse(saved) : {};
  },

  saveSettings: function() {
    localStorage.setItem('personalization-backgrounds', JSON.stringify(this.selectedBackgrounds));
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
          <p style="color: #aaa; margin-bottom: 20px;">Customize the background for each page of your app</p>
    `;

    // Render background options for each page
    this.pages.forEach(pageInfo => {
      const currentBg = this.selectedBackgrounds[pageInfo.id];

      html += `
        <div class="personalization-subsection">
          <div class="personalization-page-title">${pageInfo.label}</div>
          
          <div>
            <h4 style="color: #00d4ff; margin-top: 0; margin-bottom: 12px; font-size: 0.95em;">Coded Backgrounds</h4>
            <div class="background-grid">
              ${this.codedBackgrounds.map((bg, idx) => {
                const bgId = `coded-${bg[0]}`;
                const isSelected = currentBg?.id === bgId;
                return `
                  <div class="bg-option ${isSelected ? 'selected' : ''}" 
                       style="background: ${bg[2]};"
                       onclick="personalizationModule.selectBackground('${pageInfo.id}', '${bgId}', '${bg[0]}', 'coded', '${bg[2].replace(/'/g, "\\'")}')"
                       title="${bg[1]}">
                    <div class="bg-label">${bg[1]}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div style="margin-top: 15px;">
            <h4 style="color: #00d4ff; margin: 0 0 12px 0; font-size: 0.95em;">Live Animated Backgrounds</h4>
            <div class="live-bg-grid">
              ${this.liveBackgrounds.map(bg => {
                const bgId = `live-${bg.id}`;
                const isSelected = currentBg?.id === bgId;
                return `
                  <div class="live-bg-option ${isSelected ? 'selected' : ''}"
                       onclick="personalizationModule.selectBackground('${pageInfo.id}', '${bgId}', '${bg.id}', 'live', null)"
                       title="${bg.label}">
                    <div class="bg-label">${bg.label}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="upload-bg-section">
            <label class="upload-bg-label">Or upload a custom image</label>
            <input type="file" class="upload-bg-input" accept="image/*" id="upload-${pageInfo.id}" onchange="personalizationModule.uploadBackground('${pageInfo.id}')">
            <button class="upload-bg-button" onclick="document.getElementById('upload-${pageInfo.id}').click()">
              📁 Choose Image
            </button>
            ${currentBg?.type === 'custom' ? `
              <div class="bg-preview">
                <img src="${currentBg.value}" class="bg-preview-img" alt="Custom background">
                <button class="preview-remove-btn" onclick="personalizationModule.removeCustomBackground('${pageInfo.id}')">Remove Custom Background</button>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    });

    html += `
        </div>

        <div class="personalization-section">
          <h2 class="personalization-section-title">Preview</h2>
          <div class="preview-zone" id="preview-zone">
            Your selected background will appear here
          </div>
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
    this.render();
    this.updatePreview(gradient || '');
  },

  uploadBackground: function(pageId) {
    const input = document.getElementById(`upload-${pageId}`);
    const file = input.files[0];

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      this.selectedBackgrounds[pageId] = {
        id: `custom-upload`,
        type: 'custom',
        value: dataUrl
      };

      this.saveSettings();
      this.render();
      this.updatePreview(`url('${dataUrl}')`);
    };

    reader.readAsDataURL(file);
  },

  removeCustomBackground: function(pageId) {
    delete this.selectedBackgrounds[pageId];
    this.saveSettings();
    this.render();
  },

  updatePreview: function(bgValue) {
    const preview = document.getElementById('preview-zone');
    if (!preview) return;

    if (bgValue.startsWith('url')) {
      preview.style.backgroundImage = bgValue;
      preview.classList.add('with-bg');
    } else if (bgValue) {
      preview.style.background = bgValue;
      preview.classList.remove('with-bg');
    }
  },

  applyPageBackground: function(pageId) {
    const bg = this.selectedBackgrounds[pageId];
    if (!bg) return;

    // Find and apply to the appropriate background elements
    if (bg.type === 'coded') {
      // Apply gradient
      const bgEl = document.getElementById('bg-galaxy'); // Default to galaxy
      if (bgEl) {
        bgEl.style.background = bg.value;
      }
    } else if (bg.type === 'live') {
      // Activate live animated background
      const liveBgId = `bg-${bg.value}`;
      document.querySelectorAll('.scene-bg').forEach(el => el.classList.remove('active'));
      const liveEl = document.getElementById(liveBgId);
      if (liveEl) liveEl.classList.add('active');
    } else if (bg.type === 'custom') {
      // Apply custom image
      const bgEl = document.getElementById('bg-galaxy');
      if (bgEl) {
        bgEl.style.backgroundImage = `url('${bg.value}')`;
        bgEl.style.backgroundSize = 'cover';
        bgEl.style.backgroundPosition = 'center';
      }
    }
  }
};