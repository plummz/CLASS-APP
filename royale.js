window.royaleModule = (function () {
  'use strict';

  // ── Tile IDs ──────────────────────────────────────────────
  const T = { GRASS:0, DIRT:1, ROAD:2, SAND:3, WATER:4, DEEP_WATER:5, FLOOR:6 };

  // ── Map dimensions ────────────────────────────────────────
  const TILE   = 32;   // px per tile
  const MAP_W  = 200;  // tiles
  const MAP_H  = 200;

  // ── Player physics ────────────────────────────────────────
  const PLAYER_SPEED = 190; // px/s
  const PLAYER_R     = 10;  // collision radius px

  // ── Building wall offsets (2.5-D effect) ─────────────────
  const WALL_H     = 18;  // south wall pixel height
  const WALL_DEPTH = 9;   // east wall pixel width

  // ── Grass / dirt colour variants ─────────────────────────
  const GRASS_V = ['#4a7c2f','#4e8332','#46782d','#527a2f','#4a7530'];
  const DIRT_V  = ['#8b6914','#926e18','#846213','#8e6b15'];

  // ── Runtime state (set in init) ───────────────────────────
  let canvas, ctx, canvasW, canvasH;
  let animId   = null;
  let lastTime = 0;
  let running  = false;

  // ── Map data ──────────────────────────────────────────────
  let mapTiles = null; // Uint8Array[MAP_H][MAP_W]

  function seededRng(seed) {
    let s = seed | 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function setTile(x, y, type) {
    if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) mapTiles[y][x] = type;
  }

  function fillEllipse(cx, cy, rw, rh, inner, outer) {
    for (let y = cy - rh; y <= cy + rh; y++) {
      for (let x = cx - rw; x <= cx + rw; x++) {
        const d = Math.sqrt(((x-cx)/rw)**2 + ((y-cy)/rh)**2);
        if (d <= 1) setTile(x, y, d < 0.65 ? inner : outer);
      }
    }
  }

  function fillLine(x1, y1, x2, y2, type, hw) {
    const steps = Math.max(Math.abs(x2-x1), Math.abs(y2-y1));
    for (let i = 0; i <= steps; i++) {
      const t = steps ? i/steps : 0;
      const rx = Math.round(x1+(x2-x1)*t), ry = Math.round(y1+(y2-y1)*t);
      for (let dy = -hw; dy <= hw; dy++)
        for (let dx = -hw; dx <= hw; dx++)
          setTile(rx+dx, ry+dy, type);
    }
  }

  function generateMap() {
    const rng = seededRng(42);
    mapTiles = Array.from({length: MAP_H}, () => new Uint8Array(MAP_W));

    // Base: grass with scattered dirt patches
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const n = Math.sin(x*0.18+1.3)*Math.sin(y*0.22+0.7);
        mapTiles[y][x] = n > 0.55 ? T.DIRT : T.GRASS;
      }
    }

    // Lake (northwest)
    fillEllipse(32, 32, 18, 14, T.DEEP_WATER, T.WATER);
    // Sand shore
    fillEllipse(32, 32, 22, 18, T.WATER, T.SAND);

    // River running south from lake
    fillLine(38, 46, 42, 100, T.WATER, 1);

    // Roads: main cross
    fillLine(0, 100, MAP_W-1, 100, T.ROAD, 1);
    fillLine(100, 0, 100, MAP_H-1, T.ROAD, 1);
    // Secondary roads
    fillLine(50,  0, 50, 100, T.ROAD, 1);
    fillLine(150,100,150,MAP_H-1,T.ROAD,1);
    fillLine(0, 50, 100, 50, T.ROAD, 1);
    fillLine(100,150,MAP_W-1,150,T.ROAD,1);

    // Stamp building floors last
    for (const b of BUILDINGS) {
      for (let by = b.ty; by < b.ty+b.th; by++)
        for (let bx = b.tx; bx < b.tx+b.tw; bx++)
          setTile(bx, by, T.FLOOR);
    }
  }

  // ── Buildings ─────────────────────────────────────────────
  // { tx,ty,tw,th, roof, wall } — tile coords + colours
  const BUILDINGS = [
    // Central town
    {tx:93,ty:87,tw:8,th:6,roof:'#8b6b3d',wall:'#5a3e20'},
    {tx:104,ty:87,tw:10,th:8,roof:'#6b8b3d',wall:'#3d5a20'},
    {tx:93,ty:96,tw:6,th:5,roof:'#7a3d3d',wall:'#5a2020'},
    {tx:102,ty:97,tw:9,th:7,roof:'#3d6b8b',wall:'#20405a'},
    {tx:115,ty:87,tw:7,th:5,roof:'#8b7a3d',wall:'#5a4a20'},
    {tx:115,ty:94,tw:6,th:6,roof:'#5a3d8b',wall:'#35205a'},
    // NE industrial
    {tx:145,ty:28,tw:16,th:13,roof:'#6b6b6b',wall:'#3a3a3a'},
    {tx:163,ty:28,tw:13,th:11,roof:'#5a5a5a',wall:'#2f2f2f'},
    {tx:145,ty:44,tw:11,th:9,roof:'#7a5a3d',wall:'#4a2d1a'},
    {tx:158,ty:41,tw:15,th:11,roof:'#4a4a6b',wall:'#28284a'},
    // SW village
    {tx:18,ty:140,tw:7,th:5,roof:'#8b5a3d',wall:'#5a2d1a'},
    {tx:28,ty:137,tw:9,th:6,roof:'#3d8b5a',wall:'#205a35'},
    {tx:18,ty:148,tw:10,th:7,roof:'#8b8b3d',wall:'#5a5a20'},
    {tx:31,ty:146,tw:8,th:7,roof:'#6b3d8b',wall:'#3d205a'},
    // SE outpost
    {tx:154,ty:154,tw:11,th:9,roof:'#7a3d3d',wall:'#4a1a1a'},
    {tx:167,ty:152,tw:9,th:8,roof:'#3d7a3d',wall:'#1a4a1a'},
    {tx:154,ty:165,tw:13,th:10,roof:'#5a5a8b',wall:'#30305a'},
    // Scattered houses
    {tx:68,ty:28,tw:6,th:5,roof:'#8b6b3d',wall:'#5a3e20'},
    {tx:77,ty:26,tw:5,th:5,roof:'#7a3d3d',wall:'#4a1a1a'},
    {tx:58,ty:158,tw:7,th:5,roof:'#3d6b8b',wall:'#1a405a'},
    {tx:129,ty:68,tw:6,th:5,roof:'#6b8b3d',wall:'#3d5a20'},
    {tx:139,ty:128,tw:5,th:4,roof:'#8b5a3d',wall:'#5a2d1a'},
    {tx:53,ty:73,tw:8,th:6,roof:'#5a3d8b',wall:'#2d1a5a'},
    {tx:169,ty:98,tw:6,th:5,roof:'#8b8b3d',wall:'#5a5a20'},
    {tx:23,ty:93,tw:7,th:5,roof:'#3d8b5a',wall:'#1a5a35'},
  ];

  // ── Trees ─────────────────────────────────────────────────
  // { x, y — world px; r — canopy radius px; type: 'oak'|'pine'|'bush' }
  let trees = [];

  function generateTrees() {
    trees = [];
    const rng = seededRng(77);

    // SW dense forest (tile 8-55, 108-162)
    for (let i = 0; i < 130; i++) {
      const tx = 8  + rng() * 47, ty = 108 + rng() * 54;
      if (tileSafe(tx,ty)) trees.push({x:tx*TILE,y:ty*TILE,r:18+rng()*13,type:'oak'});
    }
    // North pine belt (tile 58-125, 4-42)
    for (let i = 0; i < 110; i++) {
      const tx = 58 + rng() * 67, ty = 4 + rng() * 38;
      if (tileSafe(tx,ty)) trees.push({x:tx*TILE,y:ty*TILE,r:14+rng()*10,type:'pine'});
    }
    // Bushes everywhere
    for (let i = 0; i < 220; i++) {
      const tx = rng()*MAP_W, ty = rng()*MAP_H;
      if (tileSafe(tx,ty)) trees.push({x:tx*TILE,y:ty*TILE,r:7+rng()*6,type:'bush'});
    }
    // Ring of oaks around lake
    for (let i = 0; i < 28; i++) {
      const a = (i/28)*Math.PI*2;
      const cx = 32+Math.cos(a)*24, cy = 32+Math.sin(a)*20;
      if (tileSafe(cx,cy)) trees.push({x:cx*TILE,y:cy*TILE,r:14+rng()*8,type:'oak'});
    }
  }

  function tileSafe(tx, ty) {
    const ix = Math.floor(Math.min(tx, MAP_W-1)), iy = Math.floor(Math.min(ty, MAP_H-1));
    const t = mapTiles[iy][ix];
    return t === T.GRASS || t === T.DIRT;
  }

  // ── Player ────────────────────────────────────────────────
  let player = {
    x: 100*TILE, y: 100*TILE,
    angle: 0,               // radians facing direction
    health: 100, maxHealth: 100,
    hidden: false,          // inside bush/tree canopy
  };

  // ── Camera ────────────────────────────────────────────────
  let cam = { x: 100*TILE, y: 100*TILE };

  // ── Keyboard input ────────────────────────────────────────
  const keys = {};

  // ── Left joystick (move) ──────────────────────────────────
  const joy = { active:false, id:-1, sx:0, sy:0, cx:0, cy:0, dx:0, dy:0 };

  // ── Lifecycle ─────────────────────────────────────────────
  function init() {
    canvas = document.getElementById('rl-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    document.body.classList.add('rl-active');
    forceLandscape();

    if (!mapTiles) { generateMap(); generateTrees(); }

    player.x = 100*TILE; player.y = 100*TILE;
    cam.x = player.x;    cam.y = player.y;

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup',   onKey);
    canvas.addEventListener('touchstart', onTouchStart, {passive:false});
    canvas.addEventListener('touchmove',  onTouchMove,  {passive:false});
    canvas.addEventListener('touchend',   onTouchEnd,   {passive:false});
    canvas.addEventListener('touchcancel',onTouchEnd,   {passive:false});

    hideLoading();

    running  = true;
    lastTime = performance.now();
    animId   = requestAnimationFrame(loop);
  }

  function destroy() {
    running = false;
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    window.removeEventListener('resize', resize);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('keyup',   onKey);
    if (canvas) {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove',  onTouchMove);
      canvas.removeEventListener('touchend',   onTouchEnd);
      canvas.removeEventListener('touchcancel',onTouchEnd);
    }
    document.body.classList.remove('rl-active');
    try { screen.orientation.unlock(); } catch(_) {}
  }

  function forceLandscape() {
    try { screen.orientation.lock('landscape').catch(()=>{}); } catch(_) {}
  }

  function resize() {
    canvasW = window.innerWidth;
    canvasH = window.innerHeight;
    canvas.width  = canvasW;
    canvas.height = canvasH;
  }

  function hideLoading() {
    const el = document.getElementById('rl-loading');
    if (el) { el.classList.add('hidden'); setTimeout(()=>el.remove(), 700); }
  }

  // ── Input handlers ────────────────────────────────────────
  function onKey(e) { keys[e.code] = e.type === 'keydown'; }

  function onTouchStart(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.clientX < canvasW * 0.5 && !joy.active) {
        joy.active = true; joy.id = t.identifier;
        joy.sx = joy.cx = t.clientX;
        joy.sy = joy.cy = t.clientY;
        joy.dx = joy.dy = 0;
        joyShow(joy.sx, joy.sy, joy.cx, joy.cy, 'rl-joy-base','rl-joy-knob');
      }
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (joy.active && t.identifier === joy.id) {
        joy.cx = t.clientX; joy.cy = t.clientY;
        const dx = joy.cx-joy.sx, dy = joy.cy-joy.sy;
        const len = Math.sqrt(dx*dx+dy*dy) || 1;
        const max = 45;
        joy.dx = dx/Math.max(len,max);
        joy.dy = dy/Math.max(len,max);
        joyShow(joy.sx, joy.sy,
          joy.sx+dx/Math.max(len/max,1),
          joy.sy+dy/Math.max(len/max,1),
          'rl-joy-base','rl-joy-knob');
      }
    }
  }

  function onTouchEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (joy.active && t.identifier === joy.id) {
        joy.active=false; joy.dx=0; joy.dy=0;
        joyHide('rl-joy-base','rl-joy-knob');
      }
    }
  }

  function joyShow(bx,by,kx,ky,bid,kid) {
    const b=document.getElementById(bid), k=document.getElementById(kid);
    if(b){b.style.left=bx+'px';b.style.top=by+'px';b.style.display='block';}
    if(k){k.style.left=kx+'px';k.style.top=ky+'px';k.style.display='block';}
  }
  function joyHide(bid,kid) {
    const b=document.getElementById(bid), k=document.getElementById(kid);
    if(b)b.style.display='none'; if(k)k.style.display='none';
  }

  // ── Game loop ─────────────────────────────────────────────
  function loop(ts) {
    if (!running) return;
    const dt = Math.min((ts - lastTime) / 1000, 0.1);
    lastTime = ts;
    update(dt);
    render();
    animId = requestAnimationFrame(loop);
  }

  function update(dt) {
    // Build normalised move vector
    let mx = 0, my = 0;
    if (keys['KeyW']||keys['ArrowUp'])    my -= 1;
    if (keys['KeyS']||keys['ArrowDown'])  my += 1;
    if (keys['KeyA']||keys['ArrowLeft'])  mx -= 1;
    if (keys['KeyD']||keys['ArrowRight']) mx += 1;
    if (joy.active) { mx += joy.dx; my += joy.dy; }

    const len = Math.sqrt(mx*mx+my*my);
    if (len > 1) { mx /= len; my /= len; }

    // Try to move
    const nx = player.x + mx * PLAYER_SPEED * dt;
    const ny = player.y + my * PLAYER_SPEED * dt;

    // Clamp to map
    const cx = Math.max(PLAYER_R, Math.min(MAP_W*TILE-PLAYER_R, nx));
    const cy = Math.max(PLAYER_R, Math.min(MAP_H*TILE-PLAYER_R, ny));

    // Block water
    const tx = Math.floor(cx/TILE), ty = Math.floor(cy/TILE);
    if (tx>=0&&tx<MAP_W&&ty>=0&&ty<MAP_H) {
      const t = mapTiles[ty][tx];
      if (t !== T.WATER && t !== T.DEEP_WATER) {
        player.x = cx; player.y = cy;
      }
    }

    // Update facing angle when moving
    if (len > 0.05) player.angle = Math.atan2(my, mx);

    // Check bush/tree hiding
    player.hidden = false;
    for (const tr of trees) {
      const ddx = player.x - tr.x*1, ddy = player.y - tr.y*1;
      if (Math.sqrt(ddx*ddx+ddy*ddy) < tr.r * 0.72) {
        player.hidden = true; break;
      }
    }

    // Smooth camera
    const ls = 5;
    cam.x += (player.x - cam.x) * ls * dt;
    cam.y += (player.y - cam.y) * ls * dt;
  }

  // ── Tile rendering ────────────────────────────────────────
  function drawTiles(x1, x2, y1, y2) {
    for (let ty = y1; ty < y2; ty++) {
      for (let tx = x1; tx < x2; tx++) {
        const tile = mapTiles[ty][tx];
        const px = tx*TILE, py = ty*TILE;

        switch (tile) {
          case T.GRASS: {
            ctx.fillStyle = GRASS_V[(tx*3+ty*7)%GRASS_V.length];
            ctx.fillRect(px,py,TILE,TILE);
            if ((tx+ty)%5===0) {
              ctx.fillStyle='rgba(0,0,0,0.04)';
              ctx.fillRect(px+3,py+5,2,TILE-10);
            }
            break;
          }
          case T.DIRT: {
            ctx.fillStyle = DIRT_V[(tx*5+ty*3)%DIRT_V.length];
            ctx.fillRect(px,py,TILE,TILE);
            break;
          }
          case T.ROAD: {
            ctx.fillStyle='#5c5c5c'; ctx.fillRect(px,py,TILE,TILE);
            ctx.fillStyle='#686868'; ctx.fillRect(px+1,py+1,TILE-2,TILE-2);
            break;
          }
          case T.SAND: {
            ctx.fillStyle='#c8a86b'; ctx.fillRect(px,py,TILE,TILE);
            if ((tx*7+ty*11)%5===0) {
              ctx.fillStyle='rgba(160,130,60,0.45)';
              ctx.fillRect(px+6,py+10,3,3);
            }
            break;
          }
          case T.WATER: {
            ctx.fillStyle='#2a6aa0'; ctx.fillRect(px,py,TILE,TILE);
            ctx.fillStyle='rgba(100,180,255,0.14)';
            ctx.fillRect(px+4,py+4,TILE-8,4);
            break;
          }
          case T.DEEP_WATER: {
            ctx.fillStyle='#1a3a6a'; ctx.fillRect(px,py,TILE,TILE);
            break;
          }
          case T.FLOOR: {
            ctx.fillStyle='#b5a898'; ctx.fillRect(px,py,TILE,TILE);
            ctx.strokeStyle='rgba(0,0,0,0.1)'; ctx.lineWidth=0.5;
            if (tx%2===0) ctx.strokeRect(px+0.5,py+0.5,TILE-1,TILE-1);
            break;
          }
          default:
            ctx.fillStyle='#4a7c2f'; ctx.fillRect(px,py,TILE,TILE);
        }
      }
    }
  }

  // ── Building rendering ────────────────────────────────────
  function shade(hex, amt) {
    let r=parseInt(hex.slice(1,3),16)+amt;
    let g=parseInt(hex.slice(3,5),16)+amt;
    let b=parseInt(hex.slice(5,7),16)+amt;
    r=Math.max(0,Math.min(255,r));
    g=Math.max(0,Math.min(255,g));
    b=Math.max(0,Math.min(255,b));
    return `rgb(${r},${g},${b})`;
  }

  function drawBuildings(sy, ey) {
    const sorted = BUILDINGS.slice().sort((a,b)=>(a.ty+a.th)-(b.ty+b.th));
    for (const b of sorted) {
      if (b.ty+b.th < sy-1 || b.ty > ey+1) continue;
      drawBuilding(b.tx*TILE, b.ty*TILE, b.tw*TILE, b.th*TILE, b.roof, b.wall);
    }
  }

  function drawBuilding(px, py, pw, ph, roof, wall) {
    // Ground shadow
    ctx.fillStyle='rgba(0,0,0,0.16)';
    ctx.beginPath();
    ctx.ellipse(px+pw/2, py+ph+WALL_H/2, pw/2+5, WALL_H/2+4, 0,0,Math.PI*2);
    ctx.fill();

    // South wall
    ctx.fillStyle = wall;
    ctx.fillRect(px, py+ph, pw, WALL_H);
    ctx.fillStyle='rgba(0,0,0,0.22)';
    ctx.fillRect(px, py+ph+WALL_H-3, pw, 3);
    drawWallWindows(px, py+ph, pw, WALL_H);

    // East wall (darker)
    ctx.fillStyle = shade(wall,-18);
    ctx.fillRect(px+pw, py+WALL_H/2, WALL_DEPTH, ph);
    ctx.fillStyle='rgba(0,0,0,0.18)';
    ctx.fillRect(px+pw+WALL_DEPTH-2, py+WALL_H/2, 2, ph);

    // Roof
    ctx.fillStyle = roof;
    ctx.fillRect(px, py, pw, ph);
    // Roof highlight edge
    ctx.fillStyle = shade(roof, 28);
    ctx.fillRect(px, py, pw, 3);
    ctx.fillRect(px, py, 3, ph);
    // Shingle lines
    ctx.fillStyle = shade(roof,-14);
    for (let ry=py+8; ry<py+ph; ry+=8) ctx.fillRect(px+1,ry,pw-2,1);
    ctx.fillStyle = shade(roof,-10);
    for (let rx=px+16; rx<px+pw-1; rx+=16) ctx.fillRect(rx,py+1,1,ph-2);
    // Roof border
    ctx.strokeStyle = shade(roof,22);
    ctx.lineWidth=1;
    ctx.strokeRect(px+0.5,py+0.5,pw-1,ph-1);
  }

  function drawWallWindows(px, py, pw, wh) {
    const ww=8, whh=wh-6;
    for (let wx=px+10; wx+ww<px+pw-4; wx+=20) {
      ctx.fillStyle='rgba(20,30,60,0.7)';
      ctx.fillRect(wx, py+3, ww, whh);
      ctx.strokeStyle='rgba(180,160,100,0.55)';
      ctx.lineWidth=1;
      ctx.strokeRect(wx, py+3, ww, whh);
      ctx.fillStyle='rgba(255,255,255,0.18)';
      ctx.fillRect(wx+1, py+4, 2, 3);
    }
  }

  // ── Tree rendering ────────────────────────────────────────
  function pRng(seed) {
    let s = seed;
    return ()=>{ s=Math.sin(s)*43758.5453; s-=Math.floor(s); return s; };
  }

  function drawTreeBases(wx1,wx2,wy1,wy2) {
    for (const tr of trees) {
      if (tr.type==='bush') continue;
      if (tr.x<wx1||tr.x>wx2||tr.y<wy1||tr.y>wy2) continue;
      const tw=tr.r*0.28, th=tr.r*0.75;
      // trunk shadow
      ctx.fillStyle='rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(tr.x+3, tr.y+3, tw*0.8, th*0.22, 0,0,Math.PI*2);
      ctx.fill();
      // trunk
      const g=ctx.createLinearGradient(tr.x-tw,tr.y,tr.x+tw,tr.y+th);
      g.addColorStop(0,'#7a4a1a'); g.addColorStop(1,'#4a2a0a');
      ctx.fillStyle=g;
      ctx.fillRect(tr.x-tw/2, tr.y-th*0.25, tw, th);
    }
  }

  function drawTreeCanopy(tr) {
    const {x,y,r,type}=tr;
    if (type==='bush') {
      const rng=pRng(x*0.1+y*0.07);
      for (let i=0;i<3;i++) {
        const bx=x+(rng()-0.5)*r*0.8, by=y+(rng()-0.5)*r*0.5;
        const br=r*0.55+rng()*r*0.25;
        const g=ctx.createRadialGradient(bx-br*0.2,by-br*0.2,0,bx,by,br);
        g.addColorStop(0,'#4aaa28');g.addColorStop(0.5,'#2d7a18');g.addColorStop(1,'#1a4f0e');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(bx,by,br,0,Math.PI*2); ctx.fill();
      }
      ctx.fillStyle='rgba(100,200,80,0.18)';
      ctx.beginPath(); ctx.arc(x-r*0.15,y-r*0.2,r*0.35,0,Math.PI*2); ctx.fill();
      return;
    }
    if (type==='pine') {
      for (let l=0;l<3;l++) {
        const ly=y-r*0.7+l*r*0.4, lw=r*(0.55+l*0.3), lh=r*0.55;
        ctx.fillStyle=`rgb(${18+l*10},${72+l*12},${18+l*10})`;
        ctx.beginPath();
        ctx.moveTo(x,ly-lh*0.5);
        ctx.lineTo(x-lw,ly+lh);
        ctx.lineTo(x+lw,ly+lh);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle='rgba(100,200,80,0.13)';
        ctx.beginPath();
        ctx.moveTo(x,ly-lh*0.5);
        ctx.lineTo(x-lw*0.38,ly+lh*0.3);
        ctx.lineTo(x+lw*0.1,ly+lh*0.3);
        ctx.closePath(); ctx.fill();
      }
      return;
    }
    // Oak
    ctx.fillStyle='rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(x+5,y+5,r+2,r*0.45,0,0,Math.PI*2); ctx.fill();
    const rng=pRng(x*0.13+y*0.09);
    for (let i=0;i<4;i++) {
      const ox=(rng()-0.5)*r*0.7, oy=(rng()-0.5)*r*0.6, or=r*(0.62+rng()*0.24);
      const g=ctx.createRadialGradient(x+ox-or*0.2,y+oy-or*0.3,0,x+ox,y+oy,or);
      g.addColorStop(0,'#5aaa30');g.addColorStop(0.5,'#3a8020');g.addColorStop(1,'#1f5010');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x+ox,y+oy,or,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle='rgba(120,210,80,0.22)';
    ctx.beginPath(); ctx.arc(x-r*0.2,y-r*0.3,r*0.52,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(0,40,0,0.28)';
    ctx.beginPath(); ctx.arc(x+r*0.1,y+r*0.2,r*0.58,0,Math.PI*2); ctx.fill();
  }

  function drawTreeCanopies(wx1,wx2,wy1,wy2) {
    for (const tr of trees) {
      if (tr.x<wx1||tr.x>wx2||tr.y<wy1||tr.y>wy2) continue;
      drawTreeCanopy(tr);
    }
  }

  // ── Player rendering ──────────────────────────────────────
  function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle - Math.PI/2);

    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(3,3,9,6,0,0,Math.PI*2); ctx.fill();

    // Arms
    ctx.fillStyle='#5a4a3a';
    ctx.beginPath(); ctx.ellipse(-7,2,3,5,0.3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( 7,2,3,5,-0.3,0,Math.PI*2); ctx.fill();

    // Body (vest)
    ctx.fillStyle='#3a3a5a';
    ctx.beginPath(); ctx.ellipse(0,2,7,9,0,0,Math.PI*2); ctx.fill();
    // Vest highlight
    ctx.fillStyle='rgba(255,255,255,0.07)';
    ctx.beginPath(); ctx.ellipse(-1,-1,4,6,0,0,Math.PI*2); ctx.fill();

    // Rifle barrel
    ctx.fillStyle='#222';
    ctx.fillRect(-1.5,-20,3,14);
    // Rifle body
    ctx.fillRect(-2,-12,4,8);

    // Head
    ctx.fillStyle='#c8a070';
    ctx.beginPath(); ctx.arc(0,-8,5.5,0,Math.PI*2); ctx.fill();
    // Helmet
    ctx.fillStyle='#4a4a2a';
    ctx.beginPath(); ctx.arc(0,-9,5.9,Math.PI,Math.PI*2); ctx.fill();
    // Helmet brim
    ctx.fillRect(-7,-9,14,2);

    ctx.restore();
  }

  // ── Minimap ───────────────────────────────────────────────
  let mmCanvas = null;

  function buildMinimap() {
    mmCanvas = document.createElement('canvas');
    mmCanvas.width = 120; mmCanvas.height = 120;
    const mc = mmCanvas.getContext('2d');
    const tw = 120/MAP_W, th = 120/MAP_H;
    const PAL = ['#2a5a18','#6b4a10','#4a4a4a','#a88a50','#1a4a7a','#0a2a5a','#7a6a5a'];
    for (let ty=0;ty<MAP_H;ty+=2) {
      for (let tx=0;tx<MAP_W;tx+=2) {
        mc.fillStyle = PAL[mapTiles[ty][tx]] || '#2a5a18';
        mc.fillRect(tx*tw, ty*th, tw*2, th*2);
      }
    }
  }

  function drawHUD() {
    // ── Health bar
    const hx=20, hy=canvasH-52;
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(hx-2,hy-2,154,18);
    ctx.fillStyle='#900'; ctx.fillRect(hx,hy,150,14);
    ctx.fillStyle='#0c0';
    ctx.fillRect(hx,hy,(player.health/player.maxHealth)*150,14);
    ctx.fillStyle='#fff'; ctx.font='bold 11px monospace';
    ctx.textAlign='left';
    ctx.fillText(`HP ${player.health}/${player.maxHealth}`, hx+4, hy+11);

    // ── Hidden indicator
    if (player.hidden) {
      ctx.fillStyle='rgba(0,160,0,0.55)';
      ctx.fillRect(20,canvasH-76,76,18);
      ctx.fillStyle='#fff'; ctx.font='bold 10px monospace';
      ctx.fillText('HIDDEN',27,canvasH-63);
    }

    // ── Minimap
    if (!mmCanvas) buildMinimap();
    const mx=canvasW-130, my=10, mw=120, mh=120;
    ctx.globalAlpha=0.85;
    ctx.fillStyle='#000'; ctx.fillRect(mx,my,mw,mh);
    ctx.drawImage(mmCanvas,mx,my);
    ctx.globalAlpha=1;
    // Player dot
    const pdx=mx+(player.x/(MAP_W*TILE))*mw;
    const pdy=my+(player.y/(MAP_H*TILE))*mh;
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(pdx,pdy,3,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.5)';
    ctx.lineWidth=1; ctx.strokeRect(mx,my,mw,mh);

    // ── Title bar
    ctx.fillStyle='rgba(0,0,0,0.45)';
    ctx.fillRect(canvasW/2-90,6,180,22);
    ctx.fillStyle='#8fce50'; ctx.font='bold 12px monospace';
    ctx.textAlign='center';
    ctx.fillText('BATTLE ROYALE', canvasW/2, 21);
    ctx.textAlign='left';
  }

  // ── Render ────────────────────────────────────────────────
  function render() {
    ctx.clearRect(0,0,canvasW,canvasH);

    const offX = Math.round(canvasW/2 - cam.x);
    const offY = Math.round(canvasH/2 - cam.y);
    ctx.save();
    ctx.translate(offX, offY);

    // Visible tile range
    const tx1=Math.max(0,Math.floor((cam.x-canvasW/2)/TILE)-1);
    const tx2=Math.min(MAP_W,Math.ceil((cam.x+canvasW/2)/TILE)+1);
    const ty1=Math.max(0,Math.floor((cam.y-canvasH/2)/TILE)-1);
    const ty2=Math.min(MAP_H,Math.ceil((cam.y+canvasH/2)/TILE)+1);

    // World-space viewport for tree culling
    const wx1=(tx1-1)*TILE, wx2=(tx2+1)*TILE;
    const wy1=(ty1-1)*TILE, wy2=(ty2+1)*TILE;

    drawTiles(tx1, tx2, ty1, ty2);
    drawTreeBases(wx1,wx2,wy1,wy2);
    drawBuildings(ty1, ty2);

    // Player — drawn before canopies so trees overlay it when hidden
    if (!player.hidden) drawPlayer();

    drawTreeCanopies(wx1,wx2,wy1,wy2);

    if (player.hidden) {
      ctx.globalAlpha=0.45;
      drawPlayer();
      ctx.globalAlpha=1;
    }

    ctx.restore();
    drawHUD();
  }

  // ── Public API ────────────────────────────────────────────
  return { init, destroy };
})();
