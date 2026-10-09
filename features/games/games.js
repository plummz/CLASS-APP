/* Games homepage (Arcade): search, category filters, a "Continue playing" row (last 3 games
 * opened from here, stored on this device) and an empty state. Only the homepage; every game
 * keeps its own page and code. */
(function () {
  window.classAppFeatures = window.classAppFeatures || {};
  window.classAppFeatures.games = { name: 'games' };

  const RECENT_KEY = 'classapp_recent_games_v1';
  const GAMES = {
    dungeon: { name: 'Dungeon of Knowledge', icon: '🗝️' },
    pokemon: { name: 'Pokémon', icon: '⚡' },
    royale3d: { name: 'Battle Royale 3D', icon: '🪂' },
    royale: { name: 'Battle Royale Classic', icon: '🎯' },
    pacman: { name: 'Pac-Man', icon: '👾' },
    candy: { name: 'Candy Match', icon: '🍬' },
    tetris: { name: 'Tetris', icon: '🧱' },
  };
  const $ = (id) => document.getElementById(id);
  let filter = 'all';

  function readRecent() {
    try {
      const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      return Array.isArray(list) ? list.filter((r) => GAMES[r?.id]) : [];
    } catch (_) { return []; }
  }
  function remember(id) {
    if (!GAMES[id]) return;
    try {
      const list = [{ id, at: Date.now() }, ...readRecent().filter((r) => r.id !== id)].slice(0, 3);
      localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    } catch (_) {}
  }
  function ago(at) {
    const min = Math.round((Date.now() - at) / 60000);
    if (min < 1) return 'Just now';
    if (min < 60) return `${min} min ago`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h} h ago`;
    const d = Math.round(h / 24);
    return d === 1 ? 'Yesterday' : `${d} days ago`;
  }

  function renderRecent() {
    const wrap = $('games-recent');
    const row = $('games-recent-row');
    if (!wrap || !row) return;
    const recent = readRecent();
    wrap.hidden = recent.length === 0;
    row.innerHTML = recent.map((r) => `
      <button type="button" class="games-recent-card" data-play="${r.id}">
        <span class="games-recent-icon" aria-hidden="true">${GAMES[r.id].icon}</span>
        <span class="games-recent-text">
          <span class="games-recent-name">${GAMES[r.id].name}</span>
          <span class="games-recent-meta">${ago(r.at)}</span>
        </span>
        <span class="games-recent-go" aria-hidden="true">→</span>
      </button>`).join('');
  }

  function applyFilter() {
    const q = ($('games-search')?.value || '').trim().toLowerCase();
    const cards = [...document.querySelectorAll('#page-games .game-card[data-game]')];
    let shown = 0;
    cards.forEach((card) => {
      const cats = (card.dataset.cat || '').split(' ');
      const text = card.textContent.toLowerCase();
      const ok = (filter === 'all' || cats.includes(filter)) && (!q || text.includes(q));
      card.hidden = !ok;
      if (ok) shown += 1;
    });
    const empty = $('games-empty');
    if (empty) empty.hidden = shown > 0;
    const count = $('games-count');
    if (count) count.textContent = shown === cards.length ? `${cards.length} games · pick one and start playing` : `Showing ${shown} of ${cards.length} games`;
  }

  function setFilter(value) {
    filter = value;
    document.querySelectorAll('#page-games .games-filter').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.filter === value)));
    applyFilter();
  }

  function setup() {
    const page = $('page-games');
    if (!page || page.dataset.homeReady) return;
    page.dataset.homeReady = '1';

    // Remember which game was opened (runs before the card's own goToPage click)
    page.addEventListener('click', (e) => {
      const card = e.target.closest('.game-card[data-game]');
      if (card) remember(card.dataset.game);
      const recent = e.target.closest('[data-play]');
      if (recent) { remember(recent.dataset.play); window.goToPage?.(recent.dataset.play); }
      const chip = e.target.closest('.games-filter');
      if (chip) setFilter(chip.dataset.filter);
    }, true);
    // Cards work from the keyboard too
    page.addEventListener('keydown', (e) => {
      const card = e.target.closest?.('.game-card[data-game]');
      if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); card.click(); }
    });
    $('games-search')?.addEventListener('input', applyFilter);
    $('games-empty-reset')?.addEventListener('click', () => { const i = $('games-search'); if (i) i.value = ''; setFilter('all'); });
    window.addEventListener('classapp:page', (e) => { if (e.detail === 'games') renderRecent(); });
    renderRecent();
    applyFilter();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
