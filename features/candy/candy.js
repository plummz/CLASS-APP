/* ── Candy Match — match-3 game module ───────────────────────────────── */
window.candyModule = (() => {
  'use strict';

  const ROWS = 8, COLS = 8, MAX_LEVEL = 1500;

  // ── Level generator ────────────────────────────────────────────────────
  function genLevel(n) {
    const t = (n - 1) / (MAX_LEVEL - 1);
    return {
      n,
      target:   Math.round(200 + t * t * 35000 + t * 5000),
      moves:    Math.max(10, Math.round(30 - t * 20 + Math.sin(n * 0.1) * 1.5)),
      types:    Math.min(8, 3 + Math.floor(t * 5.5)),
      blockers: Math.min(14, Math.floor(t * 16)),
    };
  }

  // ── State ─────────────────────────────────────────────────────────────
  let board        = [];
  let score        = 0;
  let moves        = 0;
  let selected     = null;
  let busy         = false;
  let active       = false;
  let gameSaved    = false;
  let currentLevel = 1;
  let highestUnlocked = 1;
  let levelCfg     = genLevel(1);
  let blockerSet   = new Set();
  let coins        = 0;

  // ── Helpers ───────────────────────────────────────────────────────────
  const idx   = (r, c) => r * COLS + c;
  const rand  = n      => Math.floor(Math.random() * n);
  const delay = ms     => new Promise(res => setTimeout(res, ms));
  const $id   = id     => document.getElementById(id);

  // ── Board generation — no initial matches ─────────────────────────────
  function generateBoard(types) {
    const b = Array(ROWS * COLS).fill(0).map(() => rand(types));
    let changed = true, guard = 0;
    while (changed && guard++ < 200) {
      changed = false;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const t = b[idx(r, c)];
          if (c >= 2 && b[idx(r,c-1)] === t && b[idx(r,c-2)] === t) {
            b[idx(r,c)] = (t + 1 + rand(types - 1)) % types;
            changed = true;
          }
          if (r >= 2 && b[idx(r-1,c)] === t && b[idx(r-2,c)] === t) {
            b[idx(r,c)] = (t + 1 + rand(types - 1)) % types;
            changed = true;
          }
        }
      }
    }
    return b;
  }

  // ── Blocker helpers ───────────────────────────────────────────────────
  function placeBlockers(count) {
    const pos = Array.from({ length: ROWS * COLS }, (_, i) => i);
    for (let i = pos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pos[i], pos[j]] = [pos[j], pos[i]];
    }
    return new Set(pos.slice(0, count));
  }

  function clearMatchedBlockers(matchSet) {
    matchSet.forEach(i => blockerSet.delete(i));
  }

  // ── Match finding ─────────────────────────────────────────────────────
  function findMatches(b) {
    const matched = new Set();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 3; c++) {
        const t = b[idx(r, c)]; if (t < 0) continue;
        if (b[idx(r,c+1)] === t && b[idx(r,c+2)] === t) {
          let e = c + 3;
          while (e < COLS && b[idx(r,e)] === t) e++;
          for (let x = c; x < e; x++) matched.add(idx(r, x));
        }
      }
    }
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r <= ROWS - 3; r++) {
        const t = b[idx(r, c)]; if (t < 0) continue;
        if (b[idx(r+1,c)] === t && b[idx(r+2,c)] === t) {
          let e = r + 3;
          while (e < ROWS && b[idx(e,c)] === t) e++;
          for (let x = r; x < e; x++) matched.add(idx(x, c));
        }
      }
    }
    return matched;
  }

  // ── Gravity ───────────────────────────────────────────────────────────
  function dropBoard(b) {
    for (let c = 0; c < COLS; c++) {
      let write = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (b[idx(r,c)] >= 0) { b[idx(write,c)] = b[idx(r,c)]; write--; }
      }
      while (write >= 0) { b[idx(write,c)] = -1; write--; }
    }
  }

  function fillNewGems(b, types) {
    const newSet = new Set();
    for (let i = 0; i < b.length; i++) {
      if (b[i] < 0) { b[i] = rand(types); newSet.add(i); }
    }
    return newSet;
  }

  // ── DOM rendering ─────────────────────────────────────────────────────
  function render(dropSet) {
    const boardEl = $id('candy-board');
    if (!boardEl) return;
    boardEl.innerHTML = '';

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i     = idx(r, c);
        const t     = board[i];
        const isNew = dropSet ? dropSet.has(i) : false;

        const cell = document.createElement('div');
        cell.className = 'candy-cell' + (t === 1 ? ' candy-has-stick' : '');
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.addEventListener('click', () => handleClick(r, c));

        const gem = document.createElement('div');
        gem.className = 'candy-gem t' + t + (isNew ? ' anim-drop' : '');
        cell.appendChild(gem);

        if (t === 1) {
          const stick = document.createElement('div');
          stick.className = 'candy-lolly-stick' + (isNew ? ' anim-drop' : '');
          cell.appendChild(stick);
        }

        if (blockerSet.has(i)) {
          const blocker = document.createElement('div');
          blocker.className = 'candy-blocker';
          cell.appendChild(blocker);
        }

        boardEl.appendChild(cell);
      }
    }
    updateHUD();
  }

  // ── DOM helpers ───────────────────────────────────────────────────────
  const cellEl = (r, c) =>
    $id('candy-board')?.querySelector(`.candy-cell[data-r="${r}"][data-c="${c}"]`);
  const gemEl = (r, c) => cellEl(r, c)?.querySelector('.candy-gem');

  function updateHUD() {
    const s = $id('candy-score');       if (s)  s.textContent  = score.toLocaleString();
    const m = $id('candy-moves');       if (m)  m.textContent  = moves;
    const ln = $id('candy-level-num');  if (ln) ln.textContent = currentLevel;
    const tg = $id('candy-target');     if (tg) tg.textContent = levelCfg.target.toLocaleString();
    const bl = $id('candy-blockers');   if (bl) bl.textContent = blockerSet.size;
    const blPill = $id('candy-blockers-pill');
    if (blPill) blPill.style.display = levelCfg.blockers > 0 ? '' : 'none';
    updateScoreBar();
  }

  function updateScoreBar() {
    const bar = $id('candy-score-bar-fill');
    if (!bar) return;
    const pct = Math.min(100, Math.round((score / levelCfg.target) * 100));
    bar.style.width = pct + '%';
    bar.style.background = pct >= 100
      ? 'linear-gradient(90deg,#66ff88,#00cc44)'
      : 'linear-gradient(90deg,#ff6b9d,#c44dff)';
  }

  function setStatus(msg) {
    const el = $id('candy-status'); if (el) el.textContent = msg;
  }

  // ── Selection ─────────────────────────────────────────────────────────
  function selectCell(r, c) {
    clearSelection();
    selected = { r, c };
    cellEl(r, c)?.classList.add('selected');
  }
  function clearSelection() {
    if (selected) cellEl(selected.r, selected.c)?.classList.remove('selected');
    selected = null;
  }

  // ── Animations ────────────────────────────────────────────────────────
  async function animSwap(r1, c1, r2, c2) {
    const el1 = cellEl(r1, c1), el2 = cellEl(r2, c2);
    if (!el1 || !el2) return;
    const rect1 = el1.getBoundingClientRect(), rect2 = el2.getBoundingClientRect();
    const dx = rect2.left - rect1.left, dy = rect2.top - rect1.top;
    const g1 = el1.querySelector('.candy-gem'), g2 = el2.querySelector('.candy-gem');
    [g1, g2].forEach(g => { if (g) g.style.transition = 'transform .17s ease-in-out'; });
    if (g1) g1.style.transform = `translate(${dx}px,${dy}px)`;
    if (g2) g2.style.transform = `translate(${-dx}px,${-dy}px)`;
    await delay(190);
    [g1, g2].forEach(g => { if (g) { g.style.transition = ''; g.style.transform = ''; } });
  }

  async function animPop(matchSet) {
    const promises = [];
    matchSet.forEach(i => {
      const r = Math.floor(i / COLS), c = i % COLS;
      const cell = cellEl(r, c);
      if (!cell) return;

      const g = cell.querySelector('.candy-gem');
      if (g) {
        g.classList.add('anim-pop');
        promises.push(new Promise(res => {
          const t = setTimeout(res, 450);
          g.addEventListener('animationend', () => { clearTimeout(t); res(); }, { once: true });
        }));
      }
      const s = cell.querySelector('.candy-lolly-stick');
      if (s) s.classList.add('anim-pop');

      // Pop blocker overlay if present (data cleared after this by clearMatchedBlockers)
      const bl = cell.querySelector('.candy-blocker');
      if (bl) bl.classList.add('anim-blocker-pop');
    });
    await Promise.all(promises);
  }

  // ── Chain / combo system ──────────────────────────────────────────────
  const CHAIN_LABELS = [
    '', '', '',
    '🍬 Sweet Combo!',
    '💥 Mega Combo!',
    '✨ Sparkle Burst!',
    '🌈 Chain ×2!',
    '💣 Explosion!',
    '🌈 Rainbow Burst!',
    '💥 Screen Shake!',
    '🍭 CANDY FRENZY!',
  ];

  function chainMultiplier(n) {
    if (n >= 6) return 2;
    if (n >= 4) return 1.5;
    if (n >= 3) return 1.2;
    return 1;
  }

  function triggerChainFX(n) {
    if (n < 3) return;
    setStatus(CHAIN_LABELS[Math.min(n, CHAIN_LABELS.length - 1)] || `🎉 Chain ×${n}!`);
    const boardEl = $id('candy-board');
    if (!boardEl) return;
    const cls = ['candy-fx-glow'];
    if (n >= 9) cls.push('candy-fx-shake');
    if (n >= 8) cls.push('candy-fx-rainbow');
    if (n >= 5) cls.push('candy-fx-sparkle');
    if (n >= 4) cls.push('candy-fx-pulse');
    boardEl.classList.add(...cls);
    setTimeout(() => boardEl.classList.remove(...cls), 700);
  }

  // ── Core interaction ──────────────────────────────────────────────────
  function handleClick(r, c) {
    if (!active || busy || moves <= 0) return;
    if (!selected) { selectCell(r, c); return; }
    const { r: sr, c: sc } = selected;
    if (sr === r && sc === c) { clearSelection(); return; }
    if (Math.abs(sr - r) + Math.abs(sc - c) !== 1) { selectCell(r, c); return; }
    clearSelection();
    doSwap(sr, sc, r, c);
  }

  async function doSwap(r1, c1, r2, c2) {
    busy = true;
    setStatus('');
    try {
      await animSwap(r1, c1, r2, c2);

      const tmp = board[idx(r1, c1)];
      board[idx(r1, c1)] = board[idx(r2, c2)];
      board[idx(r2, c2)] = tmp;
      render();

      const matches = findMatches(board);

      if (matches.size === 0) {
        await animSwap(r1, c1, r2, c2);
        const t2 = board[idx(r1, c1)];
        board[idx(r1, c1)] = board[idx(r2, c2)];
        board[idx(r2, c2)] = t2;
        render();
        [gemEl(r1, c1), gemEl(r2, c2)].forEach(g => {
          if (!g) return;
          g.classList.add('anim-shake');
          g.addEventListener('animationend', () => g.classList.remove('anim-shake'), { once: true });
        });
        setStatus('No match — try again!');
        return;
      }

      moves--;
      updateHUD();
      await cascade(matches);
      await maybeSaveScore();
      if (!checkLevelComplete()) checkGameOver();
    } finally {
      busy = false;
    }
  }

  // ── Cascade resolver ──────────────────────────────────────────────────
  async function cascade(initialMatches) {
    let matchSet = initialMatches;
    let chain    = 0;

    while (matchSet.size > 0) {
      chain++;
      const mult = chainMultiplier(chain);
      score += Math.round(matchSet.size * 10 * mult);
      updateHUD();
      triggerChainFX(chain);

      await animPop(matchSet);

      // Clear data after animation so blocker divs were still visible during pop
      matchSet.forEach(i => { board[i] = -1; });
      clearMatchedBlockers(matchSet);
      dropBoard(board);
      const newCells = fillNewGems(board, levelCfg.types);

      render(newCells);
      await delay(430);

      matchSet = findMatches(board);
    }
  }

  // ── Win / lose conditions ─────────────────────────────────────────────
  function checkLevelComplete() {
    if (score >= levelCfg.target && blockerSet.size === 0) {
      const coinsEarned = Math.round(score / 50) + levelCfg.n;
      coins += coinsEarned;
      if (currentLevel >= highestUnlocked && currentLevel < MAX_LEVEL) {
        highestUnlocked = currentLevel + 1;
      }
      saveProgress().catch(() => {});
      setStatus('');
      showLevelComplete(coinsEarned);
      return true;
    }
    if (score >= levelCfg.target && blockerSet.size > 0) {
      setStatus(`Clear ${blockerSet.size} more block${blockerSet.size > 1 ? 's' : ''}!`);
    }
    return false;
  }

  function checkGameOver() {
    if (moves <= 0) {
      setStatus('');
      showOverlay('Out of Moves 🍬', score);
    }
  }

  function showLevelComplete(coinsEarned) {
    const boardEl = $id('candy-board'); if (!boardEl) return;
    document.querySelector('.candy-overlay')?.remove();
    const ov = document.createElement('div');
    ov.className = 'candy-overlay candy-lc-overlay';
    ov.innerHTML = `
      <div class="candy-overlay-title">Level ${currentLevel} Clear! 🍭</div>
      <div class="candy-overlay-score">Score: ${score.toLocaleString()} · +${coinsEarned} 🪙</div>
      <div class="candy-overlay-btns">
        <button class="candy-restart-btn" id="candy-ov-next" ${currentLevel >= MAX_LEVEL ? 'disabled' : ''}>
          ${currentLevel >= MAX_LEVEL ? '🏆 Max!' : 'Next →'}
        </button>
        <button class="candy-restart-btn" id="candy-ov-map">🗺️ Levels</button>
      </div>`;
    boardEl.style.position = 'relative';
    boardEl.appendChild(ov);
    $id('candy-ov-next')?.addEventListener('click', () => {
      if (currentLevel < MAX_LEVEL) startLevel(currentLevel + 1);
    });
    $id('candy-ov-map')?.addEventListener('click', openLevelSelect);
  }

  function showOverlay(title, finalScore) {
    const boardEl = $id('candy-board'); if (!boardEl) return;
    document.querySelector('.candy-overlay')?.remove();
    const ov = document.createElement('div');
    ov.className = 'candy-overlay';
    ov.innerHTML = `
      <div class="candy-overlay-title">${title}</div>
      <div class="candy-overlay-score">Score: ${finalScore.toLocaleString()} · Level ${currentLevel}</div>
      <div class="candy-overlay-btns">
        <button class="candy-restart-btn" id="candy-ov-restart">↺ Retry</button>
        <button class="candy-restart-btn candy-lb-btn" id="candy-ov-lb">🏆 Scores</button>
      </div>`;
    boardEl.style.position = 'relative';
    boardEl.appendChild(ov);
    $id('candy-ov-restart')?.addEventListener('click', restart);
    $id('candy-ov-lb')?.addEventListener('click', openLeaderboard);
  }

  // ── Level start ───────────────────────────────────────────────────────
  function startLevel(n) {
    if (n > highestUnlocked) return;
    if (typeof removeDynamicModal === 'function') {
      removeDynamicModal('candy-level-modal');
    }
    currentLevel  = n;
    levelCfg      = genLevel(n);
    board         = generateBoard(levelCfg.types);
    score         = 0;
    moves         = levelCfg.moves;
    busy          = false;
    selected      = null;
    gameSaved     = false;
    blockerSet    = placeBlockers(levelCfg.blockers);
    setStatus('');
    document.querySelector('.candy-overlay')?.remove();
    render();
  }

  // ── Level select modal ────────────────────────────────────────────────
  const PAGE_SIZE   = 50;
  const TOTAL_PAGES = Math.ceil(MAX_LEVEL / PAGE_SIZE);

  function openLevelSelectPage(p) {
    p = Math.max(0, Math.min(TOTAL_PAGES - 1, p));
    if (typeof removeDynamicModal === 'function') removeDynamicModal('candy-level-modal');

    const start = p * PAGE_SIZE + 1;
    const end   = Math.min(MAX_LEVEL, (p + 1) * PAGE_SIZE);

    let cells = '';
    for (let n = start; n <= end; n++) {
      const unlocked  = n <= highestUnlocked;
      const isCurrent = n === currentLevel;
      const cfg       = genLevel(n);
      const title     = `Level ${n}&#10;Target: ${cfg.target.toLocaleString()}&#10;Moves: ${cfg.moves}&#10;Types: ${cfg.types}${cfg.blockers ? '&#10;Blocks: ' + cfg.blockers : ''}`;
      cells += `<button
        class="candy-level-btn ${unlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''}"
        ${unlocked ? `onclick="window.candyModule._startLevel(${n})"` : ''}
        title="${title}">
        <span class="clb-num">${n}</span>
        ${unlocked ? '' : '🔒'}
      </button>`;
    }

    document.body.insertAdjacentHTML('beforeend', `
      <div id="candy-level-modal" class="custom-modal-overlay blur-bg high-z" style="display:flex;">
        <div class="custom-modal candy-level-modal-body" style="max-width:480px;width:95vw;">
          <button class="modal-close-btn"
            onclick="(typeof removeDynamicModal==='function'?removeDynamicModal:d=>document.getElementById(d)?.remove())('candy-level-modal')">&times;</button>
          <div class="modal-title">🗺️ Level Select</div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin:10px 0 8px;gap:8px;">
            <button class="candy-modal-nav-btn"
              ${p === 0 ? 'disabled' : ''}
              onclick="window.candyModule._levelPage(${p - 1})">‹ Prev</button>
            <span style="font-size:12px;opacity:.55">
              Lvl ${start}–${end} / ${MAX_LEVEL} · Unlocked: ${highestUnlocked}
            </span>
            <button class="candy-modal-nav-btn"
              ${p >= TOTAL_PAGES - 1 ? 'disabled' : ''}
              onclick="window.candyModule._levelPage(${p + 1})">Next ›</button>
          </div>
          <div class="candy-level-grid">${cells}</div>
        </div>
      </div>`);
  }

  function openLevelSelect() {
    openLevelSelectPage(Math.floor((currentLevel - 1) / PAGE_SIZE));
  }

  // ── Progress save / load ──────────────────────────────────────────────
  async function loadProgress() {
    if (typeof sb === 'undefined' || !sb) return;
    if (typeof currentUser === 'undefined' || !currentUser) return;
    try {
      const { data } = await sb
        .from('candy_progress')
        .select('highest_level, coins')
        .eq('username', currentUser.username)
        .maybeSingle();
      if (data) {
        highestUnlocked = Math.max(1, data.highest_level || 1);
        coins           = data.coins || 0;
        // Clamp currentLevel to what's unlocked
        if (currentLevel > highestUnlocked) currentLevel = highestUnlocked;
      }
    } catch (_) {}
  }

  async function saveProgress() {
    if (typeof sb === 'undefined' || !sb) return;
    if (typeof currentUser === 'undefined' || !currentUser) return;
    try {
      const u = currentUser.username;
      const { data: ex } = await sb
        .from('candy_progress')
        .select('id')
        .eq('username', u)
        .maybeSingle();
      if (ex) {
        await sb.from('candy_progress')
          .update({ highest_level: highestUnlocked, coins, updated_at: new Date().toISOString() })
          .eq('id', ex.id);
      } else {
        await sb.from('candy_progress')
          .insert([{ username: u, highest_level: highestUnlocked, coins }]);
      }
    } catch (_) {}
  }

  // ── Leaderboard ───────────────────────────────────────────────────────
  async function maybeSaveScore() {
    if (!score || gameSaved) return;
    if (typeof currentUser === 'undefined' || !currentUser) return;
    if (typeof sb === 'undefined' || !sb) return;
    try {
      const movesUsed = levelCfg.moves - moves;
      const { data: existing } = await sb
        .from('candy_scores')
        .select('id,score,moves_used')
        .eq('username', currentUser.username)
        .maybeSingle();

      if (existing) {
        const better = score > existing.score ||
          (score === existing.score && movesUsed < existing.moves_used);
        if (better) {
          await sb.from('candy_scores')
            .update({ score, moves_used: movesUsed, achieved_at: new Date().toISOString() })
            .eq('id', existing.id);
        }
      } else {
        await sb.from('candy_scores').insert([{
          username:     currentUser.username,
          display_name: currentUser.display_name || currentUser.username,
          avatar:       currentUser.avatar || null,
          score,
          moves_used:   movesUsed,
          achieved_at:  new Date().toISOString(),
        }]);
      }
      gameSaved = true;
    } catch (_) {}
  }

  async function openLeaderboard() {
    const esc = typeof escapeHTML === 'function' ? escapeHTML : s => String(s ?? '');
    if (typeof removeDynamicModal === 'function') removeDynamicModal('candy-lb-modal');

    document.body.insertAdjacentHTML('beforeend', `
      <div id="candy-lb-modal" class="custom-modal-overlay blur-bg high-z" style="display:flex;">
        <div class="custom-modal" style="max-width:400px;width:92vw;">
          <button class="modal-close-btn"
            onclick="(typeof removeDynamicModal==='function'?removeDynamicModal:d=>document.getElementById(d)?.remove())('candy-lb-modal')">&times;</button>
          <div class="modal-title">🏆 Candy Match — Top Scores</div>
          <div id="candy-lb-rows" style="margin-top:14px;display:flex;flex-direction:column;gap:6px;">
            <div style="opacity:.5;font-size:13px;text-align:center;padding:14px;">Loading…</div>
          </div>
        </div>
      </div>`);

    const rowsEl = $id('candy-lb-rows');
    if (!rowsEl) return;

    if (typeof sb === 'undefined' || !sb) {
      rowsEl.innerHTML = '<div style="opacity:.5;font-size:13px;text-align:center;padding:14px;">Leaderboard unavailable offline.</div>';
      return;
    }

    const { data, error } = await sb
      .from('candy_scores')
      .select('username,display_name,avatar,score,moves_used,achieved_at')
      .order('score',       { ascending: false })
      .order('moves_used',  { ascending: true })
      .order('achieved_at', { ascending: true })
      .limit(20);

    if (error || !data || !data.length) {
      rowsEl.innerHTML = '<div style="opacity:.5;font-size:13px;text-align:center;padding:14px;">' +
        (data && !data.length ? 'No scores yet — be the first!' : 'Leaderboard unavailable.') +
        '</div>';
      return;
    }

    const me = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.username : null;
    rowsEl.innerHTML = data.map((row, i) => {
      const rank   = i + 1;
      const medal  = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
      const name   = esc(row.display_name || row.username);
      const date   = row.achieved_at ? new Date(row.achieved_at).toLocaleDateString() : '';
      const isMe   = row.username === me;
      const avatar = row.avatar
        ? `<img src="${esc(row.avatar)}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.style.display='none'">`
        : `<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#ff6b9d,#c44dff);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">${esc((row.display_name||row.username||'?')[0].toUpperCase())}</div>`;
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;
                  background:${isMe ? 'rgba(255,107,157,.14)' : 'rgba(255,255,255,.04)'};
                  border:1px solid ${isMe ? 'rgba(255,107,157,.4)' : 'rgba(255,255,255,.08)'}">
        <span style="font-size:16px;min-width:24px;text-align:center">${medal}</span>
        ${avatar}
        <div style="flex:1;min-width:0;overflow:hidden">
          <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div>
          <div style="font-size:11px;opacity:.45">${row.moves_used} moves · ${date}</div>
        </div>
        <div style="font-size:17px;font-weight:900;color:#ffdd00;flex-shrink:0">${row.score}</div>
      </div>`;
    }).join('');
  }

  window.openCandyLeaderboard = openLeaderboard;

  // ── Public API ────────────────────────────────────────────────────────
  function init() {
    active = true;
    loadProgress()
      .then(() => startLevel(currentLevel))
      .catch(() => startLevel(currentLevel));
  }

  function restart() {
    if (score > 0 && !gameSaved) maybeSaveScore().catch(() => {});
    startLevel(currentLevel);
  }

  function destroy() {
    active   = false;
    busy     = false;
    selected = null;
  }

  return {
    init, destroy, restart,
    openLevelSelect,
    _startLevel: startLevel,
    _levelPage:  openLevelSelectPage,
  };
})();
