// features/logging-in/shell-controls.js
// Global shell: menu toggle, sidebar, page switching, session establishment

// Many pages are rendered dynamically and initialized during navigation.
// A single thrown error inside goToPage() can abort the rest of the function
// and make the app feel like “buttons do nothing”. Keep this helper generic.
if (typeof window.runSafeUiAction !== 'function') {
  window.runSafeUiAction = function runSafeUiAction(label, fn) {
    try {
      if (typeof fn === 'function') fn();
    } catch (error) {
      console.error(`[ui] ${label} init failed:`, error);
      if (typeof window.showToast === 'function') {
        window.showToast(`${label} failed. Check console.`, 'error');
      } else if (typeof window.customAlert === 'function') {
        window.customAlert(`${label} failed. Check console.`);
      }
    }
  };
}

window.toggleMenu = function() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('menu-toggle').classList.toggle('open'); document.getElementById('overlay').classList.toggle('active'); };
window.closeMenu = function() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('menu-toggle').classList.remove('open'); document.getElementById('overlay').classList.remove('active'); };

window.goToPage = function(pageName) {
  if (pageName === currentPage) { const p = document.getElementById('page-' + pageName); if(p) p.scrollTop = 0; closeMenu(); return; }
  if (pageName === 'chat') { const dot = document.getElementById('chat-notif-dot'); if (dot) dot.classList.add('hidden'); }

  // Lobby: tear down canvas when leaving
  if (currentPage === 'lobby') lobbyModule.destroy();
  // Pokemon: tear down when leaving
  if (currentPage === 'pokemon' && typeof pokemonModule !== 'undefined') pokemonModule.destroy();
  // Royale: tear down when leaving
  if (currentPage === 'royale' && typeof royaleModule !== 'undefined') royaleModule.destroy();
  if (currentPage === 'pacman' && typeof pacmanModule !== 'undefined') pacmanModule.destroy();
  if (currentPage === 'candy'  && typeof candyModule  !== 'undefined') candyModule.destroy();
  // Alarm: tear down clock when leaving
  if (currentPage === 'alarm' && typeof alarmModule !== 'undefined') alarmModule.destroy();
  // File Summarizer: close quiz modal/score screen when navigating away
  if (currentPage === 'file-summarizer') {
    document.getElementById('fs-quiz-modal')?.classList.remove('active');
    document.getElementById('fs-quiz-score')?.classList.remove('active');
  }

  // YouTube mini-player: show when leaving music, hide when returning
  const ytMini = document.getElementById('yt-mini-player');
  if (ytMini) {
    if (pageName === 'music') ytMini.classList.add('hidden');
    else if (ytActive && currentPage === 'music') ytMini.classList.remove('hidden');
  }

  // Ping server when music page opens so Render wakes up before the user searches
  if (pageName === 'music') fetch('/api/ping').catch(() => {});

  // Hide chat bauble on pages where it blocks controls or the AI input
  const chatBauble = document.getElementById('chat-bauble');
  if (chatBauble) chatBauble.style.display = (pageName === 'pokemon' || pageName === 'royale' || pageName === 'pacman' || pageName === 'candy' || pageName === 'lobby' || pageName === 'ai' || pageName === 'outputai' || pageName === 'codelab' || pageName === 'coding-educational') ? 'none' : '';

  // Hide live clock on AI page — it overlaps the chat header
  const liveClock = document.getElementById('live-clock');
  if (liveClock) liveClock.style.display = (pageName === 'ai' || pageName === 'outputai' || pageName === 'codelab' || pageName === 'coding-educational') ? 'none' : '';

  const old = pageConfig[currentPage];
  const oldPage = document.getElementById('page-' + currentPage);
  if(oldPage) oldPage.classList.remove('active');
  if (old) {
    document.getElementById(old.bg)?.classList.remove('active');
    document.getElementById(old.particles)?.classList.remove('active');
    if (old.wave) document.getElementById('wave-container')?.classList.remove('active');
    if (old.mountain) document.getElementById('mountain-svg')?.classList.remove('active');
    if (old.aurora) document.getElementById('aurora')?.classList.remove('active');
  }

  currentPage = pageName;
  if (appPresenceChannel && currentUser?.username) {
    appPresenceChannel.track({
      username: currentUser.username,
      displayName: currentUser.display_name || currentUser.username,
      page: currentPage,
      activeAt: new Date().toISOString(),
    }).catch(() => {});
    persistLastSeen({ online: true });
  }
  const cfg = pageConfig[pageName];
  const newPage = document.getElementById('page-' + pageName);
  if(newPage) newPage.classList.add('active');

  // Some builds define applyPageBackground globally; others only inside personalization.
  // Missing hook must not crash navigation.
  if (typeof window.applyPageBackground === 'function') {
    window.applyPageBackground(pageName);
  } else if (window.personalizationModule && typeof window.personalizationModule.applyPageBackground === 'function') {
    window.personalizationModule.applyPageBackground(pageName);
  }

  const indicator = document.getElementById('page-indicator');
  if (indicator && cfg) indicator.textContent = cfg.label;
  if(newPage) newPage.scrollTop = 0;
  document.querySelectorAll('.nav-item').forEach(item => { if(item.dataset.page) item.classList.toggle('active', item.dataset.page === pageName); });
  closeMenu();

  // Lobby: start canvas after page is visible
  if (pageName === 'lobby') {
    window.runSafeUiAction('Lobby', () => { _ensureSocket(); lobbyModule.init(); });
  }
  // Pokemon: start after page is visible
  if (pageName === 'pokemon' && typeof pokemonModule !== 'undefined') window.runSafeUiAction('Pokemon', () => pokemonModule.init());
  // Royale: start after page is visible
  if (pageName === 'royale' && typeof royaleModule !== 'undefined') window.runSafeUiAction('Battle Royale', () => royaleModule.init());
  if (pageName === 'pacman' && typeof pacmanModule !== 'undefined') window.runSafeUiAction('Pac-Man', () => pacmanModule.init());
  if (pageName === 'candy'  && typeof candyModule  !== 'undefined') window.runSafeUiAction('Candy Match', () => candyModule.init());
  if (pageName === 'personal-tools' && typeof personalToolsModule !== 'undefined') window.runSafeUiAction('Personal Tools', () => personalToolsModule.init());
  if (pageName === 'alarm' && typeof alarmModule !== 'undefined') window.runSafeUiAction('Alarm Clock', () => alarmModule.init());
  if (pageName === 'notepad' && typeof notepadModule !== 'undefined') window.runSafeUiAction('Notepad', () => notepadModule.init());
  if (pageName === 'calculator' && typeof calculatorModule !== 'undefined') window.runSafeUiAction('Calculator', () => calculatorModule.init());
  if (pageName === 'personalization' && typeof personalizationModule !== 'undefined') window.runSafeUiAction('Personalization', () => personalizationModule.init());
  if (pageName === 'reviewers' && typeof reviewersModule !== 'undefined') window.runSafeUiAction('Reviewers', () => reviewersModule.init());
  if (pageName === 'diagnostics') window.runSafeUiAction('Diagnostics', () => loadDiagnostics());
  // Games hub: draw royale preview canvas
  if (pageName === 'games') window.runSafeUiAction('Games', () => drawRoyalePreviewCanvas());
  // Event Pictures & Random Pictures: reset and render year cards
  if (pageName === 'events') window.runSafeUiAction('Event Pictures', () => { galleryStates.ep = { level:'years', year:null, sem:null, folder:null }; renderGallery('ep'); });
  if (pageName === 'random') window.runSafeUiAction('Random Pictures', () => { galleryStates.rp = { level:'years', year:null, sem:null, folder:null }; renderGallery('rp'); });
  if (pageName === 'announcement') window.runSafeUiAction('Announcement', () => fetchSharedAnnouncements());
  if (pageName === 'witfb') window.runSafeUiAction('Social Media Pages', () => closeSocialPage());
  if (pageName === 'outputai') window.runSafeUiAction('Output-AI', () => fetchSharedAIOutputs());
  if (pageName === 'codelab') window.runSafeUiAction('Code Lab', () => window.initCodeLab?.());
  if (pageName === 'coding-educational') window.runSafeUiAction('Coding Lessons', () => window.initCodingEducational?.());
  // AI Assistants hub
  if (pageName === 'ai') window.runSafeUiAction('AI Assistants', () => { aiView = 'hub'; renderAI(); });
  if (pageName === 'admin') window.runSafeUiAction('Admin', () => loadAdminDashboard());
}

