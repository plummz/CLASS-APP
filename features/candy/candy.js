/* ── Candy Match — match-3 game module ───────────────────────────────── */
window.candyModule = (() => {
  const ROWS = 8, COLS = 8, TYPES = 6, MAX_MOVES = 30;

  let board = [];       // flat length-64, value 0-5 (-1 = empty)
  let score = 0;
  let moves = MAX_MOVES;
  let selected = null;  // {r,c}
  let busy = false;     // block input during animations
  let active = false;

  // ── Helpers ─────────────────────────────────────────────────────────
  const idx  = (r, c) => r * COLS + c;
  const rand  = ()     => Math.floor(Math.random() * TYPES);

  function generateBoard() {
    const b = Array(ROWS * COLS).fill(0).map(rand);
    // Eliminate starting matches by replacing the third+ gem
    let changed = true;
    while (changed) {
      changed = false;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const t = b[idx(r, c)];
          if (c >= 2 && b[idx(r, c-1)] === t && b[idx(r, c-2)] === t) {
            let nt = rand();
            while (nt === t) nt = rand();
            b[idx(r, c)] = nt; changed = true;
          }
          if (r >= 2 && b[idx(r-1, c)] === t && b[idx(r-2, c)] === t) {
            let nt = rand();
            while (nt === t) nt = rand();
            b[idx(r, c)] = nt; changed = true;
          }
        }
      }
    }
    return b;
  }

  // ── Match detection ──────────────────────────────────────────────────
  function findMatches(b) {
    const matched = new Set();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 2; c++) {
        const t = b[idx(r, c)];
        if (t < 0) continue;
        if (b[idx(r, c+1)] === t && b[idx(r, c+2)] === t) {
          let end = c + 3;
          while (end < COLS && b[idx(r, end)] === t) end++;
          for (let x = c; x < end; x++) matched.add(idx(r, x));
        }
      }
    }
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS - 2; r++) {
        const t = b[idx(r, c)];
        if (t < 0) continue;
        if (b[idx(r+1, c)] === t && b[idx(r+2, c)] === t) {
          let end = r + 3;
          while (end < ROWS && b[idx(end, c)] === t) end++;
          for (let x = r; x < end; x++) matched.add(idx(x, c));
        }
      }
    }
    return matched;
  }

  // ── Gravity: drop candies down, fill top with -1 ────────────────────
  function dropBoard(b) {
    for (let c = 0; c < COLS; c++) {
      let write = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (b[idx(r, c)] >= 0) { b[idx(write, c)] = b[idx(r, c)]; write--; }
      }
      while (write >= 0) { b[idx(write, c)] = -1; write--; }
    }
  }

  function fillBoard(b) {
    for (let i = 0; i < b.length; i++) if (b[i] < 0) b[i] = rand();
  }

  // ── DOM helpers ──────────────────────────────────────────────────────
  function cellEl(r, c) {
    return document.querySelector(`#candy-board .candy-cell[data-r="${r}"][data-c="${c}"]`);
  }
  function gemEl(r, c) {
    const cell = cellEl(r, c);
    return cell ? cell.querySelector('.candy-gem') : null;
  }
  function $id(id) { return document.getElementById(id); }

  function updateHUD() {
    const s = $id('candy-score'); if (s) s.textContent = score;
    const m = $id('candy-moves'); if (m) m.textContent = moves;
  }

  function setStatus(msg) {
    const el = $id('candy-status'); if (el) el.textContent = msg;
  }

  // ── Full render ──────────────────────────────────────────────────────
  function render() {
    const boardEl = $id('candy-board');
    if (!boardEl) return;
    boardEl.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('div');
        cell.className = 'candy-cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.addEventListener('click', () => handleClick(r, c));

        const gem = document.createElement('div');
        gem.className = `candy-gem t${board[idx(r, c)]}`;
        cell.appendChild(gem);
        boardEl.appendChild(cell);
      }
    }
    updateHUD();
  }

  // Update gem visuals without rebuilding DOM
  function refreshGem(r, c, animate) {
    const gem = gemEl(r, c);
    if (!gem) return;
    const t = board[idx(r, c)];
    gem.className = `candy-gem t${t}${animate ? ' anim-drop' : ''}`;
  }

  // ── Selection ────────────────────────────────────────────────────────
  function selectCell(r, c) {
    clearSelection();
    selected = { r, c };
    cellEl(r, c)?.classList.add('selected');
  }

  function clearSelection() {
    if (selected) cellEl(selected.r, selected.c)?.classList.remove('selected');
    selected = null;
  }

  // ── Swap helpers ─────────────────────────────────────────────────────
  function swapBoard(r1, c1, r2, c2) {
    const tmp = board[idx(r1, c1)];
    board[idx(r1, c1)] = board[idx(r2, c2)];
    board[idx(r2, c2)] = tmp;
  }

  function animateSwapDOM(r1, c1, r2, c2) {
    const cell1 = cellEl(r1, c1), cell2 = cellEl(r2, c2);
    if (!cell1 || !cell2) return;
    const rect1 = cell1.getBoundingClientRect();
    const rect2 = cell2.getBoundingClientRect();
    const dx = rect2.left - rect1.left, dy = rect2.top - rect1.top;
    const g1 = cell1.querySelector('.candy-gem');
    const g2 = cell2.querySelector('.candy-gem');
    [g1, g2].forEach(g => { if (g) g.style.transition = 'transform .18s ease-in-out'; });
    if (g1) g1.style.transform = `translate(${dx}px,${dy}px)`;
    if (g2) g2.style.transform = `translate(${-dx}px,${-dy}px)`;
    return new Promise(res => setTimeout(res, 200));
  }

  function shakeDOM(r1, c1, r2, c2) {
    [gemEl(r1, c1), gemEl(r2, c2)].forEach(g => {
      if (!g) return;
      g.style.transition = '';
      g.style.transform = '';
      g.classList.add('anim-shake');
      g.addEventListener('animationend', () => g.classList.remove('anim-shake'), { once: true });
    });
  }

  // ── Core interaction ─────────────────────────────────────────────────
  function handleClick(r, c) {
    if (!active || busy) return;
    if (moves <= 0) return;

    if (!selected) { selectCell(r, c); return; }

    const { r: sr, c: sc } = selected;
    if (sr === r && sc === c) { clearSelection(); return; }

    const adjacent = (Math.abs(sr - r) + Math.abs(sc - c)) === 1;
    if (!adjacent) { selectCell(r, c); return; }

    clearSelection();
    doSwap(sr, sc, r, c);
  }

  async function doSwap(r1, c1, r2, c2) {
    busy = true;
    setStatus('');

    await animateSwapDOM(r1, c1, r2, c2);
    swapBoard(r1, c1, r2, c2);
    // Reset inline transforms so render can take over
    [gemEl(r1, c1), gemEl(r2, c2)].forEach(g => {
      if (g) { g.style.transition = ''; g.style.transform = ''; }
    });

    const matches = findMatches(board);
    if (matches.size === 0) {
      // No match — swap back
      await animateSwapDOM(r1, c1, r2, c2);
      swapBoard(r1, c1, r2, c2);
      [gemEl(r1, c1), gemEl(r2, c2)].forEach(g => {
        if (g) { g.style.transition = ''; g.style.transform = ''; }
      });
      shakeDOM(r1, c1, r2, c2);
      setStatus('No match — try again!');
      busy = false;
      return;
    }

    moves--;
    updateHUD();
    await cascade(matches);
    busy = false;
    checkGameOver();
  }

  async function cascade(matches) {
    while (matches && matches.size > 0) {
      score += matches.size * 10;
      updateHUD();

      // Pop animation
      const popDone = [];
      matches.forEach(i => {
        const r = Math.floor(i / COLS), c = i % COLS;
        const g = gemEl(r, c);
        if (g) {
          g.classList.add('anim-pop');
          popDone.push(new Promise(res => g.addEventListener('animationend', res, { once: true })));
          board[i] = -1;
        }
      });
      await Promise.all(popDone).catch(() => {});
      await delay(60);

      dropBoard(board);
      fillBoard(board);

      // Re-render updated cells with drop animation
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          refreshGem(r, c, board[idx(r, c)] >= 0);
        }
      }

      await delay(380);
      matches = findMatches(board);
    }
  }

  function delay(ms) { return new Promise(res => setTimeout(res, ms)); }

  function checkGameOver() {
    if (moves <= 0) {
      setStatus(`Game over! Final score: ${score}`);
      showOverlay('Game Over', score);
    }
  }

  function showOverlay(title, finalScore) {
    const boardEl = $id('candy-board');
    if (!boardEl) return;
    let ov = document.createElement('div');
    ov.className = 'candy-overlay';
    ov.innerHTML = `
      <div class="candy-overlay-title">${title}</div>
      <div class="candy-overlay-score">Score: ${finalScore}</div>
      <button class="candy-restart-btn" id="candy-overlay-restart">↺ Play Again</button>`;
    boardEl.style.position = 'relative';
    boardEl.appendChild(ov);
    document.getElementById('candy-overlay-restart')?.addEventListener('click', restart);
  }

  // ── Public API ───────────────────────────────────────────────────────
  function init() {
    active = true;
    restart();
  }

  function restart() {
    board  = generateBoard();
    score  = 0;
    moves  = MAX_MOVES;
    busy   = false;
    selected = null;
    setStatus('');
    render();
    // Remove any overlay
    document.querySelector('.candy-overlay')?.remove();
  }

  function destroy() {
    active = false;
    busy   = false;
    selected = null;
  }

  return { init, destroy, restart };
})();
