window.pacmanModule = (function () {
  'use strict';

  const TILE = 24;
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

  let canvas, ctx, raf = null, running = false, last = 0;
  let grid, player, ghosts, score, lives, pellets, state, nextDir, touchStart = null;

  function reset() {
    grid = MAP.map(row => row.split(''));
    score = 0; lives = 3; pellets = 0; state = 'ready'; nextDir = {x:0,y:0};
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) if (grid[y][x] === '.' || grid[y][x] === 'o') pellets++;
    }
    player = { x:12, y:16, px:12*TILE+12, py:16*TILE+12, dir:{x:0,y:0}, mouth:0 };
    ghosts = [
      makeGhost(11,10,'#ff3158'), makeGhost(12,10,'#00d4ff'),
      makeGhost(13,10,'#ff9de6'), makeGhost(12,11,'#ff9f1c'),
    ];
  }

  function makeGhost(x, y, color) {
    return { x, y, px:x*TILE+12, py:y*TILE+12, dir:{x:1,y:0}, color, scared:0, turn:0 };
  }

  function init() {
    canvas = document.getElementById('pacman-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    reset();
    bind();
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function destroy() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  function bind() {
    if (canvas.dataset.pacBound) return;
    canvas.dataset.pacBound = '1';
    document.getElementById('pacman-start-btn')?.addEventListener('click', () => { if (state !== 'play') state = 'play'; });
    document.addEventListener('keydown', (e) => {
      if (!document.getElementById('page-pacman')?.classList.contains('active')) return;
      const dirs = {
        ArrowUp:{x:0,y:-1}, KeyW:{x:0,y:-1},
        ArrowDown:{x:0,y:1}, KeyS:{x:0,y:1},
        ArrowLeft:{x:-1,y:0}, KeyA:{x:-1,y:0},
        ArrowRight:{x:1,y:0}, KeyD:{x:1,y:0},
      };
      if (dirs[e.code]) { nextDir = dirs[e.code]; state = 'play'; e.preventDefault(); }
      if (e.code === 'Space' && state !== 'play') { state = 'play'; e.preventDefault(); }
    });
    canvas.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0]; touchStart = {x:t.clientX,y:t.clientY}; state = 'play'; e.preventDefault();
    }, {passive:false});
    canvas.addEventListener('touchend', (e) => {
      if (!touchStart) return;
      const t = e.changedTouches[0], dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
      if (Math.hypot(dx, dy) > 18) nextDir = Math.abs(dx) > Math.abs(dy) ? {x:Math.sign(dx),y:0} : {x:0,y:Math.sign(dy)};
      touchStart = null; e.preventDefault();
    }, {passive:false});
  }

  function passable(x, y) {
    const row = grid[(y + grid.length) % grid.length];
    const c = row?.[(x + row.length) % row.length];
    return c && c !== '#';
  }

  function atCenter(ent) {
    return Math.abs(ent.px - (ent.x*TILE+12)) < 1.5 && Math.abs(ent.py - (ent.y*TILE+12)) < 1.5;
  }

  function stepEntity(ent, speed, dt) {
    if (atCenter(ent)) {
      ent.px = ent.x*TILE+12; ent.py = ent.y*TILE+12;
      if (ent === player && passable(ent.x + nextDir.x, ent.y + nextDir.y)) ent.dir = nextDir;
      if (!passable(ent.x + ent.dir.x, ent.y + ent.dir.y)) ent.dir = {x:0,y:0};
    }
    ent.px += ent.dir.x * speed * dt; ent.py += ent.dir.y * speed * dt;
    const nx = Math.round((ent.px - 12) / TILE), ny = Math.round((ent.py - 12) / TILE);
    if (passable(nx, ny)) { ent.x = (nx + grid[0].length) % grid[0].length; ent.y = (ny + grid.length) % grid.length; }
    if (ent.px < -12) ent.px = grid[0].length*TILE + 12;
    if (ent.px > grid[0].length*TILE + 12) ent.px = -12;
  }

  function chooseGhostDir(g) {
    const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}].filter(d => passable(g.x+d.x,g.y+d.y) && !(d.x === -g.dir.x && d.y === -g.dir.y));
    if (!dirs.length) return {x:-g.dir.x,y:-g.dir.y};
    const chase = Math.random() > 0.18;
    dirs.sort((a,b) => {
      const da = Math.hypot(player.x-(g.x+a.x), player.y-(g.y+a.y));
      const db = Math.hypot(player.x-(g.x+b.x), player.y-(g.y+b.y));
      return (chase ? da - db : db - da);
    });
    return dirs[0];
  }

  function update(dt) {
    if (state !== 'play') return;
    stepEntity(player, 112, dt);
    const cell = grid[player.y]?.[player.x];
    if (cell === '.' || cell === 'o') {
      score += cell === 'o' ? 50 : 10;
      if (cell === 'o') ghosts.forEach(g => g.scared = 7);
      grid[player.y][player.x] = ' ';
      pellets--;
      if (pellets <= 0) state = 'win';
    }
    for (const g of ghosts) {
      g.scared = Math.max(0, g.scared - dt);
      if (atCenter(g)) g.dir = chooseGhostDir(g);
      stepEntity(g, g.scared ? 82 : 96, dt);
      if (Math.hypot(g.px-player.px, g.py-player.py) < 16) {
        if (g.scared) { score += 200; Object.assign(g, makeGhost(12,10,g.color)); }
        else {
          lives--;
          if (lives <= 0) state = 'lose';
          player = { x:12, y:16, px:12*TILE+12, py:16*TILE+12, dir:{x:0,y:0}, mouth:0 };
          nextDir = {x:0,y:0};
        }
      }
    }
    player.mouth += dt * 12;
  }

  function draw() {
    ctx.fillStyle = '#050514'; ctx.fillRect(0,0,canvas.width,canvas.height);
    const scale = Math.min(canvas.width/(grid[0].length*TILE), (canvas.height-54)/(grid.length*TILE));
    const ox = (canvas.width-grid[0].length*TILE*scale)/2, oy = 42;
    ctx.save(); ctx.translate(ox, oy); ctx.scale(scale, scale);
    for (let y=0;y<grid.length;y++) for (let x=0;x<grid[y].length;x++) {
      const c = grid[y][x];
      if (c === '#') {
        ctx.fillStyle = '#0827a8'; ctx.fillRect(x*TILE,y*TILE,TILE,TILE);
        ctx.strokeStyle = '#2ea4ff'; ctx.strokeRect(x*TILE+2,y*TILE+2,TILE-4,TILE-4);
      } else if (c === '.' || c === 'o') {
        ctx.fillStyle = c === 'o' ? '#fff3a6' : '#ffeeb0';
        ctx.beginPath(); ctx.arc(x*TILE+12,y*TILE+12,c === 'o' ? 5 : 2.6,0,Math.PI*2); ctx.fill();
      }
    }
    ctx.fillStyle = '#ffe600';
    const mouth = 0.18 + Math.abs(Math.sin(player.mouth))*0.28;
    const a = Math.atan2(player.dir.y, player.dir.x || 0.001);
    ctx.beginPath(); ctx.moveTo(player.px,player.py); ctx.arc(player.px,player.py,10,a+mouth,a+Math.PI*2-mouth); ctx.closePath(); ctx.fill();
    for (const g of ghosts) {
      ctx.fillStyle = g.scared ? '#263cff' : g.color;
      ctx.beginPath(); ctx.arc(g.px,g.py-3,10,Math.PI,0); ctx.lineTo(g.px+10,g.py+10); ctx.lineTo(g.px-10,g.py+10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(g.px-4,g.py-3,2,0,Math.PI*2); ctx.arc(g.px+4,g.py-3,2,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#ffe600'; ctx.font = 'bold 18px monospace';
    ctx.fillText(`SCORE ${score}`, 20, 26); ctx.fillText(`LIVES ${lives}`, 180, 26);
    if (state !== 'play') {
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = state === 'win' ? '#ffe600' : state === 'lose' ? '#ff3158' : '#fff';
      ctx.font = 'bold 38px monospace'; ctx.textAlign = 'center';
      ctx.fillText(state === 'win' ? 'YOU WIN' : state === 'lose' ? 'GAME OVER' : 'PAC-MAN', canvas.width/2, canvas.height/2-12);
      ctx.font = 'bold 15px monospace'; ctx.fillStyle = '#fff'; ctx.fillText('Press START / SPACE or swipe to play', canvas.width/2, canvas.height/2+24);
      ctx.textAlign = 'left';
    }
  }

  function loop(ts) {
    if (!running) return;
    const dt = Math.min(0.08, (ts-last)/1000 || 0);
    last = ts;
    update(dt); draw();
    raf = requestAnimationFrame(loop);
  }

  return { init, destroy };
})();
