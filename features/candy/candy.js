/* ── Candy Match — match-3 game module ───────────────────────────────── */
window.candyModule = (() => {
  'use strict';

  const ROWS = 8, COLS = 8, MAX_LEVEL = 1500;
  const BASE_TYPES = 5;

  // ── Level generator ────────────────────────────────────────────────────
  function genLevel(n) {
    const t = (n - 1) / (MAX_LEVEL - 1);
    return {
      n,
      target:   Math.round(200 + t * t * 35000 + t * 5000),
      moves:    Math.max(10, Math.round(30 - t * 20 + Math.sin(n * 0.1) * 1.5)),
      types:    BASE_TYPES,
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
  let coins           = 0;
  let equippedSkin    = 'default';
  let ownedSkins      = new Set(['default']);
  let equippedEffect  = 'none';
  let ownedEffects    = new Set(['none']);
  let lowEndMode      = false;

  // ── Skin data (35 skins) ──────────────────────────────────────────────
  // [id, name, rarity_idx, price, hues[8] | null]
  // hues: HSL hue values for gem types t0–t7; null = use default CSS
  const RARITY_NAMES = ['common', 'rare', 'epic', 'legendary', 'premium'];
  const SKIN_DATA = [
    // ── Common (10) ───────────────────────────────────────────────────
    ['default',  'Classic',        0,    0, null],
    ['pastel',   'Pastel Pop',     0,   60, [350,210, 58,135,285, 28,178,322]],
    ['neon',     'Neon Brights',   0,   60, [355,200, 65,145,270, 20,183,318]],
    ['earthy',   'Earthy Tones',   0,   80, [ 18, 28, 48, 95, 32, 38,110, 22]],
    ['ocean',    'Ocean Vibes',    0,   80, [195,220,188,162,242,208,177,202]],
    ['sunset',   'Sunset Glow',    0,  100, [ 12, 38, 55, 22,348, 20, 42,358]],
    ['forest',   'Forest Fresh',   0,  100, [122,162, 82,142,102,112,172, 88]],
    ['berry',    'Berry Mix',      0,  100, [322,272,352,292,312,288,332,302]],
    ['coolblue', 'Cool Blues',     0,  100, [210,220,202,198,218,208,232,226]],
    ['fire',     'Fire Squad',     0,  100, [  5, 20, 48, 15,355, 30, 52, 10]],
    // ── Rare (8) ──────────────────────────────────────────────────────
    ['galaxy',   'Galaxy Swirl',   1,  200, [262,238,278,252,298,242,272,312]],
    ['aurora',   'Aurora',         1,  200, [178,302,162,188,312,172,188,298]],
    ['rosegold', 'Rose Gold',      1,  250, [345, 25,340,358,335, 20,352,330]],
    ['stripe',   'Candy Stripe',   1,  250, [  0, 40, 80,140,200,260,300,340]],
    ['midnight', 'Midnight',       1,  300, [232,248,222,238,252,228,242,262]],
    ['tropical', 'Tropical',       1,  300, [148, 55,178,128,298, 48,198, 88]],
    ['vintage',  'Vintage',        1,  350, [ 22,198, 52,118,278, 38,172,318]],
    ['crystal',  'Crystal Clear',  1,  350, [202,218,198,208,222,212,198,218]],
    // ── Epic (8) ──────────────────────────────────────────────────────
    ['prism',    'Prism Burst',    2,  550, [  0, 45, 90,135,180,225,270,315]],
    ['lava',     'Lava Flow',      2,  600, [  5, 15, 28, 12,358, 22, 32,  8]],
    ['deepsea',  'Deep Sea',       2,  650, [202,218,192,208,222,198,212,228]],
    ['holo',     'Holographic',    2,  700, [182,222,262,302,342, 22, 62,102]],
    ['darkmatt', 'Dark Matter',    2,  750, [258,242,262,248,272,238,252,282]],
    ['cotton',   'Cotton Candy',   2,  800, [322,202,342,312,208,318,198,338]],
    ['cosmic',   'Cosmic Dust',    2,  850, [288,252,302,272,312,268,292,322]],
    ['pixel',    'Pixel Perfect',  2,  900, [ 10,220, 62,135,285, 25,178,328]],
    // ── Legendary (5) ────────────────────────────────────────────────
    ['golden',   'Golden Hour',    3, 1200, [ 42, 38, 52, 45, 35, 55, 40, 48]],
    ['flame',    'Mystic Flame',   3, 1500, [ 12, 22, 38, 18,358, 32,  8, 28]],
    ['starfall', 'Starfall',       3, 1800, [242,262,222,248,282,238,252,272]],
    ['rainbow',  'Rainbow Wave',   3, 2000, [  0, 40, 80,140,200,260,300,340]],
    ['dragon',   'Crystal Dragon', 3, 2200, [178,192,185,182,198,172,190,185]],
    // ── Premium (4) ──────────────────────────────────────────────────
    ['diamond',  'Diamond',        4, 3000, [202,212,198,208,218,200,210,205]],
    ['obsidian', 'Obsidian',       4, 3000, [252,242,258,248,262,250,255,245]],
    ['solar',    'Solar Flare',    4, 3500, [ 32, 48, 22, 42, 12, 52, 38, 18]],
    ['candygod', 'Candy God',      4, 5000, [350,215, 55,130,280, 25,175,320]],
  ];
  // Build lookup: id → {id, name, rarity, price, hues}
  const SKINS = Object.fromEntries(
    SKIN_DATA.map(([id, name, ri, price, hues]) =>
      [id, { id, name, rarity: RARITY_NAMES[ri], price, hues }]
    )
  );

  // ── Effect data (15 buyable effects + 'none') ─────────────────────────
  // [id, name, rarity_idx, price]
  const EFFECT_DATA = [
    ['none',       'No Effects',    0,    0],
    // Epic (5)
    ['sparkle',    'Sparkle Burst', 2,  500],
    ['glowtrail',  'Glow Trail',    2,  550],
    ['softpulse',  'Soft Pulse',    2,  600],
    ['colorwave',  'Color Wave',    2,  650],
    ['shimmer',    'Shimmer',       2,  700],
    // Legendary (5)
    ['rainbowfx',  'Rainbow Wave',  3, 1500],
    ['aura',       'Aura Ring',     3, 1600],
    ['screenglow', 'Screen Glow',   3, 1800],
    ['prismsplit', 'Prism Split',   3, 1900],
    ['startrail',  'Star Trail',    3, 2000],
    // Premium (5)
    ['confetti',   'Neon Confetti', 4, 3000],
    ['candyaura',  'Candy Aura',    4, 3500],
    ['glowborder', 'Glow Border',   4, 3500],
    ['celebrate',  'Celebration',   4, 4000],
    ['megablast',  'Mega Blast',    4, 5000],
  ];
  const EFFECTS = Object.fromEntries(
    EFFECT_DATA.map(([id, name, ri, price]) =>
      [id, { id, name, rarity: RARITY_NAMES[ri], price }]
    )
  );

  // Board effects use the board element; wrap effects use the game-wrap
  const WRAP_EFFECTS = new Set(['aura','screenglow','confetti','candyaura','celebrate','megablast']);

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
    const co = $id('candy-coins-hud'); if (co) co.textContent = coins;
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
    // Build comma-separated animation list so all effects play simultaneously.
    // (Stacking CSS classes would cause later animation rules to override earlier ones.)
    const anims = ['candy-board-glow .7s ease-in-out'];
    if (n >= 4) anims.push('candy-board-pulse .7s ease-in-out');
    if (n >= 5) anims.push('candy-board-sparkle .7s ease-in-out');
    if (n >= 8) anims.push('candy-board-rainbow .7s linear');
    if (n >= 9) anims.push('candy-board-shake .45s ease-in-out');
    boardEl.style.animation = 'none';
    void boardEl.offsetWidth; // force reflow so the reset registers
    boardEl.style.animation = anims.join(', ');
    clearTimeout(boardEl._chainFXTimer);
    boardEl._chainFXTimer = setTimeout(() => { boardEl.style.animation = ''; }, 750);
    triggerEffect('combo');
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
      const mult     = chainMultiplier(chain);
      // Size multiplier: bigger match = bigger reward
      const sizeMult = matchSet.size >= 7 ? 2.0 : matchSet.size >= 5 ? 1.5 : matchSet.size >= 4 ? 1.2 : 1.0;
      score += Math.round(matchSet.size * 15 * mult * sizeMult);
      // Combo coin bonus: small coin award for chain 3+ so players feel rewarded mid-game
      if (chain >= 3) { coins += Math.min(4, chain - 2); }
      updateHUD();
      triggerChainFX(chain);
      if (matchSet.size >= 5) triggerEffect('bigMatch');

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
      const coinsEarned = Math.round(score / 38) + levelCfg.n;
      coins += coinsEarned;
      updateHUD();
      if (currentLevel >= highestUnlocked && currentLevel < MAX_LEVEL) {
        highestUnlocked = currentLevel + 1;
      }
      saveProgress().catch(() => {});
      setStatus('');
      showLevelComplete(coinsEarned);
      triggerEffect('levelComplete');
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

  // ── Effect system ─────────────────────────────────────────────────────
  function triggerEffect(type) {
    if (lowEndMode || equippedEffect === 'none') return;
    const boardEl = $id('candy-board');
    const wrapEl  = $id('candy-game-wrap') || document.querySelector('.candy-game-wrap');
    const target  = WRAP_EFFECTS.has(equippedEffect) ? wrapEl : boardEl;
    if (!target) return;
    const cls      = 'candy-eff-' + equippedEffect;
    const duration = type === 'levelComplete' ? 2200 : 900;
    // Force animation restart if already running (rapid combos would otherwise silently skip)
    target.classList.remove(cls);
    void target.offsetWidth; // trigger reflow so CSS sees the class removal
    target.classList.add(cls);
    clearTimeout(target._candyEffTimer);
    target._candyEffTimer = setTimeout(() => target.classList.remove(cls), duration);
  }

  function toggleLowEnd() {
    lowEndMode = !lowEndMode;
    const boardEl = $id('candy-board');
    if (boardEl) boardEl.classList.toggle('candy-low-end', lowEndMode);
    const btn = $id('candy-lowend-btn');
    if (btn) btn.textContent = lowEndMode ? '🐢 FX Off' : '⚡ FX';
  }
  window.toggleCandyLowEnd = toggleLowEnd;

  // ── Skin system ───────────────────────────────────────────────────────
  // skinId drives visual variant — each variant overrides sat/lightness to match theme
  function skinGrad(h, typeIdx, skinId) {
    const isNeon     = skinId === 'neon';
    const isEarthy   = skinId === 'earthy';
    const isVintage  = skinId === 'vintage';
    const isDark     = skinId === 'darkmatt' || skinId === 'midnight' || skinId === 'obsidian';
    const isLava     = skinId === 'lava';
    const isCrystal  = skinId === 'crystal' || skinId === 'diamond' || skinId === 'dragon';

    // sat levels per theme
    const s1 = isNeon ? 100 : isEarthy ? 42 : isVintage ? 40 : isDark ? 72 : 85;
    const s2 = isNeon ?  98 : isEarthy ? 38 : isVintage ? 36 : isDark ? 68 : 80;
    const s3 = isNeon ?  95 : isEarthy ? 33 : isVintage ? 30 : isDark ? 62 : 74;

    // lightness per theme — dark skins really are dark; crystal is light/icy
    const l1 = isEarthy ? 58 : isDark ? 48 : isCrystal ? 85 : isVintage ? 70 : 75;
    const l2 = isEarthy ? 38 : isDark ? 22 : isCrystal ? 60 : isVintage ? 45 : 42;
    const l3 = isEarthy ? 24 : isDark ? 10 : isCrystal ? 38 : isVintage ? 28 : 28;

    // Earthy: slight hue noise for stone grain; Lava: bright hot-core effect
    const hv   = isEarthy ? h + 6 : h;
    const lava1 = isLava ? l1 + 12 : l1; // molten bright center
    const lava2 = isLava ? l2 - 6  : l2; // dark crust edges

    // t4=Candy Corn triangle → vertical linear (top=light tip, bottom=base)
    // t6=Chocolate Bar square → angled linear for depth
    // t7=Star → diagonal linear for sparkle depth
    // All others (drop, lollipop, gummy bear, wrapped candy, jawbreaker) → radial
    if (typeIdx === 4) return `linear-gradient(180deg,hsl(${h},${s1}%,${lava1+10}%),hsl(${h},${s1}%,${lava1}%),hsl(${hv},${s2}%,${lava2}%))`;
    if (typeIdx === 6) return `linear-gradient(145deg,hsl(${h},${s1}%,${lava1+4}%),hsl(${hv},${s2}%,${lava2}%),hsl(${h},${s3}%,${l3}%))`;
    if (typeIdx === 7) return `linear-gradient(135deg,hsl(${h},${s1+5}%,${lava1}%),hsl(${hv},${s2+5}%,${lava2+3}%),hsl(${h},${s3+4}%,${l3}%))`;
    return `radial-gradient(circle at 35% 30%,hsl(${h},${s1+5}%,${lava1}%),hsl(${hv},${s1}%,${lava2}%))`;
  }

  function skinPreviewGrad(skinId, ti) {
    const DEFAULT_HUES = [350,215,55,130,280,25,175,320];
    const hues = SKINS[skinId]?.hues || DEFAULT_HUES;
    return skinGrad(hues[ti], ti, skinId);
  }

  function injectSkinStyle(skinId) {
    let el = document.getElementById('candy-skin-style');
    if (!el) {
      el = document.createElement('style');
      el.id = 'candy-skin-style';
      document.head.appendChild(el);
    }
    const skin = SKINS[skinId];
    if (!skin || !skin.hues) { el.textContent = ''; return; }
    let css = skin.hues.map((h, i) =>
      `.candy-board.skin-${skinId} .candy-gem.t${i}{background:${skinGrad(h, i, skinId)}}`
    ).join('\n');

    // Neon Brights: add electric glow via drop-shadow (GPU-composited, no lag)
    if (skinId === 'neon') {
      css += `
.candy-board.skin-neon .candy-gem{filter:drop-shadow(0 0 6px rgba(255,255,255,.55)) drop-shadow(0 0 14px rgba(180,100,255,.45));}
.candy-board.skin-neon .candy-gem.t6{filter:drop-shadow(0 0 5px rgba(255,255,255,.5)) drop-shadow(0 0 10px rgba(100,220,255,.4));}`;
    }

    // Forest Fresh: leaf-shaped clip-path for organic gem types (t0, t2, t3)
    if (skinId === 'forest') {
      css += `
.candy-board.skin-forest .candy-gem.t0{clip-path:polygon(50% 0%,85% 15%,100% 50%,85% 85%,50% 100%,15% 85%,0% 50%,15% 15%);border-radius:0;}
.candy-board.skin-forest .candy-gem.t2{clip-path:polygon(50% 0%,90% 25%,100% 60%,75% 100%,25% 100%,0% 60%,10% 25%);border-radius:0;width:82%;height:88%;}
.candy-board.skin-forest .candy-gem.t3{clip-path:polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%);border-radius:0;width:85%;height:80%;}
.candy-board.skin-forest .candy-gem.t0::after,.candy-board.skin-forest .candy-gem.t2::after,.candy-board.skin-forest .candy-gem.t3::after{display:none;}
.candy-board.skin-forest .candy-gem.t3.anim-pop{animation:candy-pop-clip .28s ease-in forwards !important;}`;
    }

    el.textContent = css;
  }

  function applySkin(skinId) {
    equippedSkin = skinId;
    const boardEl = $id('candy-board');
    if (boardEl) {
      boardEl.className = boardEl.className.replace(/\bskin-\S+/g, '').trim();
      if (skinId !== 'default') boardEl.classList.add('skin-' + skinId);
    }
    injectSkinStyle(skinId);
  }

  // ── Shop ──────────────────────────────────────────────────────────────
  function openShop() { buildShopModal('skins'); }

  function buildShopModal(tab = 'skins') {
    if (typeof removeDynamicModal === 'function') removeDynamicModal('candy-shop-modal');

    const rows = RARITY_NAMES.map(rarity => {
      const group = SKIN_DATA
        .map(([id, name, ri, price]) => ({ id, name, rarity: RARITY_NAMES[ri], price }))
        .filter(s => s.rarity === rarity);
      if (!group.length) return '';

      const items = group.map(({ id, name, price }) => {
        const owned    = ownedSkins.has(id);
        const equipped = equippedSkin === id;
        const canBuy   = coins >= price;
        const prev     = [0, 3, 6].map(ti =>
          `<div class="cskin-gem" style="background:${skinPreviewGrad(id, ti)}"></div>`
        ).join('');
        let action;
        if (equipped) {
          action = `<div class="candy-shop-badge equipped-badge">✓ On</div>`;
        } else if (owned) {
          action = `<button class="candy-shop-action-btn" onclick="window.candyModule._equipSkin('${id}')">Equip</button>`;
        } else {
          action = `<button class="candy-shop-action-btn${canBuy ? '' : ' cant-afford'}"
            ${canBuy ? `onclick="window.candyModule._buySkin('${id}',${price})"` : 'disabled'}>
            🪙 ${price}
          </button>`;
        }
        return `<div class="candy-shop-item${equipped ? ' equipped' : ''}">
          <div class="candy-skin-preview">${prev}</div>
          <div class="candy-shop-item-name">${name}</div>
          ${action}
        </div>`;
      }).join('');

      return `<div class="candy-shop-section">
        <div class="candy-shop-rarity-label candy-rarity-${rarity}">${rarity.toUpperCase()}</div>
        <div class="candy-shop-items">${items}</div>
      </div>`;
    }).join('');

    // Build effects tab content
    const noFxEquipped = equippedEffect === 'none';
    const noFxRow = `<div class="candy-shop-section">
      <div class="candy-shop-rarity-label candy-rarity-common">UNEQUIP</div>
      <div class="candy-shop-items">
        <div class="candy-shop-item${noFxEquipped ? ' equipped' : ''}">
          <div class="candy-effect-icon">🚫</div>
          <div class="candy-shop-item-name">No Effects</div>
          ${noFxEquipped
            ? `<div class="candy-shop-badge equipped-badge">✓ On</div>`
            : `<button class="candy-shop-action-btn" onclick="window.candyModule._equipEffect('none')">Equip</button>`
          }
        </div>
      </div>
    </div>`;
    const effRows = ['epic','legendary','premium'].map(rarity => {
      const group = EFFECT_DATA
        .map(([id, name, ri, price]) => ({ id, name, rarity: RARITY_NAMES[ri], price }))
        .filter(e => e.rarity === rarity);
      if (!group.length) return '';
      const items = group.map(({ id, name, price }) => {
        const owned    = ownedEffects.has(id);
        const equipped = equippedEffect === id;
        const canBuy   = coins >= price;
        const ICONS = { sparkle:'✨',glowtrail:'💫',softpulse:'🌟',colorwave:'🌈',shimmer:'🔆',
          rainbowfx:'🌈',aura:'💎',screenglow:'🌠',prismsplit:'🔮',startrail:'⭐',
          confetti:'🎉',candyaura:'🍭',glowborder:'🔴',celebrate:'🎊',megablast:'💥' };
        const icon = ICONS[id] || '✨';
        let action;
        if (equipped) {
          action = `<div class="candy-shop-badge equipped-badge">✓ On</div>`;
        } else if (owned) {
          action = `<button class="candy-shop-action-btn" onclick="window.candyModule._equipEffect('${id}')">Equip</button>`;
        } else {
          action = `<button class="candy-shop-action-btn${canBuy ? '' : ' cant-afford'}"
            ${canBuy ? `onclick="window.candyModule._buyEffect('${id}',${price})"` : 'disabled'}>
            🪙 ${price}
          </button>`;
        }
        return `<div class="candy-shop-item${equipped ? ' equipped' : ''}">
          <div class="candy-effect-icon">${icon}</div>
          <div class="candy-shop-item-name">${name}</div>
          ${action}
        </div>`;
      }).join('');
      return `<div class="candy-shop-section">
        <div class="candy-shop-rarity-label candy-rarity-${rarity}">${rarity.toUpperCase()}</div>
        <div class="candy-shop-items">${items}</div>
      </div>`;
    }).join('');

    const isSkinsTab   = tab === 'skins';
    const activeContent = isSkinsTab ? rows : (noFxRow + effRows);

    document.body.insertAdjacentHTML('beforeend', `
      <div id="candy-shop-modal" class="custom-modal-overlay blur-bg high-z" style="display:flex;">
        <div class="custom-modal candy-shop-modal-inner" style="max-width:500px;width:95vw;">
          <button class="modal-close-btn"
            onclick="(typeof removeDynamicModal==='function'?removeDynamicModal:d=>document.getElementById(d)?.remove())('candy-shop-modal')">&times;</button>
          <div class="modal-title">🛍️ Candy Shop &nbsp;<span style="font-size:14px;font-weight:700;color:#ffdd44;">🪙 ${coins}</span></div>
          <div class="candy-shop-tabs">
            <button class="candy-shop-tab${isSkinsTab ? ' active' : ''}" onclick="window.candyModule._shopTab('skins')">🍬 Skins</button>
            <button class="candy-shop-tab${!isSkinsTab ? ' active' : ''}" onclick="window.candyModule._shopTab('effects')">✨ Effects</button>
          </div>
          <div style="overflow-y:auto;max-height:55vh;margin-top:10px;">${activeContent}</div>
        </div>
      </div>`);
  }

  function _buySkin(id, price) {
    if (coins < price || ownedSkins.has(id)) return;
    coins -= price;
    ownedSkins.add(id);
    saveInventoryItem(id, 'skin').catch(() => {});
    saveProgress().catch(() => {});
    buildShopModal();
  }

  function _equipSkin(id) {
    if (!ownedSkins.has(id)) return;
    applySkin(id);
    saveProgress().catch(() => {});
    buildShopModal('skins');
  }

  function _buyEffect(id, price) {
    if (coins < price || ownedEffects.has(id)) return;
    coins -= price;
    ownedEffects.add(id);
    saveInventoryItem(id, 'effect').catch(() => {});
    saveProgress().catch(() => {});
    buildShopModal('effects');
  }

  function _equipEffect(id) {
    if (!ownedEffects.has(id)) return;
    equippedEffect = id;
    saveProgress().catch(() => {});
    buildShopModal('effects');
  }

  async function saveInventoryItem(itemId, itemType) {
    if (typeof sb === 'undefined' || !sb) return;
    if (typeof currentUser === 'undefined' || !currentUser) return;
    try {
      await sb.from('candy_inventory')
        .insert([{ username: currentUser.username, item_id: itemId, item_type: itemType }]);
    } catch (_) {}
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
      const u = currentUser.username;
      const [{ data: prog }, { data: inv }] = await Promise.all([
        sb.from('candy_progress').select('highest_level,coins,equipped_skin,equipped_effect').eq('username', u).maybeSingle(),
        sb.from('candy_inventory').select('item_id,item_type').eq('username', u),
      ]);
      if (prog) {
        highestUnlocked = Math.max(1, prog.highest_level || 1);
        coins           = prog.coins || 0;
        if (prog.equipped_skin)   equippedSkin   = prog.equipped_skin;
        if (prog.equipped_effect) equippedEffect = prog.equipped_effect;
        if (currentLevel > highestUnlocked) currentLevel = highestUnlocked;
      }
      if (inv) {
        inv.forEach(({ item_id, item_type }) => {
          if (item_type === 'skin')   ownedSkins.add(item_id);
          if (item_type === 'effect') ownedEffects.add(item_id);
        });
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
          .update({ highest_level: highestUnlocked, coins, equipped_skin: equippedSkin, equipped_effect: equippedEffect, updated_at: new Date().toISOString() })
          .eq('id', ex.id);
      } else {
        await sb.from('candy_progress')
          .insert([{ username: u, highest_level: highestUnlocked, coins, equipped_skin: equippedSkin, equipped_effect: equippedEffect }]);
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
      .then(() => { applySkin(equippedSkin); startLevel(currentLevel); })
      .catch(() => { applySkin(equippedSkin); startLevel(currentLevel); });
  }

  function restart() {
    if (score > 0 && !gameSaved) maybeSaveScore().catch(() => {});
    startLevel(currentLevel);
  }

  function destroy() {
    active   = false;
    busy     = false;
    selected = null;
    const styleEl = document.getElementById('candy-skin-style');
    if (styleEl) styleEl.textContent = '';
    const boardEl = $id('candy-board');
    if (boardEl) boardEl.className = boardEl.className.replace(/\bskin-\S+/g, '').trim();
  }

  return {
    init, destroy, restart,
    openLevelSelect, openShop,
    _startLevel: startLevel,
    _levelPage:  openLevelSelectPage,
    _shopTab:    buildShopModal,
    _buySkin, _equipSkin,
    _buyEffect, _equipEffect,
    toggleLowEnd,
  };
})();
