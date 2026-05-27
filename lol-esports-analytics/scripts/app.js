/* ============================================================
   APP — main initialization and controller
   ============================================================ */

const App = (() => {

  let _data   = null;
  let _loader = null;
  let _revealObserver = null;

  /* ── BOOT ── */
  async function boot() {
    _loader = document.getElementById('app-loader');
    const loaderBar = document.querySelector('.loader-bar');

    setLoaderProgress(loaderBar, 20);

    // Initialize Chart.js defaults
    if (window.Chart) Charts.defaults();

    setLoaderProgress(loaderBar, 40);

    // Load all data
    _data = await DataEngine.loadAll();
    if (!_data.teams || !_data.players) {
      showError('Failed to load data. Make sure you are serving the site via a local server (e.g. python -m http.server).');
      return;
    }

    setLoaderProgress(loaderBar, 70);

    // Initialize pages engine
    Pages.init(_data);

    setLoaderProgress(loaderBar, 90);

    // Setup UI
    setupNavbar();
    setupSidebar();
    setupSearch();
    setupModal();
    setupThemeToggle();

    setLoaderProgress(loaderBar, 100);

    // Hide loader
    setTimeout(() => {
      if (_loader) _loader.classList.add('hidden');
    }, 400);

    // Initialize router
    Router.init(_data);
  }

  function setLoaderProgress(bar, pct) {
    if (bar) bar.style.width = pct + '%';
  }

  function showError(msg) {
    if (_loader) {
      _loader.querySelector('.loader-sub').textContent = msg;
      _loader.querySelector('.loader-sub').style.color = '#ff4455';
    }
  }

  /* ── NAVBAR ── */
  function setupNavbar() {
    // Active link on route change
    Router.onChange(route => {
      document.querySelectorAll('.navbar__link').forEach(el => {
        el.classList.toggle('active', el.dataset.route === route.split('?')[0]);
      });
      document.querySelectorAll('.sidebar__item').forEach(el => {
        el.classList.toggle('active', el.dataset.route === route);
      });
    });

    // Hamburger
    const hamburger = document.getElementById('hamburger-btn');
    const sidebar   = document.getElementById('sidebar');
    const overlay   = document.getElementById('sidebar-overlay');

    if (hamburger && sidebar) {
      hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay?.classList.toggle('active');
      });
    }
    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }

    // Scroll effect
    window.addEventListener('scroll', () => {
      const navbar = document.getElementById('navbar');
      if (navbar) navbar.style.background = window.scrollY > 20
        ? 'rgba(6, 9, 20, 0.98)'
        : 'rgba(6, 9, 20, 0.85)';
    }, { passive: true });
  }

  /* ── SIDEBAR ── */
  function setupSidebar() {
    document.querySelectorAll('[data-route]').forEach(el => {
      el.addEventListener('click', () => {
        Router.navigate(el.dataset.route);
        // Close sidebar on mobile after nav
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (window.innerWidth < 768) {
          sidebar?.classList.remove('open');
          overlay?.classList.remove('active');
        }
      });
    });
  }

  /* ── SEARCH ── */
  function setupSearch() {
    const input   = document.getElementById('global-search');
    const results = document.getElementById('search-results');
    if (!input || !results) return;

    const doSearch = Utils.debounce((q) => {
      const found = DataEngine.search(_data, q);
      if (!found.length) {
        results.classList.remove('active');
        return;
      }
      results.innerHTML = found.map(r => `
        <div class="search-result-item" onclick="Router.navigate('${r.type === 'team' ? 'teams' : r.type === 'player' ? 'players' : 'tournaments'}?id=${r.id}');document.getElementById('search-results').classList.remove('active');">
          <span class="search-result-badge badge-${r.type}">${r.type}</span>
          <span style="font-weight:600;">${Utils.escHtml(r.name)}</span>
          <span style="color:var(--text-muted);font-size:var(--text-xs);margin-left:auto;">${Utils.escHtml(String(r.sub || ''))}</span>
        </div>
      `).join('');
      results.classList.add('active');
    }, 250);

    input.addEventListener('input', () => {
      const q = input.value.trim();
      if (!q) { results.classList.remove('active'); return; }
      doSearch(q);
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        results.classList.remove('active');
        input.value = '';
      }
    });

    document.addEventListener('click', e => {
      if (!input.contains(e.target) && !results.contains(e.target)) {
        results.classList.remove('active');
      }
    });
  }

  /* ── MODAL ── */
  function setupModal() {
    const overlay = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close');

    overlay?.addEventListener('click', e => {
      if (e.target === overlay) Utils.closeModal();
    });
    closeBtn?.addEventListener('click', Utils.closeModal);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') Utils.closeModal();
    });
  }

  /* ── THEME ── */
  function setupThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    const html = document.documentElement;

    const saved = localStorage.getItem('lol-theme') || 'dark';
    html.dataset.theme = saved;
    if (btn) btn.textContent = saved === 'dark' ? '☀️' : '🌙';

    btn?.addEventListener('click', () => {
      const current = html.dataset.theme;
      const next = current === 'dark' ? 'light' : 'dark';
      html.dataset.theme = next;
      localStorage.setItem('lol-theme', next);
      btn.textContent = next === 'dark' ? '☀️' : '🌙';
    });
  }

  /* ── AFTER RENDER HOOKS ── */
  function afterRender(page, params) {
    // Re-init scroll observer
    if (_revealObserver) _revealObserver.disconnect();
    _revealObserver = Utils.initScrollReveal();

    // Initialize charts per page
    if (page === 'home') {
      const teams   = DataEngine.getTeams(_data.teams);
      const regions = DataEngine.getActiveRegions(_data.regions);
      const wwbr    = DataEngine.getWorldsWinnersByRegion(_data.stats);
      const players = DataEngine.getPlayers(_data.players);

      Charts.worldsTitlesBar('chart-worlds-titles', teams);
      Charts.regionPie('chart-region-pie', wwbr);
      Charts.eraTimeline('chart-era-timeline');
      Charts.dynastyRadar('chart-radar', teams);
      Charts.goatIndexBar('chart-goat', players);
    }

    if (page === 'regions') {
      const regions = DataEngine.getActiveRegions(_data.regions);
      Charts.regionalWinrateBar('chart-regional-winrate', regions);
      Utils.initSortableTable('table-regions');
    }

    if (page === 'home') {
      Utils.initSortableTable('table-dynasties');
    }

    if (page === 'team-detail' && params.id) {
      const team = DataEngine.getTeamById(_data.teams, params.id);
      if (team) Charts.teamPerformanceLine('chart-team-performance', team);
    }
  }

  return { boot, afterRender };
})();

