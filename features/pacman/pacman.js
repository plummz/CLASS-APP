window.pacmanModule = (function () {
  'use strict';

  const TILE = 26;
  const CENTER = TILE / 2;
  const STATES = {
    IDLE: 'idle',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver',
  };
  const MAP = [
    '#########################',
    '#...........#...........#',
    '#.###.#####.#.#####.###.#',
    '#o###.#####.#.#####.###o#',
    '#.......................#',
    '#.###.#.#######.#.###.#.#',
    '#.....#....#....#.....#.#',
    '#####.#### # ####.#####.#',
    '    #.#         #.#     #',
    '#####.# ### ### #.#####.#',
    '     .  #GGG#  .        ',
    '#####.# ### ### #.#####.#',
    '    #.#         #.#     #',
    '#####.# ####### #.#####.#',
    '#...........#...........#',
    '#.###.#####.#.#####.###.#',
    '#o..#.......P.......#..o#',
    '###.#.#.#######.#.#.#.###',
    '#.....#....#....#.....#.#',
    '#.########.#.########.#.#',
    '#.......................#',
    '#########################',
  ];

  let canvas, ctx, scoreEl, livesEl;
  let raf = null;
  let running = false;
  let last = 0;
  let bound = false;
  let grid, player, ghosts, score, lives, pellets, state, gameResult, nextDir, touchStart;
  let playerInvuln = 0;

  function reset() {
    stopLoop();
    grid = MAP.map(row => row.split(''));
    score = 0;
    lives = 3;
    pellets = 0;
    state = STATES.IDLE;
    gameResult = null;
    nextDir = { x: 0, y: 0 };
    touchStart = null;
    playerInvuln = 0;

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] === '.' || grid[y][x] === 'o') pellets++;
      }
    }

    resetActors();
    updateHud();
  }

  function resetActors() {
    player = {
      x: 12,
      y: 16,
      px: 12 * TILE + CENTER,
      py: 16 * TILE + CENTER,
      dir: { x: 0, y: 0 },
      mouth: 0,
    };
    ghosts = [
      makeGhost(11, 10, '#ff3158'),
      makeGhost(12, 10, '#00d4ff'),
      makeGhost(13, 10, '#ff9de6'),
      makeGhost(12, 11, '#ff9f1c'),
    ];
  }

  function makeGhost(x, y, color) {
    return {
      x,
      y,
      px: x * TILE + CENTER,
      py: y * TILE + CENTER,
      dir: { x: 1, y: 0 },
      color,
      scared: 0,
    };
  }

  function init() {
    canvas = document.getElementById('pacman-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = 672;
    canvas.height = 592;
    scoreEl = document.getElementById('pacman-score');
    livesEl = document.getElementById('pacman-lives');
    bind();
    reset();
    draw();
  }

  function destroy() {
    stopLoop();
  }

  function stopLoop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  function startLoop() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function startGame() {
    reset();
    state = STATES.PLAYING;
    gameResult = null;
    startLoop();
  }

  function bind() {
    if (bound || !canvas) return;
    bound = true;

    document.getElementById('pacman-start-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      startGame();
    });

    document.querySelectorAll('.pacman-dpad-btn').forEach((btn) => {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDirection(btn.dataset.dir);
        btn.classList.add('pressed');
      }, { passive: false });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((eventName) => {
        btn.addEventListener(eventName, () => btn.classList.remove('pressed'));
      });
    });

    document.addEventListener('keydown', (e) => {
      if (!document.getElementById('page-pacman')?.classList.contains('active')) return;
      const keyMap = {
        ArrowUp: 'up',
        KeyW: 'up',
        ArrowDown: 'down',
        KeyS: 'down',
        ArrowLeft: 'left',
        KeyA: 'left',
        ArrowRight: 'right',
        KeyD: 'right',
      };
      if (keyMap[e.code]) {
        setDirection(keyMap[e.code]);
        e.preventDefault();
      }
      if (e.code === 'Space') {
        if (state !== STATES.PLAYING) startGame();
        e.preventDefault();
      }
    });

    canvas.addEventListener('touchstart', (e) => {
      if (state !== STATES.PLAYING) return;
      const t = e.changedTouches[0];
      touchStart = { x: t.clientX, y: t.clientY };
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      if (state !== STATES.PLAYING || !touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      if (Math.hypot(dx, dy) > 18) {
        setDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      }
      touchStart = null;
      e.preventDefault();
    }, { passive: false });
  }

  function setDirection(dirName) {
    if (state !== STATES.PLAYING) return;
    const dirs = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };
    if (dirs[dirName]) nextDir = dirs[dirName];
  }

  function passable(x, y) {
    const row = grid[(y + grid.length) % grid.length];
    const c = row?.[(x + row.length) % row.length];
    return c && c !== '#';
  }

  function atCenter(ent) {
    return Math.abs(ent.px - (ent.x * TILE + CENTER)) < 1.5 && Math.abs(ent.py - (ent.y * TILE + CENTER)) < 1.5;
  }

  function stepEntity(ent, speed, dt) {
    if (atCenter(ent)) {
      ent.px = ent.x * TILE + CENTER;
      ent.py = ent.y * TILE + CENTER;
      if (ent === player && passable(ent.x + nextDir.x, ent.y + nextDir.y)) ent.dir = nextDir;
      if (!passable(ent.x + ent.dir.x, ent.y + ent.dir.y)) ent.dir = { x: 0, y: 0 };
    }
    ent.px += ent.dir.x * speed * dt;
    ent.py += ent.dir.y * speed * dt;
    const nx = Math.round((ent.px - CENTER) / TILE);
    const ny = Math.round((ent.py - CENTER) / TILE);
    if (passable(nx, ny)) {
      ent.x = (nx + grid[0].length) % grid[0].length;
      ent.y = (ny + grid.length) % grid.length;
    }
    if (ent.px < -CENTER) ent.px = grid[0].length * TILE + CENTER;
    if (ent.px > grid[0].length * TILE + CENTER) ent.px = -CENTER;
  }

  function chooseGhostDir(g) {
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ].filter(d => passable(g.x + d.x, g.y + d.y) && !(d.x === -g.dir.x && d.y === -g.dir.y));
    if (!dirs.length) return { x: -g.dir.x, y: -g.dir.y };
    const chase = Math.random() > 0.18;
    dirs.sort((a, b) => {
      const da = Math.hypot(player.x - (g.x + a.x), player.y - (g.y + a.y));
      const db = Math.hypot(player.x - (g.x + b.x), player.y - (g.y + b.y));
      return chase ? da - db : db - da;
    });
    return dirs[0];
  }

  function update(dt) {
    if (state !== STATES.PLAYING) return;

    playerInvuln = Math.max(0, playerInvuln - dt);
    stepEntity(player, 112, dt);

    const cell = grid[player.y]?.[player.x];
    if (cell === '.' || cell === 'o') {
      score += cell === 'o' ? 50 : 10;
      if (cell === 'o') ghosts.forEach(g => { g.scared = 7; });
      grid[player.y][player.x] = ' ';
      pellets--;
      if (pellets <= 0) {
        finishGame('win');
        return;
      }
    }

    for (const g of ghosts) {
      g.scared = Math.max(0, g.scared - dt);
      if (atCenter(g)) g.dir = chooseGhostDir(g);
      stepEntity(g, g.scared ? 82 : 96, dt);

      if (playerInvuln <= 0 && Math.hypot(g.px - player.px, g.py - player.py) < 16) {
        if (g.scared) {
          score += 200;
          Object.assign(g, makeGhost(12, 10, g.color));
        } else {
          loseLife();
          if (state !== STATES.PLAYING) return;
        }
      }
    }

    player.mouth += dt * 12;
    updateHud();
  }

  function loseLife() {
    if (state !== STATES.PLAYING) return;
    lives = Math.max(0, lives - 1);
    updateHud();
    if (lives <= 0) {
      finishGame('lose');
      return;
    }
    player = {
      x: 12,
      y: 16,
      px: 12 * TILE + CENTER,
      py: 16 * TILE + CENTER,
      dir: { x: 0, y: 0 },
      mouth: 0,
    };
    nextDir = { x: 0, y: 0 };
    playerInvuln = 1.2;
  }

  function finishGame(result) {
    state = STATES.GAME_OVER;
    gameResult = result;
    draw();
    stopLoop();
  }

  function updateHud() {
    if (scoreEl) scoreEl.textContent = `SCORE ${score || 0}`;
    if (livesEl) livesEl.textContent = `LIVES ${lives == null ? 3 : lives}`;
  }

  function draw() {
    if (!ctx || !grid || !player) return;
    ctx.fillStyle = '#050514';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    updateHud();

    const scale = Math.min(canvas.width / (grid[0].length * TILE), canvas.height / (grid.length * TILE));
    const ox = (canvas.width - grid[0].length * TILE * scale) / 2;
    const oy = (canvas.height - grid.length * TILE * scale) / 2;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const c = grid[y][x];
        if (c === '#') {
          ctx.fillStyle = '#0827a8';
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
          ctx.strokeStyle = '#2ea4ff';
          ctx.strokeRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
        } else if (c === '.' || c === 'o') {
          ctx.fillStyle = c === 'o' ? '#fff3a6' : '#ffeeb0';
          ctx.beginPath();
          ctx.arc(x * TILE + CENTER, y * TILE + CENTER, c === 'o' ? 5 : 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.fillStyle = playerInvuln > 0 && Math.floor(playerInvuln * 12) % 2 === 0 ? 'rgba(255,230,0,0.45)' : '#ffe600';
    const mouth = 0.18 + Math.abs(Math.sin(player.mouth)) * 0.28;
    const a = Math.atan2(player.dir.y, player.dir.x || 0.001);
    ctx.beginPath();
    ctx.moveTo(player.px, player.py);
    ctx.arc(player.px, player.py, 10, a + mouth, a + Math.PI * 2 - mouth);
    ctx.closePath();
    ctx.fill();

    for (const g of ghosts) {
      ctx.fillStyle = g.scared ? '#263cff' : g.color;
      ctx.beginPath();
      ctx.arc(g.px, g.py - 3, 10, Math.PI, 0);
      ctx.lineTo(g.px + 10, g.py + 10);
      ctx.lineTo(g.px - 10, g.py + 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(g.px - 4, g.py - 3, 2, 0, Math.PI * 2);
      ctx.arc(g.px + 4, g.py - 3, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (state !== STATES.PLAYING) {
      const title = gameResult === 'win' ? 'YOU WIN' : gameResult === 'lose' ? 'GAME OVER' : 'PAC-MAN';
      const color = gameResult === 'win' ? '#ffe600' : gameResult === 'lose' ? '#ff3158' : '#fff';
      ctx.fillStyle = 'rgba(0,0,0,0.68)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color;
      ctx.font = 'bold 38px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 12);
      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText('Press START to play', canvas.width / 2, canvas.height / 2 + 24);
      ctx.textAlign = 'left';
    }
  }

  function loop(ts) {
    if (!running) return;
    const dt = Math.min(0.08, (ts - last) / 1000 || 0);
    last = ts;
    update(dt);
    draw();
    raf = running ? requestAnimationFrame(loop) : null;
  }

  return { init, destroy };
})();