// Sidebar nav item click delegation handler with ripple effect and keyboard support
const sidebarNavHandler = function() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.addEventListener('click', function(event) {
      const navItem = event.target.closest('.nav-item[data-page]');
      const dropdownHeader = event.target.closest('.nav-dropdown-header[data-year]');
      const logoutItem = event.target.closest('#nav-logout');

      const target = navItem || dropdownHeader || logoutItem;
      if (!target) return;

      // Ripple effect
      const rect = target.getBoundingClientRect();
      target.style.setProperty('--ripple-x', `${event.clientX - rect.left}px`);
      target.style.setProperty('--ripple-y', `${event.clientY - rect.top}px`);
      target.classList.remove('nav-click-flash');
      void target.offsetWidth;
      target.classList.add('nav-click-flash');
      window.setTimeout(() => target.classList.remove('nav-click-flash'), 420);

      // Action
      if (navItem && navItem.dataset.page) {
        window.goToPage(navItem.dataset.page);
      } else if (dropdownHeader && dropdownHeader.dataset.year) {
        window.toggleYear(dropdownHeader.dataset.year);
      } else if (logoutItem) {
        window.handleLogout();
      }
    });

    // Keyboard support: Enter / Space triggers click
    sidebar.addEventListener('keydown', function(event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const target = event.target.closest('.nav-item[data-page], .nav-dropdown-header[data-year], #nav-logout');
      if (!target) return;
      event.preventDefault();
      target.click();
    });
  }
};

async function establishSession() {
  await waitForSupabaseClient();
  syncAuthState();
  renderAppState();
  const navLogout = document.getElementById('nav-logout');
  if(navLogout) navLogout.style.display = 'flex';

  fetchUsers();
  initAppPresence();
  startLastSeenHeartbeat();
  updateChatHeader();
  initSupabaseRealtimeChat();
  initSharedRealtime();
  initAppOpenRealtime();
  ensureAdminUpdateControl();
  fetchAppUpdates();
  registerPushSubscription(false);
  fetchMessages(currentChat.type, currentChat.target);
  handleNotificationDeepLink();
  initReactionsRealtime();
}

document.addEventListener('DOMContentLoaded', sidebarNavHandler);