/* ── ROUTER ── */
const Router = (() => {
  let _data = null;
  const changeCallbacks = [];
  let _current = '';

  function init(data) {
    _data = data;
    window.addEventListener('popstate', () => handle());
    handle();
  }

  function navigate(route) {
    if (route === _current) return;
    window.history.pushState({}, '', '#' + route);
    handle();
  }

  function handle() {
    const hash = location.hash.replace('#', '') || 'home';
    const [page, queryStr] = hash.split('?');
    const params = {};
    if (queryStr) {
      queryStr.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }

    _current = hash;
    changeCallbacks.forEach(cb => cb(hash));
    renderPage(page, params);
  }

  function onChange(cb) {
    changeCallbacks.push(cb);
  }

  function renderPage(page, params) {
    const main = document.getElementById('page-content');
    if (!main) return;

    main.classList.add('page-exit');
    setTimeout(() => {
      main.classList.remove('page-exit');
      main.scrollTop = 0;
      window.scrollTo(0, 0);

      let html = '';

      if (page === 'home')         html = Pages.renderHome();
      else if (page === 'teams' && !params.id) html = Pages.renderTeams(params);
      else if (page === 'teams' && params.id)  html = Pages.renderTeamDetail(params.id);
      else if (page === 'players' && !params.id) html = Pages.renderPlayers(params);
      else if (page === 'players' && params.id)  html = Pages.renderPlayerDetail(params.id);
      else if (page === 'regions')   html = Pages.renderRegions();
      else if (page === 'matches')   html = Pages.renderMatches(params);
      else if (page === 'tournaments') html = Pages.renderTournaments();
      else if (page === 'compare')   html = Pages.renderCompare();
      else                           html = Pages.renderHome();

      main.innerHTML = html;
      main.classList.add('page-enter');
      setTimeout(() => main.classList.remove('page-enter'), 500);

      // Post-render
      const pageKey = page === 'teams' && params.id ? 'team-detail'
                    : page === 'players' && params.id ? 'player-detail'
                    : page;
      App.afterRender(pageKey, params);
    }, 200);
  }

  return { init, navigate, onChange };
})();

/* ── START ── */
document.addEventListener('DOMContentLoaded', App.boot);
