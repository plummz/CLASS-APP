/* School Lobby: welcome banner with a live clock, the class member list (green dot = online right
 * now from the live presence channel, grey = offline with last seen) and quick links. The walkable
 * plaza and lobby chat stay in script.js (lobbyModule). Reads the app's globals: currentUser,
 * users (from /api/users), isUserLiveOnline() and the 'classapp:presence' / 'classapp:page' events. */
(function () {
  window.classAppFeatures = window.classAppFeatures || {};
  window.classAppFeatures.lobby = { name: 'lobby' };

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const me = () => (typeof currentUser !== 'undefined' && currentUser) || null;
  const allUsers = () => (typeof users !== 'undefined' && Array.isArray(users) ? users : []);
  const onLobby = () => typeof currentPage !== 'undefined' && currentPage === 'lobby';
  let clockTimer = null;
  let refreshTimer = null;
  let requested = false;

  function isOnline(username) {
    if (!username) return false;
    if (me()?.username === username) return true;
    return typeof isUserLiveOnline === 'function' ? isUserLiveOnline(username) : false;
  }
  function liveStatus(username) {
    const info = typeof livePresenceInfo !== 'undefined' ? livePresenceInfo[username] : null;
    return info?.status === 'away' ? 'Away' : 'Online now';
  }
  function lastSeen(user) {
    const at = typeof getUserLastSeenAt === 'function' ? getUserLastSeenAt(user) : user.last_seen_at;
    if (typeof relativeActiveText === 'function') return relativeActiveText(at).replace(/^Active/, 'Last seen');
    return 'Offline';
  }
  function nameOf(user) { return user.display_name || user.displayName || user.username || ''; }
  function initials(name) {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }
  function hue(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return h;
  }
  function avatar(user, cls) {
    const name = nameOf(user);
    const src = String(user.avatar || '');
    if (/^(https?:|data:image\/|\/uploads\/)/.test(src)) {
      return `<span class="${cls}"><img src="${esc(src)}" alt="" loading="lazy" decoding="async"></span>`;
    }
    return `<span class="${cls}" style="--h:${hue(user.username || name)}">${esc(initials(name))}</span>`;
  }

  // ── Welcome banner ──────────────────────────────────────────
  function greeting(hour) {
    if (hour < 5) return 'Up late';
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }
  function renderHero() {
    const user = me();
    const now = new Date();
    const self = user ? (allUsers().find((u) => u.username === user.username) || user) : null;
    const name = self ? nameOf(self) : 'there';
    const first = String(name).split(/\s+/)[0] || name;
    const admin = (typeof isAdmin !== 'undefined' && isAdmin) || self?.is_admin;
    $('lobby-hero-kicker').textContent = `${greeting(now.getHours())}${admin ? ' · Admin' : ''}`;
    $('lobby-hero-title').textContent = `Welcome back, ${first}! 👋`;
    const others = allUsers().filter((u) => u.username !== user?.username && isOnline(u.username)).length;
    $('lobby-hero-sub').textContent = others === 0
      ? 'It’s quiet right now — be the first to say hi in the lobby chat.'
      : `${others} classmate${others === 1 ? ' is' : 's are'} online right now. Come say hi!`;
    $('lobby-hero-avatar').innerHTML = self ? avatar(self, 'lobby-hero-face') : '';
    tickClock();
  }
  function tickClock() {
    const now = new Date();
    const clock = $('lobby-clock');
    const date = $('lobby-date');
    if (clock) clock.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (date) date.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  }

  // ── Class members dropdown ──────────────────────────────────
  function sortedMembers() {
    const self = me()?.username;
    return allUsers()
      .filter((u) => u && u.username)
      .map((u) => ({ u, online: isOnline(u.username), self: u.username === self }))
      .sort((a, b) => (b.online - a.online) || (Boolean(b.u.is_admin) - Boolean(a.u.is_admin)) || nameOf(a.u).localeCompare(nameOf(b.u)));
  }
  function renderMembers() {
    const list = $('lobby-members-list');
    const count = $('lobby-members-count');
    const faces = $('lobby-members-faces');
    if (!list || !count) return;
    const members = sortedMembers();
    const online = members.filter((m) => m.online);
    if (!members.length) {
      const loading = typeof usersLoadState !== 'undefined' && usersLoadState.loading;
      count.textContent = loading || !requested ? 'Loading members…' : 'No members found';
      list.innerHTML = `<li class="lobby-members-empty">${loading || !requested ? 'Loading members…' : 'Couldn’t load the member list. Pull to refresh or try again later.'}</li>`;
      faces.innerHTML = '';
      return;
    }
    count.textContent = `${online.length} online · ${members.length} member${members.length === 1 ? '' : 's'}`;
    faces.innerHTML = online.slice(0, 4).map((m) => avatar(m.u, 'lm-face')).join('')
      + (online.length > 4 ? `<span class="lm-face lm-more">+${online.length - 4}</span>` : '');
    const q = ($('lobby-members-search')?.value || '').trim().toLowerCase();
    const shown = q ? members.filter((m) => nameOf(m.u).toLowerCase().includes(q) || m.u.username.toLowerCase().includes(q)) : members;
    list.innerHTML = shown.length ? shown.map(({ u, online: on, self }) => `
      <li>
        <button type="button" class="lobby-member ${on ? 'is-online' : ''}" data-member="${esc(u.username)}" ${self ? 'disabled' : ''}>
          <span class="lm-avatar-wrap">${avatar(u, 'lm-avatar')}<i class="lm-dot ${on ? 'on' : ''}" aria-hidden="true"></i></span>
          <span class="lm-text">
            <span class="lm-name">${esc(nameOf(u))}${self ? ' <em>(you)</em>' : ''}${u.is_admin ? ' <b class="lm-admin">Admin</b>' : ''}</span>
            <span class="lm-sub">@${esc(u.username)} · ${on ? esc(liveStatus(u.username)) : esc(lastSeen(u))}</span>
          </span>
          ${self ? '' : '<span class="lm-chat" aria-hidden="true">💬</span>'}
          <span class="sr-only">${on ? 'online' : 'offline'}${self ? '' : ', open chat'}</span>
        </button>
      </li>`).join('') : '<li class="lobby-members-empty">No one matches that search.</li>';
  }
  function setPanel(open) {
    const panel = $('lobby-members-panel');
    const toggle = $('lobby-members-toggle');
    if (!panel || !toggle) return;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    $('lobby-members').classList.toggle('open', open);
    if (open) renderMembers();
  }

  function ensureUsers() {
    if (requested) return;
    requested = true;
    if (!allUsers().length && typeof fetchUsers === 'function') {
      Promise.resolve(fetchUsers()).finally(() => { renderMembers(); renderHero(); });
    }
  }

  function renderAll() {
    if (!onLobby()) return;
    ensureUsers();
    renderHero();
    renderMembers();
  }

  function start() {
    renderAll();
    clearInterval(clockTimer);
    clockTimer = setInterval(() => { if (onLobby()) tickClock(); }, 15000);
    clearInterval(refreshTimer);
    // Last-seen text and the list itself go stale slowly; presence events update the dots right away
    refreshTimer = setInterval(() => { if (onLobby()) renderAll(); }, 60000);
  }
  function stop() {
    clearInterval(clockTimer); clockTimer = null;
    clearInterval(refreshTimer); refreshTimer = null;
    setPanel(false);
  }

  function setup() {
    const toggle = $('lobby-members-toggle');
    if (!toggle || toggle.dataset.ready) return;
    toggle.dataset.ready = '1';
    toggle.addEventListener('click', () => setPanel($('lobby-members-panel').hidden));
    $('lobby-members-search').addEventListener('input', renderMembers);
    $('lobby-members-list').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-member]');
      if (!btn || btn.disabled) return;
      setPanel(false);
      window.openChat?.('private', btn.dataset.member);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('lobby-members-panel').hidden) setPanel(false); });
    document.addEventListener('pointerdown', (e) => {
      if (!$('lobby-members-panel').hidden && !e.target.closest('#lobby-members')) setPanel(false);
    });
    $('lobby-quick').addEventListener('click', (e) => {
      const tile = e.target.closest('[data-lobby-go]');
      if (tile) window.goToPage?.(tile.dataset.lobbyGo);
    });
    window.addEventListener('classapp:presence', () => { if (onLobby()) { renderMembers(); renderHero(); } });
    window.addEventListener('classapp:page', (e) => (e.detail === 'lobby' ? start() : stop()));
    if (onLobby()) start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
