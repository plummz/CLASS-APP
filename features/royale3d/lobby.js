/* Battle Royale 3D lobby: shown when the game opens (instead of dropping straight in).
 *   Play     — Solo, Duo (2) or Squad (up to 5, a room with invited classmates) and the map
 *   Shop     — weapon finishes and outfits (features/royale3d/shop.js)
 *   Profile  — level, wins, K/D, KDA, accuracy, headshots… (server: royale-stats.js)
 *   History  — the last matches
 *   Settings — the game's settings (localStorage 'rl3d_settings_v1', read by the game at start)
 * The game reports each finished match with royale3dLobby.reportMatch(). */
(function () {
  const SETTINGS = 'rl3d_settings_v1';
  const LOCAL_HISTORY = 'rl3d_history_v1';
  const PREFS = 'rl3d_lobby_v1';
  const MAPS = [
    { id: 'sentinel', name: 'Isla Sentinel', note: 'Green island, towns, a mountain and Isla Verde across the strait', bg: 'linear-gradient(135deg,#2f7a45,#7fc36b 55%,#2b77a8)' },
    { id: 'dunes', name: 'Dunas del Sol', note: 'Desert dunes, sandstone towns, oases and palms', bg: 'linear-gradient(135deg,#c98b47,#f0d29b 55%,#1f8a9a)' },
    { id: 'frost', name: 'Frostpeak', note: 'Snowfields, pine forests, cabins and falling snow', bg: 'linear-gradient(135deg,#9fb4c8,#f2f6fa 55%,#41566a)' },
  ];
  const MODES = [
    { id: 'solo', name: 'Solo', note: 'You against 29 bots' },
    { id: 'duo', name: 'Duo', note: 'You and 1 classmate vs bots', max: 2 },
    { id: 'squad', name: 'Squad', note: 'Up to 5 classmates vs bots', max: 5 },
  ];
  const SETTING_ROWS = [
    ['view', 'Third-person camera', 'toggle', 'tps'],
    ['aim_assist', 'Aim assist', 'toggle', true],
    ['auto_quality', 'Automatic quality (smoother on slow devices)', 'toggle', true],
    ['low', 'Low graphics (no shadows or grass)', 'toggle', false],
    ['sensitivity', 'Look speed', 'range', 1.0, 0.3, 2.5, 0.05],
    ['scope_sensitivity', 'Scope look speed', 'range', 0.8, 0.2, 1.5, 0.05],
    ['fov', 'Field of view', 'range', 78, 65, 95, 1],
    ['volume', 'Volume', 'range', 0.8, 0, 1, 0.05],
    ['invert', 'Invert look up/down', 'toggle', false],
    ['vibration', 'Vibration', 'toggle', true],
    ['lefty', 'Left-handed controls', 'toggle', false],
    ['btn_scale', 'Button size', 'range', 1.0, 0.7, 1.5, 0.05],
    ['btn_opacity', 'Button opacity', 'range', 0.85, 0.3, 1.0, 0.05],
    ['show_fps', 'Show FPS', 'toggle', false],
  ];

  let tab = 'play';
  let profile = null;
  let profileLoading = false;
  const read = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch (_) { return f; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
  const esc = (v) => (typeof escapeHTML === 'function' ? escapeHTML(v) : String(v ?? ''));
  const user = () => (typeof currentUser !== 'undefined' ? currentUser : null);
  const coins = () => { try { return parseInt(localStorage.getItem('rl_coins_v1') || '0', 10) || 0; } catch (_) { return 0; } };
  const prefs = () => ({ mode: 'solo', map: 'sentinel', ...read(PREFS, {}) });
  const headers = () => (typeof getAuthHeaders === 'function' ? getAuthHeaders({ 'Content-Type': 'application/json' }) : { 'Content-Type': 'application/json' });

  function el(id) { return document.getElementById(id); }

  function show() {
    const stage = el('royale3d-stage');
    if (!stage) return;
    let lobby = el('rl3d-lobby');
    if (!lobby) {
      lobby = document.createElement('div');
      lobby.id = 'rl3d-lobby';
      lobby.className = 'rl3d-lobby';
      lobby.addEventListener('click', onClick);
      lobby.addEventListener('input', onInput);
      stage.appendChild(lobby);
    }
    lobby.hidden = false;
    render();
    loadProfile();
  }

  function hide() {
    const lobby = el('rl3d-lobby');
    if (lobby) lobby.hidden = true;
  }

  async function loadProfile() {
    const me = user()?.username;
    if (!me || profileLoading) return;
    profileLoading = true;
    try {
      const res = await fetch(`/api/royale/profile/${encodeURIComponent(me)}`, { headers: headers() });
      if (res.ok) profile = await res.json();
    } catch (_) {}
    profileLoading = false;
    render();
  }

  function fmtTime(s) { const m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${s % 60}s`; }
  function mapName(id) { return MAPS.find((m) => m.id === id)?.name || id; }

  function render() {
    const lobby = el('rl3d-lobby');
    if (!lobby || lobby.hidden) return;
    const u = user();
    const st = profile?.stats;
    const name = u?.display_name || u?.username || 'Guest';
    const level = st?.level || 1;
    const pct = st ? Math.round((st.into / Math.max(1, st.need)) * 100) : 0;
    lobby.innerHTML = `
      <div class="lb-top">
        <div class="lb-me"><span class="lb-avatar">${esc(name.charAt(0).toUpperCase())}</span>
          <div><strong>${esc(name)}</strong><div class="lb-level">Level ${level}<span class="lb-xp"><i style="width:${pct}%"></i></span></div></div></div>
        <span class="lb-coins">🪙 ${coins()}</span>
      </div>
      <nav class="lb-tabs" role="tablist">
        ${[['play', '🎮 Play'], ['shop', '🛒 Shop'], ['profile', '📊 Profile'], ['history', '🕘 History'], ['settings', '⚙️ Settings']]
          .map(([id, label]) => `<button type="button" role="tab" class="${tab === id ? 'on' : ''}" data-tab="${id}">${label}</button>`).join('')}
      </nav>
      <section class="lb-body">${body()}</section>`;
  }

  function body() {
    if (tab === 'play') {
      const p = prefs();
      return `
        <h3>Mode</h3>
        <div class="lb-modes">${MODES.map((m) => `<button type="button" class="lb-mode ${p.mode === m.id ? 'on' : ''}" data-mode="${m.id}"><strong>${m.name}</strong><small>${m.note}</small></button>`).join('')}</div>
        <h3>Map</h3>
        <div class="lb-maps">${MAPS.map((m) => `<button type="button" class="lb-map ${p.map === m.id ? 'on' : ''}" data-map="${m.id}"><span class="lb-map-art" style="background:${m.bg}"></span><strong>${m.name}</strong><small>${m.note}</small></button>`).join('')}</div>
        <button type="button" class="lb-play" data-play>${p.mode === 'solo' ? '▶ PLAY' : `👥 CREATE ${p.mode.toUpperCase()} ROOM`}</button>
        ${p.mode !== 'solo' ? '<p class="lb-note">Invite classmates who are online, then the host starts. Room members fight as one team against the bots.</p>' : ''}`;
    }
    if (tab === 'shop') {
      return `<p class="lb-note">Weapon finishes (with Lv 2–3 upgrades) and outfits, bought with match coins.</p>
        <button type="button" class="lb-play" data-open-shop>🛒 Open the shop</button>`;
    }
    if (tab === 'profile') {
      if (!user()) return '<p class="lb-note">Sign in to keep a profile.</p>';
      const s = profile?.stats;
      if (!s) return `<p class="lb-note">${profileLoading ? 'Loading your stats…' : 'Play a match to start your profile.'}</p>`;
      const cells = [
        ['Level', s.level], ['Matches', s.matches], ['Wins', s.wins], ['Win rate', `${s.win_rate}%`],
        ['Kills', s.kills], ['Deaths', s.deaths], ['Assists', s.assists], ['K/D', s.kd],
        ['KDA', s.kda], ['Top 5', s.top5], ['Best place', s.best_place ? `#${s.best_place}` : '–'], ['Avg place', s.avg_place || '–'],
        ['Damage', s.damage], ['Avg damage', s.avg_damage], ['Headshots', `${s.headshots} (${s.headshot_rate}%)`], ['Accuracy', `${s.accuracy}%`],
        ['Longest kill', `${Math.round(s.longest_kill)} m`], ['Time played', fmtTime(s.survived_s)], ['Favourite gun', s.favorite_weapon || '–'], ['Coins earned', s.coins],
      ];
      return `<div class="lb-stats">${cells.map(([k, v]) => `<div class="lb-stat"><small>${k}</small><strong>${esc(v)}</strong></div>`).join('')}</div>`;
    }
    if (tab === 'history') {
      const rows = profile?.history?.length ? profile.history : read(LOCAL_HISTORY, []);
      if (!rows.length) return '<p class="lb-note">No matches yet.</p>';
      return `<ul class="lb-history">${rows.map((r) => `
        <li class="${r.won ? 'won' : ''}">
          <span class="lb-place">${r.won ? '🏆' : `#${r.place}`}</span>
          <span class="lb-hmain"><strong>${esc(mapName(r.map))} · ${esc(String(r.mode).toUpperCase())}</strong>
            <small>${new Date(r.created_at || Date.now()).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · survived ${fmtTime(r.survived_s || 0)}</small></span>
          <span class="lb-hstats"><b>${r.kills}</b> kills · ${r.assists || 0} assists · ${r.damage} dmg</span>
        </li>`).join('')}</ul>`;
    }
    // settings
    const s = read(SETTINGS, {});
    return `<div class="lb-settings">${SETTING_ROWS.map(([key, label, type, def, lo, hi, step]) => {
      const v = s[key] ?? def;
      if (type === 'toggle') {
        const on = key === 'view' ? v === 'tps' : Boolean(v);
        return `<label class="lb-row"><span>${label}</span><input type="checkbox" data-setting="${key}" ${on ? 'checked' : ''}></label>`;
      }
      return `<label class="lb-row"><span>${label} <b>${Number(v).toFixed(step < 1 ? 2 : 0)}</b></span><input type="range" data-setting="${key}" min="${lo}" max="${hi}" step="${step}" value="${v}"></label>`;
    }).join('')}<p class="lb-note">Saved on this device and used from your next match. Buttons can be moved in-game from Pause → Settings.</p></div>`;
  }

  function onInput(e) {
    const key = e.target.dataset?.setting;
    if (!key) return;
    const s = read(SETTINGS, {});
    if (e.target.type === 'checkbox') s[key] = key === 'view' ? (e.target.checked ? 'tps' : 'fps') : e.target.checked;
    else s[key] = Number(e.target.value);
    write(SETTINGS, s);
    if (e.target.type === 'range') {
      const b = e.target.parentElement.querySelector('b');
      if (b) b.textContent = Number(e.target.value).toFixed(Number(e.target.step) < 1 ? 2 : 0);
    }
  }

  function onClick(e) {
    const t = e.target;
    const tabBtn = t.closest('[data-tab]');
    if (tabBtn) { tab = tabBtn.dataset.tab; if (tab === 'profile' || tab === 'history') loadProfile(); return render(); }
    const mode = t.closest('[data-mode]');
    if (mode) { write(PREFS, { ...prefs(), mode: mode.dataset.mode }); return render(); }
    const map = t.closest('[data-map]');
    if (map) { write(PREFS, { ...prefs(), map: map.dataset.map }); return render(); }
    if (t.closest('[data-open-shop]')) { window.royale3dShop?.open(); return; }
    if (t.closest('[data-play]')) play();
  }

  function play() {
    const p = prefs();
    if (p.mode === 'solo') {
      hide();
      window.royale3dModule?.startGame({ map: p.map });
      return;
    }
    const m = MODES.find((x) => x.id === p.mode);
    window.classAppRooms?.createRoom({ mode: p.mode, max: m?.max || 5, map: p.map });
  }

  // Called by the game when a match ends
  async function reportMatch(r) {
    const local = read(LOCAL_HISTORY, []);
    local.unshift({ ...r, created_at: new Date().toISOString() });
    write(LOCAL_HISTORY, local.slice(0, 30));
    if (!user()?.username) return;
    try {
      await fetch('/api/royale/match', { method: 'POST', headers: headers(), body: JSON.stringify(r) });
    } catch (_) {}
    profile = null;
  }

  function backToLobby() {
    window.royale3dModule?.destroy();
    show();
  }

  window.royale3dLobby = { show, hide, render, reportMatch, backToLobby };
})();
