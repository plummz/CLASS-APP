window.tetrisModule = (function () {
  'use strict';

  const COLS = 10;
  const ROWS = 20;
  const CELL = 26;
  const SIDE = 88;  // side panel width for next/hold
  const CW = COLS * CELL + SIDE;
  const CH = ROWS * CELL;

  const COLORS = {
    I: '#00d4ff',
    O: '#ffe600',
    T: '#c950ff',
    S: '#3ddc72',
    Z: '#ff3158',
    J: '#3a7fff',
    L: '#ff9f1c',
  };

  const PIECES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    O: [[1,1],[1,1]],
    T: [[0,1,0],[1,1,1],[0,0,0]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]],
  };

  const PIECE_KEYS = Object.keys(PIECES);
  const LINE_SCORES = [0, 100, 300, 500, 800];

  const STATES = { IDLE: 'idle', PLAYING: 'playing', PAUSED: 'paused', GAME_OVER: 'gameOver' };

  let canvas, ctx;
  let scoreEl, levelEl, linesEl;
  let raf = null;
  let running = false;
  let last = 0;
  let bound = false;
  let dropTimer = 0;

  let board, current, next, hold, canHold;
  let score, level, lines, state, bag, gameResult;
  let touchStart = null;
  let touchLast = null;
  let touchDropTimer = 0;

  // ─── Bag randomizer ─────────────────────────────────────────────────────────
  function newBag() {
    const b = [...PIECE_KEYS];
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  }

  function nextFromBag() {
    if (!bag.length) bag = newBag();
    return bag.pop();
  }

  // ─── Piece helpers ───────────────────────────────────────────────────────────
  function makePiece(key) {
    const matrix = PIECES[key].map(row => [...row]);
    return {
      key,
      matrix,
      x: Math.floor((COLS - matrix[0].length) / 2),
      y: key === 'I' ? -1 : 0,
    };
  }

  function rotate(matrix) {
    const n = matrix.length;
    const m = matrix[0].length;
    const out = Array.from({ length: m }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++) for (let c = 0; c < m; c++) out[c][n - 1 - r] = matrix[r][c];
    return out;
  }

  function collides(piece, dx = 0, dy = 0, mat = null) {
    const m = mat || piece.matrix;
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue;
        const nx = piece.x + c + dx;
        const ny = piece.y + r + dy;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function tryRotate(piece) {
    const rotated = rotate(piece.matrix);
    const kicks = [0, -1, 1, -2, 2];
    for (const k of kicks) {
      if (!collides(piece, k, 0, rotated)) {
        piece.matrix = rotated;
        piece.x += k;
        return;
      }
    }
  }

  function ghostY(piece) {
    let drop = 0;
    while (!collides(piece, 0, drop + 1)) drop++;
    return drop;
  }

  // ─── Board operations ────────────────────────────────────────────────────────
  function emptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function placePiece(piece) {
    piece.matrix.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (!cell) return;
        const ny = piece.y + r;
        const nx = piece.x + c;
        if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
          board[ny][nx] = piece.key;
        }
      });
    });
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every(c => c !== null)) {
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(null));
        cleared++;
        r++; // recheck same row index
      }
    }
    if (cleared) {
      lines += cleared;
      score += LINE_SCORES[cleared] * level;
      level = Math.floor(lines / 10) + 1;
      updateHud();
    }
  }

  function spawnNext() {
    current = makePiece(next);
    next = nextFromBag();
    canHold = true;
    if (collides(current)) {
      finishGame();
    }
  }

  function lockAndSpawn() {
    placePiece(current);
    clearLines();
    spawnNext();
    dropTimer = 0;
  }

  // ─── Game control ────────────────────────────────────────────────────────────
  function reset() {
    stopLoop();
    board = emptyBoard();
    bag = newBag();
    score = 0;
    level = 1;
    lines = 0;
    hold = null;
    canHold = true;
    state = STATES.IDLE;
    gameResult = null;
    dropTimer = 0;
    next = nextFromBag();
    current = makePiece(nextFromBag());
    updateHud();
  }

  function startGame() {
    reset();
    state = STATES.PLAYING;
    startLoop();
  }

  function finishGame() {
    state = STATES.GAME_OVER;
    gameResult = 'lose';
    draw();
    stopLoop();
  }

  function hardDrop() {
    if (state !== STATES.PLAYING) return;
    const drop = ghostY(current);
    current.y += drop;
    score += drop * 2;
    updateHud();
    lockAndSpawn();
  }

  function holdPiece() {
    if (!canHold || state !== STATES.PLAYING) return;
    canHold = false;
    const heldKey = hold;
    hold = current.key;
    if (heldKey) {
      current = makePiece(heldKey);
    } else {
      spawnNext();
    }
  }

  function dropSpeed() {
    return Math.max(0.08, 1 - (level - 1) * 0.08);
  }

  // ─── Update ──────────────────────────────────────────────────────────────────
  function update(dt) {
    if (state !== STATES.PLAYING) return;
    dropTimer += dt;
    if (dropTimer >= dropSpeed()) {
      dropTimer = 0;
      if (!collides(current, 0, 1)) {
        current.y++;
      } else {
        lockAndSpawn();
      }
    }
  }

  // ─── Draw ────────────────────────────────────────────────────────────────────
  function drawCell(x, y, key, alpha = 1) {
    if (!key) return;
    const color = COLORS[key];
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(x * CELL + 2, y * CELL + 2, CELL - 6, 5);
    ctx.globalAlpha = 1;
  }

  function drawMiniCell(bx, by, key, size = 18) {
    if (!key) return;
    ctx.fillStyle = COLORS[key];
    ctx.fillRect(bx + 1, by + 1, size - 2, size - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(bx + 2, by + 2, size - 5, 4);
  }

  function drawMiniPiece(matrix, key, cx, cy, size = 18) {
    const cols = matrix[0].length;
    const rows = matrix.length;
    const ox = cx - (cols * size) / 2;
    const oy = cy - (rows * size) / 2;
    matrix.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) drawMiniCell(ox + c * size, oy + r * size, key, size);
      });
    });
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, CW, CH);

    // Board background
    ctx.fillStyle = '#050514';
    ctx.fillRect(0, 0, COLS * CELL, CH);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let r = 0; r < ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(COLS * CELL, r * CELL); ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, CH); ctx.stroke();
    }

    // Placed cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]) drawCell(c, r, board[r][c]);
      }
    }

    // Ghost piece
    if (state === STATES.PLAYING && current) {
      const drop = ghostY(current);
      current.matrix.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (!cell) return;
          const gx = current.x + c;
          const gy = current.y + r + drop;
          if (gy < 0 || gy >= ROWS) return;
          ctx.strokeStyle = COLORS[current.key];
          ctx.globalAlpha = 0.3;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(gx * CELL + 2, gy * CELL + 2, CELL - 4, CELL - 4);
          ctx.globalAlpha = 1;
        });
      });
    }

    // Current piece
    if (current) {
      current.matrix.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (!cell) return;
          const gy = current.y + r;
          if (gy >= 0) drawCell(current.x + c, gy, current.key);
        });
      });
    }

    // Side panel
    const px = COLS * CELL;
    ctx.fillStyle = 'rgba(10,8,36,0.85)';
    ctx.fillRect(px, 0, SIDE, CH);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, 0, SIDE, CH);

    const labelStyle = { fill: 'rgba(200,180,255,0.65)', font: '700 9px monospace' };

    // NEXT label
    ctx.fillStyle = labelStyle.fill;
    ctx.font = labelStyle.font;
    ctx.textAlign = 'center';
    ctx.fillText('NEXT', px + SIDE / 2, 18);
    if (next) drawMiniPiece(PIECES[next], next, px + SIDE / 2, 46);

    // HOLD label
    ctx.fillStyle = labelStyle.fill;
    ctx.fillText('HOLD', px + SIDE / 2, 106);
    if (hold) {
      ctx.globalAlpha = canHold ? 1 : 0.35;
      drawMiniPiece(PIECES[hold], hold, px + SIDE / 2, 134);
      ctx.globalAlpha = 1;
    }

    // Overlay for IDLE / GAME OVER
    if (state !== STATES.PLAYING) {
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.fillRect(0, 0, COLS * CELL, CH);
      ctx.textAlign = 'center';

      const title = gameResult === 'lose' ? 'GAME OVER' : 'TETRIS';
      const titleColor = gameResult === 'lose' ? '#ff3158' : '#c950ff';
      ctx.fillStyle = titleColor;
      ctx.font = 'bold 30px monospace';
      ctx.fillText(title, (COLS * CELL) / 2, CH / 2 - 14);

      if (gameResult === 'lose') {
        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = '#ffe600';
        ctx.fillText(`SCORE: ${score}`, (COLS * CELL) / 2, CH / 2 + 14);
      }

      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText('Press START to play', (COLS * CELL) / 2, CH / 2 + (gameResult === 'lose' ? 38 : 18));
      ctx.textAlign = 'left';
    }
  }

  // ─── HUD ─────────────────────────────────────────────────────────────────────
  function updateHud() {
    if (scoreEl) scoreEl.textContent = `SCORE ${score || 0}`;
    if (levelEl) levelEl.textContent = `LVL ${level || 1}`;
    if (linesEl) linesEl.textContent = `LINES ${lines || 0}`;
  }

  // ─── Game loop ───────────────────────────────────────────────────────────────
  function loop(ts) {
    if (!running) return;
    const dt = Math.min(0.1, (ts - last) / 1000 || 0);
    last = ts;
    update(dt);
    draw();
    raf = running ? requestAnimationFrame(loop) : null;
  }

  function startLoop() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function stopLoop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  // ─── Input binding ───────────────────────────────────────────────────────────
  function bind() {
    if (bound) return;
    bound = true;

    document.getElementById('tetris-start-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      startGame();
    });

    // D-pad buttons
    const btnActions = {
      left:   () => { if (state === STATES.PLAYING && !collides(current, -1, 0)) current.x--; },
      right:  () => { if (state === STATES.PLAYING && !collides(current, 1, 0))  current.x++; },
      down:   () => { if (state === STATES.PLAYING) { if (!collides(current, 0, 1)) { current.y++; score++; updateHud(); } else lockAndSpawn(); } },
      rotate: () => { if (state === STATES.PLAYING) tryRotate(current); },
      drop:   () => hardDrop(),
      hold:   () => holdPiece(),
    };

    document.querySelectorAll('.tetris-btn[data-action]').forEach((btn) => {
      let repeatTimer = null;
      let repeatInterval = null;

      function doAction() {
        const act = btn.dataset.action;
        if (btnActions[act]) btnActions[act]();
        draw();
      }

      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.classList.add('pressed');
        doAction();
        // DAS: hold left/right to repeat
        if (btn.dataset.action === 'left' || btn.dataset.action === 'right') {
          repeatTimer = setTimeout(() => {
            repeatInterval = setInterval(() => { doAction(); }, 55);
          }, 160);
        }
      }, { passive: false });

      ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => {
        btn.addEventListener(ev, () => {
          btn.classList.remove('pressed');
          clearTimeout(repeatTimer);
          clearInterval(repeatInterval);
        });
      });
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (!document.getElementById('page-tetris')?.classList.contains('active')) return;
      switch (e.code) {
        case 'ArrowLeft':  case 'KeyA': if (state === STATES.PLAYING && !collides(current,-1,0)) { current.x--; draw(); } break;
        case 'ArrowRight': case 'KeyD': if (state === STATES.PLAYING && !collides(current, 1,0)) { current.x++; draw(); } break;
        case 'ArrowDown':  case 'KeyS': btnActions.down(); draw(); break;
        case 'ArrowUp':    case 'KeyW': case 'KeyX': if (state === STATES.PLAYING) { tryRotate(current); draw(); } break;
        case 'Space':      if (state === STATES.PLAYING) hardDrop(); else if (state !== STATES.PLAYING) startGame(); break;
        case 'KeyC':       holdPiece(); draw(); break;
        case 'KeyP':
          if (state === STATES.PLAYING) { state = STATES.PAUSED; stopLoop(); draw(); }
          else if (state === STATES.PAUSED) { state = STATES.PLAYING; startLoop(); }
          break;
        default: return;
      }
      e.preventDefault();
    });

    // Touch swipe on canvas
    canvas.addEventListener('touchstart', (e) => {
      if (state !== STATES.PLAYING) return;
      const t = e.changedTouches[0];
      touchStart = { x: t.clientX, y: t.clientY };
      touchLast  = { x: t.clientX, y: t.clientY };
      touchDropTimer = 0;
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      if (state !== STATES.PLAYING || !touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchLast.x;
      const dy = t.clientY - touchLast.y;
      const threshold = CELL * 0.6;

      if (Math.abs(dx) > threshold) {
        const dir = dx > 0 ? 1 : -1;
        if (!collides(current, dir, 0)) current.x += dir;
        touchLast.x = t.clientX;
        draw();
      }
      if (dy > threshold) {
        if (!collides(current, 0, 1)) current.y++;
        else lockAndSpawn();
        touchLast.y = t.clientY;
        draw();
      }
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      if (state !== STATES.PLAYING || !touchStart) return;
      const t = e.changedTouches[0];
      const totalDx = t.clientX - touchStart.x;
      const totalDy = t.clientY - touchStart.y;
      // Quick tap = rotate
      if (Math.hypot(totalDx, totalDy) < 14) { tryRotate(current); draw(); }
      touchStart = null;
      touchLast = null;
      e.preventDefault();
    }, { passive: false });
  }

  // ─── Public ──────────────────────────────────────────────────────────────────
  function init() {
    canvas = document.getElementById('tetris-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width  = CW;
    canvas.height = CH;
    scoreEl = document.getElementById('tetris-score');
    levelEl = document.getElementById('tetris-level');
    linesEl = document.getElementById('tetris-lines');
    bind();
    reset();
    draw();
  }

  function destroy() {
    stopLoop();
  }

  return { init, destroy };
})();
