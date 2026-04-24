/* ── Candy Match — match-3 game module ───────────────────────────────── */
window.candyModule = (() => {
  'use strict';

  const ROWS = 8, COLS = 8, TYPES = 8, MAX_MOVES = 30;

  // ── State ─────────────────────────────────────────────────────────────
  let board     = [];          // flat[64], 0-7 (-1 = empty)
  let score     = 0;
  let moves     = MAX_MOVES;
  let selected  = null;        // {r,c} or null
  let busy      = false;       // blocks input during animations
  let active    = false;       // true while page is open
  let gameSaved = false;       // prevent double-save per session

  // ── Helpers ───────────────────────────────────────────────────────────
  const idx   = (r, c) => r * COLS + c;
  const rand  = ()     => Math.floor(Math.random() * TYPES);
  const delay = ms     => new Promise(res => setTimeout(res, ms));
  const $id   = id     => document.getElementById(id);

  // ── Board generation — no initial matches ─────────────────────────────
  function generateBoard() {
    const b = Array(ROWS * COLS).fill(0).map(rand);
    let changed = true, guard = 0;
    while (changed && guard++ < 200) {
      changed = false;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const t = b[idx(r, c)];
          if (c >= 2 && b[idx(r,c-1)] === t && b[idx(r,c-2)] === t) {
            b[idx(r,c)] = (t + 1 + Math.floor(Math.random() * (TYPES - 1))) % TYPES;
            changed = true;
          }
          if (r >= 2 && b[idx(r-1,c)] === t && b[idx(r-2,c)] === t) {
            b[idx(r,c)] = (t + 1 + Math.floor(Math.random() * (TYPES - 1))) % TYPES;
            changed = true;
          }
        }
      }
    }
    return b;
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

  function fillNewGems(b) {
    const newSet = new Set();
    for (let i = 0; i < b.length; i++) {
      if (b[i] < 0) { b[i] = rand(); newSet.add(i); }
    }
    return newSet;
  }

  // ── DOM rendering ─────────────────────────────────────────────────────
  // dropSet: Set of flat indices that should play drop animation
  function render(dropSet) {
    const boardEl = $id('candy-board');
    if (!boardEl) return;
    boardEl.innerHTML = '';

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i   = idx(r, c);
        const t   = board[i];
        const isNew = dropSet ? dropSet.has(i) : false;

        const cell = document.createElement('div');
        cell.className = 'candy-cell' + (t === 1 ? ' candy-has-stick' : '');
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.addEventListener('click', () => handleClick(r, c));

        const gem = document.createElement('div');
        gem.className = 'candy-gem t' + t + (isNew ? ' anim-drop' : '');
        cell.appendChild(gem);

        // Lollipop stick for type 1
        if (t === 1) {
          const stick = document.createElement('div');
          stick.className = 'candy-lolly-stick' + (isNew ? ' anim-drop' : '');
          cell.appendChild(stick);
        }

        boardEl.appendChild(cell);
      }
    }
    updateHUD();
  }

  // ── DOM helpers ───────────────────────────────────────────────────────
  const cellEl = (r, c) =>
    $id('candy-board')?.querySelector(`.candy-cell[data-r="${r}"][data-c="${c}"]`);
  const gemEl  = (r, c) => cellEl(r, c)?.querySelector('.candy-gem');

  function updateHUD() {
    const s = $id('candy-score'); if (s) s.textContent = score;
    const m = $id('candy-moves'); if (m) m.textContent = moves;
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
  // Visually slide two cells' gems toward each other (no data change)
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
    // Clean up before render() rebuilds
    [g1, g2].forEach(g => { if (g) { g.style.transition = ''; g.style.transform = ''; } });
  }

  // Pop-clear matched gems (with timeout fallback so we never hang)
  async function animPop(matchSet) {
    const promises = [];
    matchSet.forEach(i => {
      const r = Math.floor(i / COLS), c = i % COLS;
      const cell = cellEl(r, c);
      if (!cell) return;
      // Pop the gem
      const g = cell.querySelector('.candy-gem');
      if (g) {
        g.classList.add('anim-pop');
        promises.push(new Promise(res => {
          const t = setTimeout(res, 450);
          g.addEventListener('animationend', () => { clearTimeout(t); res(); }, { once: true });
        }));
      }
      // Also pop lollipop stick if present
      const s = cell.querySelector('.candy-lolly-stick');
      if (s) s.classList.add('anim-pop');
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
    // Non-adjacent: just reselect
    if (Math.abs(sr - r) + Math.abs(sc - c) !== 1) { selectCell(r, c); return; }
    clearSelection();
    doSwap(sr, sc, r, c);
  }

  async function doSwap(r1, c1, r2, c2) {
    busy = true;
    setStatus('');
    try {
      // ① Visual forward swap
      await animSwap(r1, c1, r2, c2);

      // ② Swap board data
      const tmp = board[idx(r1, c1)];
      board[idx(r1, c1)] = board[idx(r2, c2)];
      board[idx(r2, c2)] = tmp;

      // ③ Rebuild DOM from updated data (clean state, no stale transforms)
      render();

      // ④ Check for matches
      const matches = findMatches(board);

      if (matches.size === 0) {
        // No match → visual swap back, no move deducted
        await animSwap(r1, c1, r2, c2);
        // Restore data
        const t2 = board[idx(r1, c1)];
        board[idx(r1, c1)] = board[idx(r2, c2)];
        board[idx(r2, c2)] = t2;
        render();
        // Shake both cells
        [gemEl(r1, c1), gemEl(r2, c2)].forEach(g => {
          if (!g) return;
          g.classList.add('anim-shake');
          g.addEventListener('animationend', () => g.classList.remove('anim-shake'), { once: true });
        });
        setStatus('No match — try again!');
        return; // busy reset in finally
      }

      // ⑤ Valid match — consume a move and cascade
      moves--;
      updateHUD();
      await cascade(matches);
      await maybeSaveScore();
      checkGameOver();
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

      // Pop matched gems (waits for CSS animation with timeout fallback)
      await animPop(matchSet);

      // Update data: clear matched, drop, fill
      matchSet.forEach(i => { board[i] = -1; });
      dropBoard(board);
      const newCells = fillNewGems(board);

      // Rebuild DOM — new cells play anim-drop
      render(newCells);
      await delay(430);

      // Check for auto-matches from the new state
      matchSet = findMatches(board);
    }
  }

  // ── Game over ─────────────────────────────────────────────────────────
  function checkGameOver() {
    if (moves <= 0) {
      setStatus('');
      showOverlay('Game Over 🍬', score);
    }
  }

  function showOverlay(title, finalScore) {
    const boardEl = $id('candy-board');
    if (!boardEl) return;
    document.querySelector('.candy-overlay')?.remove();
    const ov = document.createElement('div');
    ov.className = 'candy-overlay';
    ov.innerHTML = `
      <div class="candy-overlay-title">${title}</div>
      <div class="candy-overlay-score">Score: ${finalScore}</div>
      <div class="candy-overlay-btns">
        <button class="candy-restart-btn" id="candy-ov-restart">↺ Play Again</button>
        <button class="candy-restart-btn candy-lb-btn"  id="candy-ov-lb">🏆 Scores</button>
      </div>`;
    boardEl.style.position = 'relative';
    boardEl.appendChild(ov);
    $id('candy-ov-restart')?.addEventListener('click', restart);
    $id('candy-ov-lb')?.addEventListener('click', openLeaderboard);
  }

  // ── Leaderboard ───────────────────────────────────────────────────────
  async function maybeSaveScore() {
    if (!score || gameSaved) return;
    if (typeof currentUser === 'undefined' || !currentUser) return;
    if (typeof sb === 'undefined' || !sb) return;
    try {
      const movesUsed = MAX_MOVES - moves;
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
    } catch (_) { /* silently ignore if table not yet created */ }
  }

  async function openLeaderboard() {
    const esc = typeof escapeHTML === 'function' ? escapeHTML : s => String(s ?? '');
    if (typeof removeDynamicModal === 'function') removeDynamicModal('candy-lb-modal');

    document.body.insertAdjacentHTML('beforeend', `
      <div id="candy-lb-modal" class="custom-modal-overlay blur-bg high-z" style="display:flex;">
        <div class="custom-modal" style="max-width:400px;width:92vw;">
          <button class="modal-close-btn" onclick="(typeof removeDynamicModal==='function'?removeDynamicModal:d=>document.getElementById(d)?.remove())('candy-lb-modal')">&times;</button>
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

  // Expose so the trophy button in HTML can call it
  window.openCandyLeaderboard = openLeaderboard;

  // ── Public API ────────────────────────────────────────────────────────
  function init() {
    active = true;
    restart();
  }

  function restart() {
    // Save current game before wiping state
    if (score > 0 && !gameSaved) maybeSaveScore().catch(() => {});
    board     = generateBoard();
    score     = 0;
    moves     = MAX_MOVES;
    busy      = false;
    selected  = null;
    gameSaved = false;
    setStatus('');
    document.querySelector('.candy-overlay')?.remove();
    render();
  }

  function destroy() {
    active   = false;
    busy     = false;
    selected = null;
  }

  return { init, destroy, restart };
})();
