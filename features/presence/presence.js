/* Online status for everyone: away detection, a live "● N online" pill on every page, and a
 * quick list of who's online (with what they're doing) that has Chat and, when rooms are
 * available, Invite buttons. Other features read the online list through
 * window.classAppPresence.onlineUsers() and listen for the 'classapp:presence' event. */
(function () {
  const AWAY_AFTER_MS = 3 * 60 * 1000;
  let lastInput = Date.now();
  let away = false;

  function setStatus(next) {
    if (typeof presenceStatus === 'undefined' || presenceStatus === next) return;
    presenceStatus = next;
    window.trackPresence?.();
  }

  // Away when the app is in the background or nobody has touched it for 3 minutes
  function markActive() {
    lastInput = Date.now();
    if (away && !document.hidden) { away = false; setStatus('online'); }
  }
  ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach((type) =>
    window.addEventListener(type, markActive, { passive: true, capture: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { away = true; setStatus('away'); }
    else markActive();
  });
  setInterval(() => {
    // A game in an iframe takes the input; playing a 3D game is never "away"
    const inGame = typeof currentPage !== 'undefined' && ['royale3d', 'dungeon'].includes(currentPage);
    if (!away && !inGame && Date.now() - lastInput > AWAY_AFTER_MS) { away = true; setStatus('away'); }
  }, 15000);

  function onlineUsers() {
    if (typeof livePresenceInfo === 'undefined') return [];
    const me = typeof currentUser !== 'undefined' ? currentUser?.username : '';
    return Object.entries(livePresenceInfo)
      .filter(([username]) => username && username !== me)
      .map(([username, info]) => ({ username, ...info }))
      .sort((a, b) => (a.status === b.status ? a.displayName.localeCompare(b.displayName) : a.status === 'online' ? -1 : 1));
  }

  // ── "● N online" pill and quick list ─────────────────────────────────
  function ensurePill() {
    let pill = document.getElementById('presence-pill');
    if (pill) return pill;
    pill = document.createElement('button');
    pill.id = 'presence-pill';
    pill.type = 'button';
    pill.className = 'presence-pill';
    pill.setAttribute('aria-haspopup', 'dialog');
    pill.addEventListener('click', togglePanel);
    document.body.appendChild(pill);
    return pill;
  }

  function render() {
    const pill = ensurePill();
    const signedIn = typeof currentUser !== 'undefined' && currentUser?.username;
    const hidden = !signedIn || (typeof currentPage !== 'undefined' && ['royale3d', 'dungeon', 'pokemon', 'royale', 'pacman', 'candy', 'tetris', 'lobby'].includes(currentPage));
    pill.hidden = Boolean(hidden);
    const list = onlineUsers();
    const online = list.filter((u) => u.status === 'online').length;
    pill.innerHTML = `<span class="presence-dot"></span>${online} online${list.length > online ? ` · ${list.length - online} away` : ''}`;
    pill.setAttribute('aria-label', `${online} classmates online. Show who's online`);
    const panel = document.getElementById('presence-panel');
    if (panel && !panel.hidden) renderPanel(panel);
  }

  function togglePanel() {
    let panel = document.getElementById('presence-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'presence-panel';
      panel.className = 'presence-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', 'Who is online');
      document.body.appendChild(panel);
      document.addEventListener('click', (e) => {
        if (!panel.hidden && !panel.contains(e.target) && e.target.id !== 'presence-pill') panel.hidden = true;
      });
    } else {
      panel.hidden = !panel.hidden;
    }
    if (!panel.hidden) renderPanel(panel);
  }

  function renderPanel(panel) {
    const esc = window.escapeHTML || ((v) => String(v ?? ''));
    const list = onlineUsers();
    const canInvite = typeof window.classAppRooms?.invite === 'function';
    panel.innerHTML = `
      <div class="presence-panel-head">
        <strong>Online now</strong>
        <button type="button" class="presence-close" aria-label="Close" data-presence-close>&times;</button>
      </div>
      ${list.length ? list.map((u) => {
        const doing = u.status === 'away' ? 'Away' : (window.presenceActivityText?.(u.page) || (typeof presenceActivityText === 'function' ? presenceActivityText(u.page) : '') || 'Online');
        return `
        <div class="presence-row">
          <span class="presence-avatar ${u.status}">${esc((u.displayName || u.username || '?').trim().charAt(0).toUpperCase())}</span>
          <span class="presence-who">
            <span class="presence-name">${esc(u.displayName || u.username)}</span>
            <span class="presence-doing">${esc(doing)}</span>
          </span>
          <button type="button" class="presence-action" data-presence-chat="${esc(u.username)}">Chat</button>
          ${canInvite ? `<button type="button" class="presence-action invite" data-presence-invite="${esc(u.username)}">Invite</button>` : ''}
        </div>`;
      }).join('') : '<p class="presence-empty">Nobody else is online right now.</p>'}
    `;
  }

  document.addEventListener('click', (e) => {
    const chat = e.target.closest?.('[data-presence-chat]');
    if (chat) {
      document.getElementById('presence-panel').hidden = true;
      window.openChat?.('private', chat.dataset.presenceChat);
      return;
    }
    const invite = e.target.closest?.('[data-presence-invite]');
    if (invite) {
      window.classAppRooms?.invite(invite.dataset.presenceInvite);
      return;
    }
    if (e.target.closest?.('[data-presence-close]')) {
      document.getElementById('presence-panel').hidden = true;
    }
  });

  window.addEventListener('classapp:presence', render);
  window.addEventListener('classapp:page', render);
  setInterval(render, 10000);   // keeps "Active N minutes ago" fresh and covers missed events
  document.addEventListener('DOMContentLoaded', render);

  window.classAppPresence = { onlineUsers, render };
})();
