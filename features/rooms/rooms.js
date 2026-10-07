/* Battle Royale 3D rooms: make a room, invite classmates who are online, and the host starts
 * one match for everyone in it (bots fill the rest of the 30 slots). The server side is
 * royale-rooms.js. While a match runs, the Godot game in the royale3d iframe reads the match
 * with takeMatch() and exchanges its messages through send() / drain(). */
(function () {
  let sock = null;
  let room = null;           // { id, host, state, members: [{ username, displayName }], invited: [], max }
  let pendingMatch = null;   // set when the host starts; the game takes it when it loads
  let activeMatch = null;    // the match the game is playing now
  let inbox = [];
  let inviteTimer = null;

  const esc = (v) => (typeof escapeHTML === 'function' ? escapeHTML(v) : String(v ?? ''));
  const toast = (msg, type) => (typeof showToast === 'function' ? showToast(msg, type) : console.log(msg));
  const user = () => (typeof currentUser !== 'undefined' ? currentUser : null);
  const myName = () => user()?.display_name || user()?.username || '';
  const isHost = () => room && room.host === user()?.username;

  // ── Socket ───────────────────────────────────────────────────
  function ensureSocket() {
    if (sock) return sock;
    if (!user()?.username || typeof _ensureSocket !== 'function' || typeof io !== 'function') return null;
    sock = _ensureSocket();
    sock.on('connect', () => sock.emit('room:resume'));
    if (sock.connected) sock.emit('room:resume');
    sock.on('room:update', (next) => {
      const wasIn = Boolean(room);
      room = next || null;
      if (wasIn && !room) closePanel();
      render();
    });
    sock.on('room:invited', showInvite);
    sock.on('room:declined', ({ username }) => toast(`${nameOf(username)} can't play right now.`, 'info'));
    sock.on('room:start', startMatch);
    sock.on('room:net', (msg) => {
      if (!activeMatch && !pendingMatch) return;
      inbox.push(msg);
      if (inbox.length > 3000) inbox.splice(0, inbox.length - 3000);
    });
    return sock;
  }

  function emit(event, payload) {
    const s = ensureSocket();
    if (!s) { toast('Sign in to play with classmates.', 'error'); return Promise.resolve({ ok: false }); }
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve({ ok: false, error: 'No connection to the server. Try again.' }), 8000);
      s.emit(event, payload, (res) => { clearTimeout(timer); resolve(res || { ok: true }); });
    });
  }

  function nameOf(username) {
    const m = room?.members.find((p) => p.username === username);
    if (m) return m.displayName;
    const online = window.classAppPresence?.onlineUsers?.().find((u) => u.username === username);
    return online?.displayName || username;
  }

  // ── Room actions ─────────────────────────────────────────────
  async function create() {
    if (room) return true;
    const res = await emit('room:create', { displayName: myName() });
    if (!res.ok) { toast(res.error || 'Could not make a room.', 'error'); return false; }
    room = res.room;
    render();
    return true;
  }

  async function invite(username) {
    if (!(await create())) return;
    openPanel();
    const res = await emit('room:invite', { to: username });
    if (res.ok) toast(`Invite sent to ${nameOf(username)}`, 'success');
    else toast(res.error || 'Could not send the invite.', 'error');
  }

  async function join(roomId) {
    hideInvite();
    const res = await emit('room:join', { roomId, displayName: myName() });
    if (!res.ok) { toast(res.error || 'Could not join.', 'error'); return; }
    room = res.room;
    openPanel();
  }

  function leave() {
    sock?.emit('room:leave');
    room = null;
    closePanel();
  }

  async function start() {
    const res = await emit('room:start', {});
    if (!res.ok) toast(res.error || 'Could not start.', 'error');
  }

  // Names in the match must be unique (kill feed, crates); every player computes the same list
  function matchPlayers(players) {
    const used = new Set();
    return players.map((p) => {
      const base = String(p.displayName || p.username).slice(0, 20);
      let name = base;
      for (let n = 2; used.has(name.toLowerCase()); n += 1) name = `${base} ${n}`;
      used.add(name.toLowerCase());
      return { username: p.username, name };
    });
  }

  function startMatch(data) {
    if (!data || data.roomId !== room?.id) return;
    pendingMatch = { roomId: data.roomId, seed: data.seed, host: data.host, me: user()?.username, players: matchPlayers(data.players || []) };
    activeMatch = null;
    inbox = [];
    closePanel(true);
    hideInvite();
    toast('Match starting!', 'success');
    if (typeof currentPage !== 'undefined' && currentPage === 'royale3d') {
      window.royale3dModule?.destroy();
      window.royale3dModule?.init();
    } else {
      window.goToPage?.('royale3d');
    }
  }

  // ── Bridge for the game (called from Godot through JavaScriptBridge) ─────
  function takeMatch() {
    if (!pendingMatch) return '';
    activeMatch = pendingMatch;
    pendingMatch = null;
    return JSON.stringify(activeMatch);
  }
  function send(msg) {
    if (!activeMatch || !sock?.connected || !msg || typeof msg !== 'object') return;
    sock.emit('room:net', msg);
  }
  function drain() {
    if (!inbox.length) return '[]';
    const out = JSON.stringify(inbox);
    inbox = [];
    return out;
  }
  // The royale3d iframe closed (left the page or the game reloaded)
  function gameClosed() {
    if (activeMatch) send({ t: 'quit' });
    activeMatch = null;
  }
  // "Back to room" on the results screen
  function backToRoom() {
    activeMatch = null;
    if (isHost()) sock?.emit('room:back');
    window.royale3dModule?.destroy();
    openPanel();
  }

  // ── Invite pop-up ────────────────────────────────────────────
  function showInvite({ roomId, from, fromName, count }) {
    if (room?.id === roomId) return;
    hideInvite();
    const box = document.createElement('div');
    box.id = 'room-invite';
    box.className = 'room-invite';
    box.setAttribute('role', 'alertdialog');
    box.innerHTML = `
      <div class="room-invite-text"><strong>${esc(fromName || from)}</strong> invited you to play <strong>Battle Royale 3D</strong>
        <span class="room-invite-sub">${count} in the room</span></div>
      <div class="room-invite-actions">
        <button type="button" class="room-btn" data-room-decline>No thanks</button>
        <button type="button" class="room-btn primary" data-room-join>Join</button>
      </div>`;
    box.querySelector('[data-room-join]').addEventListener('click', () => join(roomId));
    box.querySelector('[data-room-decline]').addEventListener('click', () => { sock?.emit('room:decline', { roomId }); hideInvite(); });
    document.body.appendChild(box);
    try { navigator.vibrate?.(80); } catch (_) {}
    inviteTimer = setTimeout(hideInvite, 45000);
  }
  function hideInvite() {
    clearTimeout(inviteTimer);
    document.getElementById('room-invite')?.remove();
  }

  // ── Room panel ───────────────────────────────────────────────
  function openPanel() {
    ensureSocket();
    let panel = document.getElementById('room-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'room-panel';
      panel.className = 'room-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-label', 'Battle Royale room');
      panel.addEventListener('click', onPanelClick);
      document.body.appendChild(panel);
    }
    panel.hidden = false;
    render();
  }

  // starting = the match is loading, so don't reopen the single-player game behind it
  function closePanel(starting) {
    const panel = document.getElementById('room-panel');
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    if (!starting && typeof currentPage !== 'undefined' && currentPage === 'royale3d') window.royale3dModule?.init();
  }

  function onPanelClick(e) {
    const t = e.target;
    if (t === e.currentTarget || t.closest('[data-room-close]')) return closePanel();
    if (t.closest('[data-room-create]')) return create();
    if (t.closest('[data-room-leave]')) return leave();
    if (t.closest('[data-room-start]')) return start();
    const inv = t.closest('[data-room-invite]');
    if (inv) { inv.disabled = true; invite(inv.dataset.roomInvite); }
  }

  function render() {
    const panel = document.getElementById('room-panel');
    if (!panel || panel.hidden) return;
    const me = user()?.username;
    if (!me) {
      panel.innerHTML = card('<p class="room-note">Sign in to play with classmates.</p>', '');
      return;
    }
    if (!room) {
      panel.innerHTML = card(`
        <p class="room-note">Make a room, invite classmates who are online, and play one Battle Royale match together. Bots fill the empty spots.</p>`,
        '<button type="button" class="room-btn primary" data-room-create>Make a room</button>');
      return;
    }
    const memberNames = new Set(room.members.map((m) => m.username));
    const invited = new Set(room.invited || []);
    const online = (window.classAppPresence?.onlineUsers?.() || []).filter((u) => !memberNames.has(u.username));
    const members = room.members.map((m) => `
      <li class="room-member">
        <span class="room-avatar">${esc((m.displayName || '?').charAt(0).toUpperCase())}</span>
        <span class="room-member-name">${esc(m.displayName)}${m.username === me ? ' <em>(you)</em>' : ''}</span>
        ${m.username === room.host ? '<span class="room-tag">Host</span>' : ''}
      </li>`).join('');
    const full = room.members.length >= room.max;
    const invites = online.length ? online.map((u) => `
      <li class="room-member">
        <span class="room-avatar ${u.status === 'away' ? 'away' : ''}">${esc((u.displayName || '?').charAt(0).toUpperCase())}</span>
        <span class="room-member-name">${esc(u.displayName)}<small>${u.status === 'away' ? 'Away' : esc(window.presenceActivityText?.(u.page) || 'Online')}</small></span>
        <button type="button" class="room-btn small" data-room-invite="${esc(u.username)}" ${invited.has(u.username) || full ? 'disabled' : ''}>${invited.has(u.username) ? 'Invited' : 'Invite'}</button>
      </li>`).join('') : '<li class="room-note">Nobody else is online right now.</li>';
    const status = room.state === 'playing'
      ? 'A match is in progress.'
      : (isHost() ? 'You are the host. Invite classmates, then start the match.' : `Waiting for ${esc(nameOf(room.host))} to start the match…`);
    const footer = `
      <button type="button" class="room-btn" data-room-leave>Leave room</button>
      ${isHost() ? `<button type="button" class="room-btn primary" data-room-start ${room.members.length < 2 || room.state !== 'lobby' ? 'disabled' : ''}>Start match (${room.members.length})</button>` : ''}`;
    panel.innerHTML = card(`
      <p class="room-note">${status}</p>
      <h3 class="room-h">In this room · ${room.members.length}/${room.max}</h3>
      <ul class="room-list">${members}</ul>
      <h3 class="room-h">Invite classmates online</h3>
      <ul class="room-list">${invites}</ul>`, footer);
  }

  function card(body, footer) {
    return `<div class="room-card">
      <div class="room-head"><strong>👥 Battle Royale room</strong>
        <button type="button" class="room-close" data-room-close aria-label="Close">&times;</button></div>
      <div class="room-body">${body}</div>
      ${footer ? `<div class="room-foot">${footer}</div>` : ''}
    </div>`;
  }

  window.addEventListener('classapp:presence', () => { ensureSocket(); render(); });

  window.classAppRooms = {
    open: openPanel, invite, join, leave, start,
    takeMatch, send, drain, gameClosed, backToRoom,
    get room() { return room; },
  };
})();
