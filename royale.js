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
    angle: 0,
    health: 100, maxHealth: 100,
    armor: 0,   maxArmor: 100,
    hidden: false,
    alive: true,
    kills: 0,
  };

  // ── Game state ────────────────────────────────────────────
  let gamePhase = 'parachute'; // 'parachute'|'playing'|'dead'|'win'
  let gameEndTimer = 0;
  let totalKills   = 0;

  // ── Parachute intro state ─────────────────────────────────
  const PLANE_Y   = 80 * TILE;          // fixed lat the plane flies
  let paraPlane   = { x:0, speed:280 }; // plane world-x, px/s
  let paraDeployed = false;             // player opened chute
  let paraZ        = 800;               // altitude px (0 = ground)
  let paraVZ       = 0;                 // vertical speed (positive = falling)
  let paraLanded   = false;

  // ── Stance system ─────────────────────────────────────────
  // 'stand' | 'crouch' | 'prone'
  let stance = 'stand';
  const STANCE_SPEED  = { stand:190, crouch:110, prone:55 };
  const STANCE_SPREAD = { stand:1.0, crouch:0.6, prone:0.3 };
  const STANCE_HEIGHT = { stand:1.0, crouch:0.7, prone:0.45 }; // draw scale

  // ── Screen shake ──────────────────────────────────────────
  let shakeAmt = 0;   // current shake magnitude px
  let shakeX=0, shakeY=0;

  // ── Muzzle flash ──────────────────────────────────────────
  let muzzleFlash = 0; // frames remaining

  // ── Floating damage numbers ───────────────────────────────
  let dmgNumbers = []; // { x,y,val,life,maxLife,col }

  // ── Hit marker ────────────────────────────────────────────
  let hitMarker = 0;   // frames to show crosshair hit flash

  // ── Spectate ──────────────────────────────────────────────
  let spectateTarget = null; // bot object being watched
  let spectateCam    = { x:0, y:0 };

  // ── Camera ────────────────────────────────────────────────
  let cam = { x: 100*TILE, y: 100*TILE };

  // ── Keyboard input ────────────────────────────────────────
  const keys = {};
  const keysJustDown = new Set(); // cleared each frame — used for semi-auto fire

  // ── Left joystick (move) ──────────────────────────────────
  const joy = { active:false, id:-1, sx:0, sy:0, cx:0, cy:0, dx:0, dy:0 };

  // ── Lifecycle ─────────────────────────────────────────────
  function init() {
    canvas = document.getElementById('rl-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    document.body.classList.add('rl-active');
    checkOrientation(); // set portrait rotation class immediately

    if (!mapTiles) { generateMap(); generateTrees(); }

    player.x=0; player.y=PLANE_Y; player.health=100; player.armor=0; player.alive=true; player.kills=0;
    gamePhase='parachute'; gameEndTimer=0; totalKills=0;
    paraPlane={x:0, speed:280}; paraDeployed=false; paraZ=800; paraVZ=0; paraLanded=false;
    stance='stand'; shakeAmt=0; shakeX=0; shakeY=0; muzzleFlash=0;
    dmgNumbers=[]; hitMarker=0; spectateTarget=null; spectateCam={x:player.x,y:player.y};
    cam.x=player.x; cam.y=player.y;
    inventory=[]; ammoCache={}; activeSlot=0; reloading=false;
    bullets=[]; throwables=[]; fires=[]; explosions=[]; killFeed=[];
    airdrop=null; airdropTimer=0; broadcastThrottle=0;
    spawnLoot(); spawnBots(); initZone(); initMultiplayer();

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup',   onKey);
    document.addEventListener('keydown', onAnyKeyForExit);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
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
    window.removeEventListener('resize', checkOrientation);
    window.removeEventListener('orientationchange', checkOrientation);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('keyup',   onKey);
    document.removeEventListener('keydown', onAnyKeyForExit);
    if (canvas) {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
    }
    if (canvas) {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove',  onTouchMove);
      canvas.removeEventListener('touchend',   onTouchEnd);
      canvas.removeEventListener('touchcancel',onTouchEnd);
    }
    document.body.classList.remove('rl-active');
    document.body.classList.remove('rl-portrait');
    destroyMultiplayer();
  }

  function checkOrientation() {
    const isPortrait = window.innerHeight > window.innerWidth;
    document.body.classList.toggle('rl-portrait', isPortrait);
    // After CSS rotation the logical canvas dims are swapped; resize fixes them
    resize();
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
  function onKey(e) {
    keys[e.code] = e.type === 'keydown';
    if (e.type === 'keydown') {
      keysJustDown.add(e.code);
      if (e.code === 'Space' && gamePhase === 'parachute' && !paraDeployed) paraDeployed = true;
    }
  }

  function onTouchStart(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.clientX < canvasW * 0.5 && !joy.active) {
        joy.active=true; joy.id=t.identifier;
        joy.sx=joy.cx=t.clientX; joy.sy=joy.cy=t.clientY;
        joy.dx=joy.dy=0;
        joyShow(joy.sx,joy.sy,joy.cx,joy.cy,'rl-joy-base','rl-joy-knob');
      } else if (t.clientX >= canvasW*0.5) {
        if (gamePhase==='parachute' && !paraDeployed) { paraDeployed=true; }
        else onAimTouchStart(t);
      }
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (joy.active && t.identifier===joy.id) {
        joy.cx=t.clientX; joy.cy=t.clientY;
        const dx=joy.cx-joy.sx, dy=joy.cy-joy.sy;
        const len=Math.sqrt(dx*dx+dy*dy)||1, max=45;
        joy.dx=dx/Math.max(len,max); joy.dy=dy/Math.max(len,max);
        joyShow(joy.sx,joy.sy,
          joy.sx+dx/Math.max(len/max,1),
          joy.sy+dy/Math.max(len/max,1),
          'rl-joy-base','rl-joy-knob');
      } else {
        onAimTouchMove(t);
      }
    }
  }

  function onTouchEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (joy.active && t.identifier===joy.id) {
        joy.active=false; joy.dx=0; joy.dy=0;
        joyHide('rl-joy-base','rl-joy-knob');
      } else {
        onAimTouchEnd(t);
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
    updateShake(dt);
    updateSpectate(dt);
    updateDmgNumbers(dt);

    // Parachute phase
    if (gamePhase === 'parachute') {
      updateParachute(dt);
      updateKillFeed(dt);
      return;
    }
    if (gamePhase === 'dead' || gamePhase === 'win') {
      gameEndTimer += dt;
      updateKillFeed(dt);
      return;
    }

    // Stance toggle
    if (keys['KeyZ']) stance='prone';
    else if (keys['KeyC']) stance='crouch';
    else if (keys['KeyX']) stance='stand';
    // Auto stand on fast movement handled below

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
    const spd = STANCE_SPEED[stance];
    const nx = player.x + mx * spd * dt;
    const ny = player.y + my * spd * dt;

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

    // ── Keyboard fire — auto weapons fire while held; semi-auto require a fresh keypress
    const wkey = inventory[activeSlot];
    if (wkey && WEAPONS[wkey]) {
      const w = WEAPONS[wkey];
      const fireNow = w.auto ? keys['Space'] : keysJustDown.has('Space');
      if (fireNow) tryFire(player.x, player.y, player.angle, wkey, localId);
    }
    keysJustDown.clear();
    if (keys['KeyR']) startReload();
    if (keys['Digit1']) activeSlot=0;
    if (keys['Digit2']) activeSlot=1;

    updateReload();
    updateBullets(dt);
    updateThrowables(dt);
    updateFires(dt);
    updateExplosions(dt);
    updateZone(dt);
    updateBotsAdvanced(dt);
    updateAirdrop(dt);
    updatePickups();
    updateKillFeed(dt);
    tickAirdropSpawn(dt);
    checkEndCondition();
    broadcastState();
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

  // ── Parachute render ─────────────────────────────────────
  function drawParachute() {
    if (paraLanded) return;
    const px=player.x, py=player.y;
    const shadow = paraZ * 0.3; // shadow offset grows with altitude

    // Ground shadow
    ctx.fillStyle='rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(px+shadow*0.5, py+shadow*0.3, 14+shadow*0.05, 8+shadow*0.03, 0,0,Math.PI*2);
    ctx.fill();

    // Soldier body (drawn at actual ground position)
    ctx.fillStyle='#3a3a5a';
    ctx.beginPath(); ctx.ellipse(px,py,7,9,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#c8a070';
    ctx.beginPath(); ctx.arc(px,py-8,5.5,0,Math.PI*2); ctx.fill();

    if (paraDeployed) {
      // Parachute canopy above (offset by altitude)
      const cy2=py-30-paraZ*0.25;
      ctx.strokeStyle='rgba(255,200,50,0.9)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(px,cy2,28,Math.PI,Math.PI*2); ctx.stroke();
      // Rigging lines
      ctx.beginPath();
      ctx.moveTo(px-28,cy2); ctx.lineTo(px-6,py-10);
      ctx.moveTo(px+28,cy2); ctx.lineTo(px+6,py-10);
      ctx.moveTo(px,cy2+28); ctx.lineTo(px,py-10);
      ctx.stroke();
      // Altitude indicator
      ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font='10px monospace'; ctx.textAlign='center';
      ctx.fillText(`ALT ${Math.round(paraZ)}m`, px, py-38-paraZ*0.25);
      ctx.textAlign='left';
    } else {
      // Free-fall — arms spread
      ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='10px monospace'; ctx.textAlign='center';
      ctx.fillText('SPACE / TAP to deploy', px, py-30);
      ctx.textAlign='left';
    }
  }

  // ── Player rendering ──────────────────────────────────────
  function drawPlayer() {
    const sc = STANCE_HEIGHT[stance];
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.scale(1, sc);
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

  // ── HUD extras ───────────────────────────────────────────
  function drawWeaponHUD() {
    const slotW=110, slotH=44, gap=8, startX=canvasW/2-slotW-gap/2, y=canvasH-slotH-12;
    for (let i=0;i<2;i++) {
      const x=startX+i*(slotW+gap);
      const active=i===activeSlot;
      ctx.fillStyle=active?'rgba(255,255,255,0.18)':'rgba(0,0,0,0.5)';
      ctx.strokeStyle=active?'rgba(255,220,80,0.9)':'rgba(255,255,255,0.25)';
      ctx.lineWidth=active?2:1;
      ctx.fillRect(x,y,slotW,slotH);
      ctx.strokeRect(x,y,slotW,slotH);
      const key=inventory[i];
      if (key) {
        const w=WEAPONS[key];
        ctx.fillStyle='#fff'; ctx.font=`bold 13px monospace`; ctx.textAlign='center';
        ctx.fillText(w.name, x+slotW/2, y+16);
        ctx.fillStyle=reloading&&active?'#fa0':'#8fce50';
        ctx.font='11px monospace';
        ctx.fillText(reloading&&active?'RELOADING…':`${ammoCache[key]||0} / ${w.maxAmmo}`, x+slotW/2, y+32);
      } else {
        ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font='12px monospace'; ctx.textAlign='center';
        ctx.fillText(`SLOT ${i+1}`, x+slotW/2, y+26);
      }
    }
    ctx.textAlign='left';
  }

  function drawKillFeed() {
    let ky=80;
    for (const kf of killFeed) {
      const alpha=Math.min(1,kf.life);
      ctx.fillStyle=`rgba(0,0,0,${alpha*0.5})`;
      ctx.fillRect(canvasW-210,ky-14,200,18);
      ctx.fillStyle=`rgba(255,255,255,${alpha})`;
      ctx.font='11px monospace'; ctx.textAlign='right';
      ctx.fillText(kf.text, canvasW-10, ky);
      ky+=22;
    }
    ctx.textAlign='left';
  }

  function drawZoneHUD() {
    if (zone.phase >= ZONE_PHASES.length) return;
    const ph=ZONE_PHASES[zone.phase];
    const tot=zone.shrinking?ph.shrink:ph.wait;
    const pct=Math.min(1,zone.timer/tot);
    const label=zone.shrinking?'ZONE CLOSING':'NEXT ZONE IN';
    const secs=Math.ceil(tot-zone.timer);
    const bw=160, bh=16, bx=canvasW/2-bw/2, by=36;
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(bx-2,by-2,bw+4,bh+4);
    ctx.fillStyle=zone.shrinking?'rgba(0,100,255,0.7)':'rgba(0,180,80,0.5)';
    ctx.fillRect(bx,by,bw*pct,bh);
    ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=1; ctx.strokeRect(bx,by,bw,bh);
    ctx.fillStyle='#fff'; ctx.font='bold 10px monospace'; ctx.textAlign='center';
    ctx.fillText(`${label}  ${secs}s  (P${zone.phase+1})`, canvasW/2, by+bh-3);
    ctx.textAlign='left';
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
    ctx.fillText(`HP ${Math.ceil(player.health)}/${player.maxHealth}`, hx+4, hy+11);
    // Armor bar
    if (player.armor > 0) {
      const ax=hx, ay=hy-20;
      ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(ax-2,ay-2,154,14);
      ctx.fillStyle='#336'; ctx.fillRect(ax,ay,150,10);
      ctx.fillStyle='#6af'; ctx.fillRect(ax,ay,(player.armor/player.maxArmor)*150,10);
      ctx.fillStyle='#adf'; ctx.font='9px monospace';
      ctx.fillText(`ARMOR ${Math.ceil(player.armor)}`, ax+4, ay+9);
    }

    // ── Stance + Hidden indicators (stacked, no overlap)
    let badgeY = canvasH - 80;
    if (stance !== 'stand') {
      ctx.fillStyle = stance==='prone' ? 'rgba(200,100,0,0.65)' : 'rgba(0,100,200,0.55)';
      ctx.fillRect(20, badgeY, 76, 18);
      ctx.fillStyle='#fff'; ctx.font='bold 10px monospace';
      ctx.fillText(stance.toUpperCase(), 28, badgeY+13);
      badgeY -= 22;
    }
    if (player.hidden) {
      ctx.fillStyle='rgba(0,160,0,0.55)';
      ctx.fillRect(20, badgeY, 76, 18);
      ctx.fillStyle='#fff'; ctx.font='bold 10px monospace';
      ctx.fillText('HIDDEN', 27, badgeY+13);
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
    // Zone ring on minimap
    const mmScale = mw / (MAP_W*TILE);
    const zmx = mx + zone.cx*mmScale;
    const zmy = my + zone.cy*mmScale;
    const zmr = zone.r * mmScale;
    ctx.strokeStyle='rgba(0,120,255,0.7)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(zmx,zmy,Math.max(zmr,1),0,Math.PI*2); ctx.stroke();

    // Bot dots on minimap
    for (const bt of bots) {
      if (!bt.alive) continue;
      ctx.fillStyle='#f55';
      ctx.beginPath();
      ctx.arc(mx+bt.x*mmScale, my+bt.y*mmScale, 2, 0, Math.PI*2);
      ctx.fill();
    }

    // Player dot
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

    drawZoneHUD();
    drawWeaponHUD();
    drawKillFeed();
  }

  // ── Render ────────────────────────────────────────────────
  function render() {
    ctx.clearRect(0,0,canvasW,canvasH);

    // Use spectate cam when dead
    const renderCam = (gamePhase==='dead' && spectateTarget)
      ? spectateCam : cam;

    const offX = Math.round(canvasW/2 - renderCam.x) + shakeX;
    const offY = Math.round(canvasH/2 - renderCam.y) + shakeY;
    ctx.save();
    ctx.translate(offX, offY);

    // Visible tile range
    const tx1=Math.max(0,Math.floor((renderCam.x-canvasW/2)/TILE)-1);
    const tx2=Math.min(MAP_W,Math.ceil((renderCam.x+canvasW/2)/TILE)+1);
    const ty1=Math.max(0,Math.floor((renderCam.y-canvasH/2)/TILE)-1);
    const ty2=Math.min(MAP_H,Math.ceil((renderCam.y+canvasH/2)/TILE)+1);

    // World-space viewport for tree culling
    const wx1=(tx1-1)*TILE, wx2=(tx2+1)*TILE;
    const wy1=(ty1-1)*TILE, wy2=(ty2+1)*TILE;

    drawTiles(tx1, tx2, ty1, ty2);
    drawZone();
    drawLoot();
    drawCrates();
    drawFires();
    drawTreeBases(wx1,wx2,wy1,wy2);
    drawBuildings(ty1, ty2);
    drawBots();
    drawThrowables();

    // Remote players
    for (const id in remotePlayers) drawRemotePlayer(remotePlayers[id]);

    // Local player — drawn before canopies so trees overlay it when hidden
    if (!player.hidden) drawPlayer();

    drawTreeCanopies(wx1,wx2,wy1,wy2);

    if (player.hidden) {
      ctx.globalAlpha=0.45;
      drawPlayer();
      ctx.globalAlpha=1;
    }

    drawBullets();
    drawExplosions();
    drawAirdrop();
    drawMuzzleFlash();
    drawDmgNumbers();

    // Parachute overlay (drawn in world space)
    if (gamePhase==='parachute') drawParachute();

    ctx.restore();
    if (gamePhase !== 'dead' && gamePhase !== 'win') {
      drawHUD();
      drawCrosshair();
    }
    drawSpectateTag();
    drawEndScreen();

    // Parachute instruction HUD
    if (gamePhase==='parachute' && !paraDeployed) {
      ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(canvasW/2-120,canvasH/2-20,240,34);
      ctx.fillStyle='#fff'; ctx.font='bold 13px monospace'; ctx.textAlign='center';
      ctx.fillText('SPACE / tap right side to deploy chute', canvasW/2, canvasH/2+2);
      ctx.textAlign='left';
    }
  }

  // ── Weapon definitions ────────────────────────────────────
  const WEAPONS = {
    pistol:  {name:'Pistol',   dmg:25,  rof:400,  spd:520, range:380, spread:0.06, ammo:12, maxAmmo:60,  auto:false, pellets:1, reload:1400},
    revolver:{name:'Revolver', dmg:55,  rof:700,  spd:560, range:420, spread:0.04, ammo:6,  maxAmmo:36,  auto:false, pellets:1, reload:2000},
    smg:     {name:'SMG',      dmg:18,  rof:110,  spd:580, range:300, spread:0.12, ammo:25, maxAmmo:150, auto:true,  pellets:1, reload:1800},
    ar:      {name:'AR',       dmg:28,  rof:180,  spd:620, range:480, spread:0.07, ammo:30, maxAmmo:180, auto:true,  pellets:1, reload:2200},
    battlerifle:{name:'Battle Rifle',dmg:42,rof:280,spd:650,range:560,spread:0.05,ammo:20,maxAmmo:100,auto:false,pellets:1,reload:2400},
    shotgun: {name:'Shotgun',  dmg:16,  rof:900,  spd:480, range:200, spread:0.20, ammo:8,  maxAmmo:48,  auto:false, pellets:8, reload:600},
    sniper:  {name:'Sniper',   dmg:95,  rof:1800, spd:900, range:900, spread:0.01, ammo:5,  maxAmmo:30,  auto:false, pellets:1, reload:3000},
    grenade: {name:'Grenade',  dmg:120, rof:3000, spd:0,   range:0,   spread:0,    ammo:2,  maxAmmo:6,   auto:false, pellets:0, reload:0},
    molotov: {name:'Molotov',  dmg:8,   rof:4000, spd:0,   range:0,   spread:0,    ammo:2,  maxAmmo:4,   auto:false, pellets:0, reload:0},
    rpg:     {name:'RPG',      dmg:200, rof:5000, spd:260, range:800, spread:0.02, ammo:1,  maxAmmo:4,   auto:false, pellets:0, reload:4000},
  };

  // ── Runtime arrays ────────────────────────────────────────
  let bullets    = [];   // { x,y,vx,vy,dmg,range,dist,owner,tracer }
  let throwables = [];   // { x,y,vx,vy,vy3,z,type,timer,ownerId }
  let fires      = [];   // { x,y,r,life,maxLife }
  let explosions = [];   // { x,y,r,maxR,life,maxLife }
  let loot       = [];   // { x,y,type,key,ammo }
  let crates     = [];   // { x,y,open,lootLeft }
  let airdrop    = null; // { x,y,vx,vy,z,phase:'fly'|'fall'|'land' }
  let bots       = [];   // { id,x,y,angle,hp,weapon,ammo,state,target,reloadT,fireT }

  // ── Player loadout ────────────────────────────────────────
  let inventory  = [];            // weapon keys player is holding (max 2)
  let activeSlot = 0;
  let ammoCache  = {};            // { weaponKey: count }
  let lastFireT  = {}; // keyed by weaponKey so ROF doesn't bleed between weapons
  let reloading  = false;
  let reloadEnd  = 0;

  // ── Safe zone ─────────────────────────────────────────────
  const ZONE_PHASES = [
    {wait:60,  shrink:60,  toR:2400},
    {wait:60,  shrink:50,  toR:1600},
    {wait:50,  shrink:45,  toR:900},
    {wait:45,  shrink:40,  toR:480},
    {wait:40,  shrink:35,  toR:220},
    {wait:30,  shrink:30,  toR:80},
  ];
  const MAP_PX = MAP_W * TILE;
  let zone = {
    cx: MAP_PX/2, cy: MAP_PX/2,
    r:  MAP_PX*0.72,
    nextCx: MAP_PX/2, nextCy: MAP_PX/2, nextR: 2400,
    phase:0, timer:0, shrinking:false,
    dmgTick:0,
  };

  // ── Kill feed ─────────────────────────────────────────────
  let killFeed = [];   // { text, life }

  // ── Multiplayer ───────────────────────────────────────────
  let rlChannel  = null;
  let localId    = Math.random().toString(36).slice(2,9);
  let remotePlayers = {}; // id → { x,y,angle,hp }

  // ── Right aim joystick ────────────────────────────────────
  const aimJoy = { active:false, id:-1, sx:0, sy:0, cx:0, cy:0, dx:0, dy:0 };

  // ── Loot & crate spawning ────────────────────────────────
  const LOOT_POOL = ['pistol','smg','ar','shotgun','sniper','revolver','battlerifle','grenade','molotov','rpg'];
  const SUPPLY_POOL = ['armor_light','armor_heavy','medkit','ammo_box'];

  function spawnLoot() {
    loot = []; crates = [];
    const rng = seededRng(99);
    for (let i = 0; i < 140; i++) {
      const tx = 3 + rng()*(MAP_W-6), ty = 3 + rng()*(MAP_H-6);
      const tile = mapTiles[Math.floor(ty)][Math.floor(tx)];
      if (tile === T.WATER || tile === T.DEEP_WATER) continue;
      if (rng() < 0.25) {
        // supply item
        const key = SUPPLY_POOL[Math.floor(rng()*SUPPLY_POOL.length)];
        loot.push({ x:tx*TILE, y:ty*TILE, key, ammo:0, supply:true });
      } else {
        const key = LOOT_POOL[Math.floor(rng()*LOOT_POOL.length)];
        loot.push({ x:tx*TILE, y:ty*TILE, key, ammo: WEAPONS[key].ammo*2 });
      }
    }
    const pts = [[96,94],[105,93],[148,35],[22,144],[157,158],[70,30],[130,70]];
    for (const [tx,ty] of pts) crates.push({ x:tx*TILE, y:ty*TILE, open:false, lootLeft:3 });
  }

  function spawnBots() {
    bots = [];
    const rng = seededRng(55);
    const names = ['Alpha','Bravo','Charlie','Delta','Echo','Foxtrot','Ghost','Hawk'];
    for (let i = 0; i < 8; i++) {
      const tx = 20 + rng()*(MAP_W-40), ty = 20 + rng()*(MAP_H-40);
      const key = LOOT_POOL[Math.floor(rng()*5)]; // bots get basic weapons
      bots.push({
        id:'bot_'+i, name:names[i],
        x:tx*TILE, y:ty*TILE, angle:0,
        hp:100, maxHp:100,
        weapon:key, ammo: WEAPONS[key].ammo,
        state:'roam', target:null,
        fireT:0, reloadT:0,
        waypointX:tx*TILE, waypointY:ty*TILE,
        alive:true,
      });
    }
  }

  function initZone() {
    zone.r = MAP_PX * 0.72;
    zone.cx = MAP_PX/2; zone.cy = MAP_PX/2;
    zone.nextCx = MAP_PX/2; zone.nextCy = MAP_PX/2;
    zone.nextR = ZONE_PHASES[0].toR;
    zone.phase = 0; zone.timer = 0; zone.shrinking = false;
  }

  // ── Shooting ─────────────────────────────────────────────
  function tryFire(fromX, fromY, angle, weaponKey, ownerId) {
    const w = WEAPONS[weaponKey];
    if (!w) return;
    const now = performance.now();
    if (ownerId === localId) {
      if (reloading) return;
      if (now - (lastFireT[weaponKey]||0) < w.rof) return;
      if (!ammoCache[weaponKey] || ammoCache[weaponKey] <= 0) { startReload(); return; }
      ammoCache[weaponKey]--;
      lastFireT[weaponKey] = now;
      muzzleFlash = 3;
      const shakeMap={pistol:3,revolver:7,smg:2,ar:4,battlerifle:6,shotgun:9,sniper:12,rpg:0};
      addShake(shakeMap[weaponKey]||3);
    }
    if (w.pellets === 0) { throwItem(fromX, fromY, angle, weaponKey, ownerId); return; }
    for (let p = 0; p < w.pellets; p++) {
      const a = angle + (Math.random()-0.5)*w.spread;
      bullets.push({
        x:fromX, y:fromY,
        vx: Math.cos(a)*w.spd, vy: Math.sin(a)*w.spd,
        dmg:w.dmg, range:w.range, dist:0,
        owner:ownerId,
        tracer: weaponKey==='sniper',
      });
    }
  }

  function throwItem(fromX, fromY, angle, weaponKey, ownerId) {
    const spd = weaponKey==='rpg' ? 260 : 220;
    throwables.push({
      x:fromX, y:fromY,
      vx:Math.cos(angle)*spd, vy:Math.sin(angle)*spd,
      z:0, vz: weaponKey==='rpg' ? 0 : 120,
      type:weaponKey, timer:0, ownerId,
      armed: weaponKey==='rpg',
    });
  }

  function startReload() {
    if (reloading) return;
    const key = inventory[activeSlot];
    if (!key) return;
    reloading = true;
    reloadEnd = performance.now() + WEAPONS[key].reload;
  }

  function pickupLoot(item) {
    if (item.supply) {
      if (item.key==='medkit')       { player.health=Math.min(player.maxHealth,player.health+60); killFeed.push({text:'Medkit +60 HP',life:2}); }
      else if (item.key==='armor_light') { player.armor=Math.min(player.maxArmor,player.armor+50); killFeed.push({text:'Light Armor +50',life:2}); }
      else if (item.key==='armor_heavy') { player.armor=Math.min(player.maxArmor,player.armor+100); killFeed.push({text:'Heavy Armor +100',life:2}); }
      else if (item.key==='ammo_box') {
        for (const k of inventory) ammoCache[k]=(ammoCache[k]||0)+WEAPONS[k].ammo*3;
        killFeed.push({text:'Ammo Box',life:2});
      }
      return;
    }
    if (inventory.length < 2 && !inventory.includes(item.key)) {
      inventory.push(item.key);
      ammoCache[item.key] = (ammoCache[item.key]||0) + item.ammo;
    } else {
      ammoCache[item.key] = (ammoCache[item.key]||0) + item.ammo;
    }
  }

  // ── Right joystick (aim) ──────────────────────────────────
  function onAimTouchStart(t) {
    if (aimJoy.active) return;
    aimJoy.active=true; aimJoy.id=t.identifier;
    aimJoy.sx=aimJoy.cx=t.clientX; aimJoy.sy=aimJoy.cy=t.clientY;
    aimJoy.dx=0; aimJoy.dy=0;
    joyShow(aimJoy.sx,aimJoy.sy,aimJoy.cx,aimJoy.cy,'rl-aim-base','rl-aim-knob');
  }
  function onAimTouchMove(t) {
    if (!aimJoy.active||t.identifier!==aimJoy.id) return;
    aimJoy.cx=t.clientX; aimJoy.cy=t.clientY;
    const dx=aimJoy.cx-aimJoy.sx, dy=aimJoy.cy-aimJoy.sy;
    const len=Math.sqrt(dx*dx+dy*dy)||1, max=40;
    aimJoy.dx=dx/Math.max(len,max);
    aimJoy.dy=dy/Math.max(len,max);
    if (len>8) player.angle=Math.atan2(dy,dx);
    joyShow(aimJoy.sx,aimJoy.sy,
      aimJoy.sx+dx/Math.max(len/max,1),
      aimJoy.sy+dy/Math.max(len/max,1),
      'rl-aim-base','rl-aim-knob');
    // fire when aim stick pushed beyond threshold
    if (len>20) {
      const key = inventory[activeSlot];
      if (key && WEAPONS[key]) tryFire(player.x,player.y,player.angle,key,localId);
    }
  }
  function onAimTouchEnd(t) {
    if (!aimJoy.active||t.identifier!==aimJoy.id) return;
    aimJoy.active=false; aimJoy.dx=0; aimJoy.dy=0;
    joyHide('rl-aim-base','rl-aim-knob');
  }

  // ── Physics updates ───────────────────────────────────────
  function updateBullets(dt) {
    for (let i = bullets.length-1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx*dt; b.y += b.vy*dt;
      b.dist += Math.sqrt(b.vx*b.vx+b.vy*b.vy)*dt;
      if (b.dist > b.range || b.x<0||b.x>MAP_PX||b.y<0||b.y>MAP_PX) {
        bullets.splice(i,1); continue;
      }
      // Hit player
      if (b.owner !== localId) {
        const dx=b.x-player.x, dy=b.y-player.y;
        if (Math.sqrt(dx*dx+dy*dy) < PLAYER_R+4) {
          applyDamageToPlayer(b.dmg);
          addShake(6); spawnDmgNum(player.x, player.y-20, b.dmg, '#ff4444');
          bullets.splice(i,1); continue;
        }
      }
      // Hit bots
      for (let j=bots.length-1; j>=0; j--) {
        const bt=bots[j]; if (!bt.alive) continue;
        const dx=b.x-bt.x, dy=b.y-bt.y;
        if (Math.sqrt(dx*dx+dy*dy) < PLAYER_R+4) {
          bt.hp -= b.dmg;
          hitMarker = 6;
          spawnDmgNum(bt.x, bt.y-20, b.dmg, bt.hp<=0?'#ff0':'#fff');
          if (bt.hp <= 0) {
            bt.alive=false; player.kills++;
            killFeed.push({text:`You killed ${bt.name}`,life:4});
          }
          bullets.splice(i,1); break;
        }
      }
    }
  }

  function updateThrowables(dt) {
    for (let i=throwables.length-1; i>=0; i--) {
      const t=throwables[i];
      t.x += t.vx*dt; t.y += t.vy*dt;
      t.z = Math.max(0, t.z + t.vz*dt);
      t.vz -= 280*dt; // gravity
      t.timer += dt;
      // Friction (not for RPG — it maintains constant velocity)
      if (t.type !== 'rpg') { t.vx *= 0.92; t.vy *= 0.92; }
      if (t.type==='rpg') {
        // RPG keeps moving, explodes on hit or range
        const d2 = (t.x-player.x)**2+(t.y-player.y)**2;
        if (t.timer>0.3 && d2<(PLAYER_R+8)**2 && t.ownerId!==localId) {
          doExplosion(t.x,t.y,160,200); throwables.splice(i,1); continue;
        }
        if (t.timer>4) { doExplosion(t.x,t.y,160,200); throwables.splice(i,1); continue; }
      } else if (t.z <= 0) {
        if (t.type==='grenade') { doExplosion(t.x,t.y,120,120); throwables.splice(i,1); }
        else if (t.type==='molotov') { fires.push({x:t.x,y:t.y,r:55,life:8,maxLife:8}); throwables.splice(i,1); }
        else throwables.splice(i,1);
      }
    }
  }

  function doExplosion(x,y,r,dmg) {
    explosions.push({x,y,r:10,maxR:r,life:0.55,maxLife:0.55});
    const d2=(x-player.x)**2+(y-player.y)**2;
    if (d2<r*r) { applyDamageToPlayer(dmg*Math.max(0,1-Math.sqrt(d2)/r)); addShake(18); }
    for (const bt of bots) {
      if (!bt.alive) continue;
      const bd2=(x-bt.x)**2+(y-bt.y)**2;
      if (bd2<r*r) bt.hp=Math.max(0,bt.hp-dmg*Math.max(0,1-Math.sqrt(bd2)/r));
    }
  }

  function updateFires(dt) {
    for (let i=fires.length-1; i>=0; i--) {
      const f=fires[i]; f.life -= dt;
      if (f.life<=0) { fires.splice(i,1); continue; }
      const d2=(f.x-player.x)**2+(f.y-player.y)**2;
      if (d2<f.r*f.r) applyDamageToPlayer(8*dt);
    }
  }

  function updateExplosions(dt) {
    for (let i=explosions.length-1; i>=0; i--) {
      const e=explosions[i]; e.life-=dt;
      e.r = e.maxR*(1-e.life/e.maxLife);
      if (e.life<=0) explosions.splice(i,1);
    }
  }

  function updateZone(dt) {
    if (zone.phase >= ZONE_PHASES.length) return;
    zone.timer += dt;
    const ph = ZONE_PHASES[zone.phase];
    if (!zone.shrinking) {
      if (zone.timer >= ph.wait) { zone.shrinking=true; zone.timer=0; }
    } else {
      const t = Math.min(zone.timer/ph.shrink, 1);
      zone.cx = lerp(zone.cx, zone.nextCx, t);
      zone.cy = lerp(zone.cy, zone.nextCy, t);
      zone.r  = lerp(zone.r,  zone.nextR,  t);
      if (zone.timer >= ph.shrink) {
        zone.shrinking=false; zone.timer=0; zone.phase++;
        if (zone.phase < ZONE_PHASES.length) {
          zone.nextR  = ZONE_PHASES[zone.phase].toR;
          const rng=seededRng(zone.phase*17+33);
          const off = zone.r*0.25;
          zone.nextCx = MAP_PX/2+(rng()-0.5)*off;
          zone.nextCy = MAP_PX/2+(rng()-0.5)*off;
        }
      }
    }
    // Out-of-zone damage
    zone.dmgTick += dt;
    if (zone.dmgTick >= 0.5) {
      zone.dmgTick = 0;
      const d=Math.sqrt((player.x-zone.cx)**2+(player.y-zone.cy)**2);
      if (d > zone.r) applyDamageToPlayer(4*(1+zone.phase*0.5));
    }
  }

  function lerp(a,b,t) { return a+(b-a)*t; }

  function updateAirdrop(dt) {
    if (!airdrop) return;
    if (airdrop.phase==='fly') {
      airdrop.x += airdrop.vx*dt;
      if (airdrop.x > MAP_PX+200) { airdrop=null; return; }
      if (Math.abs(airdrop.x-MAP_PX/2)<60) airdrop.phase='fall';
    } else if (airdrop.phase==='fall') {
      airdrop.z = Math.max(0, airdrop.z - 80*dt);
      if (airdrop.z<=0) {
        crates.push({x:airdrop.x,y:airdrop.y,open:false,lootLeft:5,airdrop:true});
        killFeed.push({text:'Airdrop landed!',life:5});
        airdrop = null; // done — crate handles it from here
      }
    }
  }

  function updateKillFeed(dt) {
    for (let i=killFeed.length-1;i>=0;i--) {
      killFeed[i].life-=dt;
      if (killFeed[i].life<=0) killFeed.splice(i,1);
    }
  }

  function updatePickups() {
    for (let i=loot.length-1;i>=0;i--) {
      const it=loot[i];
      const dx=player.x-it.x, dy=player.y-it.y;
      if (Math.sqrt(dx*dx+dy*dy)<30) { pickupLoot(it); loot.splice(i,1); }
    }
    for (const cr of crates) {
      if (cr.open) continue;
      const dx=player.x-cr.x, dy=player.y-cr.y;
      if (Math.sqrt(dx*dx+dy*dy)<40 && keys['KeyF']) {
        cr.open=true;
        for (let i=0;i<cr.lootLeft;i++) {
          const key=LOOT_POOL[Math.floor(Math.random()*LOOT_POOL.length)];
          loot.push({x:cr.x+(Math.random()-0.5)*60,y:cr.y+(Math.random()-0.5)*60,key,ammo:WEAPONS[key].ammo});
        }
      }
    }
  }

  function updateReload() {
    if (reloading && performance.now() >= reloadEnd) {
      reloading=false;
      const key=inventory[activeSlot];
      if (key) ammoCache[key]=Math.min((ammoCache[key]||0)+WEAPONS[key].ammo, WEAPONS[key].maxAmmo);
    }
  }

  // ── Render: world effects ─────────────────────────────────
  function drawLoot() {
    const ICONS = {pistol:'🔫',smg:'🔫',ar:'🔫',shotgun:'🔫',sniper:'🔫',revolver:'🔫',battlerifle:'🔫',grenade:'💣',molotov:'🍾',rpg:'🚀',medkit:'💊',armor_light:'🦺',armor_heavy:'🛡️',ammo_box:'📦'};
    for (const it of loot) {
      ctx.fillStyle='rgba(255,220,0,0.18)';
      ctx.beginPath(); ctx.arc(it.x,it.y,16,0,Math.PI*2); ctx.fill();
      ctx.font='16px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(ICONS[it.key]||'?', it.x, it.y);
    }
    ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  }

  function drawCrates() {
    for (const cr of crates) {
      ctx.fillStyle = cr.open ? '#6b5030' : (cr.airdrop ? '#5a8b3d' : '#8b6030');
      ctx.fillRect(cr.x-16,cr.y-16,32,32);
      ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=2;
      ctx.strokeRect(cr.x-16,cr.y-16,32,32);
      if (!cr.open) {
        ctx.fillStyle='rgba(255,255,255,0.6)';
        ctx.fillRect(cr.x-1,cr.y-16,2,32); ctx.fillRect(cr.x-16,cr.y-1,32,2);
      }
    }
  }

  function drawBullets() {
    for (const b of bullets) {
      if (b.tracer) {
        ctx.strokeStyle='rgba(255,255,180,0.85)'; ctx.lineWidth=2;
        ctx.beginPath();
        ctx.moveTo(b.x-b.vx*0.04, b.y-b.vy*0.04);
        ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.fillStyle='rgba(255,240,100,0.9)';
      ctx.beginPath(); ctx.arc(b.x,b.y,b.tracer?3:2,0,Math.PI*2); ctx.fill();
    }
  }

  function drawThrowables() {
    for (const t of throwables) {
      const s = 1 + (t.z/200)*0.6;
      ctx.save(); ctx.translate(t.x,t.y); ctx.scale(s,s);
      ctx.font='16px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      const icons={grenade:'💣',molotov:'🍾',rpg:'🚀'};
      ctx.fillText(icons[t.type]||'●',0,0);
      ctx.restore();
    }
    ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  }

  function drawFires() {
    for (const f of fires) {
      const alpha = Math.min(1, f.life/f.maxLife);
      for (let i=0;i<3;i++) {
        const g=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r*(0.6+i*0.2));
        g.addColorStop(0,`rgba(255,200,0,${alpha*0.6})`);
        g.addColorStop(0.5,`rgba(255,60,0,${alpha*0.4})`);
        g.addColorStop(1,`rgba(100,0,0,0)`);
        ctx.fillStyle=g;
        ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,Math.PI*2); ctx.fill();
      }
    }
  }

  function drawExplosions() {
    for (const e of explosions) {
      const p=1-e.life/e.maxLife;
      const g=ctx.createRadialGradient(e.x,e.y,0,e.x,e.y,e.r);
      g.addColorStop(0,`rgba(255,255,200,${(1-p)*0.9})`);
      g.addColorStop(0.4,`rgba(255,120,0,${(1-p)*0.7})`);
      g.addColorStop(1,'rgba(80,20,0,0)');
      ctx.fillStyle=g;
      ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,Math.PI*2); ctx.fill();
    }
  }

  function drawZone() {
    ctx.save();
    // Fill entire world with blue haze, then punch out the safe circle
    ctx.fillStyle='rgba(0,80,200,0.20)';
    ctx.fillRect(-MAP_PX, -MAP_PX, MAP_PX*3, MAP_PX*3);
    ctx.globalCompositeOperation='destination-out';
    ctx.beginPath(); ctx.arc(zone.cx,zone.cy,zone.r,0,Math.PI*2); ctx.fill();
    ctx.restore();
    // Zone ring
    ctx.strokeStyle='rgba(0,160,255,0.85)'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(zone.cx,zone.cy,zone.r,0,Math.PI*2); ctx.stroke();
    // Next zone ring (dashed yellow)
    if (zone.phase < ZONE_PHASES.length) {
      ctx.strokeStyle='rgba(255,255,0,0.50)'; ctx.lineWidth=1.5;
      ctx.setLineDash([12,8]);
      ctx.beginPath(); ctx.arc(zone.nextCx,zone.nextCy,zone.nextR,0,Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawBots() {
    for (const bt of bots) {
      if (!bt.alive) continue;
      ctx.save(); ctx.translate(bt.x,bt.y); ctx.rotate(bt.angle-Math.PI/2);
      ctx.fillStyle='#8b2020'; // enemy red
      ctx.beginPath(); ctx.ellipse(0,2,7,9,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#c87050';
      ctx.beginPath(); ctx.arc(0,-8,5.5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#2a2a2a'; ctx.fillRect(-2,-18,4,14);
      ctx.restore();
      // HP bar above bot
      ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(bt.x-18,bt.y-28,36,6);
      ctx.fillStyle='#c00'; ctx.fillRect(bt.x-18,bt.y-28,36,6);
      ctx.fillStyle='#0c0'; ctx.fillRect(bt.x-18,bt.y-28,(bt.hp/bt.maxHp)*36,6);
    }
  }

  function drawAirdrop() {
    if (!airdrop) return;
    const { x, y, z, phase } = airdrop;
    ctx.save();
    // Plane silhouette
    if (phase==='fly') {
      ctx.fillStyle='rgba(180,180,180,0.9)';
      ctx.save(); ctx.translate(x,y-z);
      ctx.beginPath();
      ctx.moveTo(-30,0); ctx.lineTo(30,0); ctx.lineTo(20,8);
      ctx.lineTo(-20,8); ctx.closePath(); ctx.fill();
      // Wings
      ctx.fillRect(-8,-12,16,24);
      ctx.restore();
    } else if (phase==='fall') {
      // Parachute
      ctx.strokeStyle='rgba(255,200,0,0.9)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(x,y-z-30,25,Math.PI,Math.PI*2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x-25,y-z-30); ctx.lineTo(x,y-z);
      ctx.moveTo(x+25,y-z-30); ctx.lineTo(x,y-z); ctx.stroke();
      ctx.fillStyle='#5a8b3d';
      ctx.fillRect(x-12,y-z-8,24,16);
    }
    ctx.restore();
  }

  // ── Remote players ────────────────────────────────────────
  function drawRemotePlayer(rp) {
    ctx.save(); ctx.translate(rp.x,rp.y); ctx.rotate((rp.angle||0)-Math.PI/2);
    ctx.fillStyle='#4a8b2a';  // friendly green
    ctx.beginPath(); ctx.ellipse(0,2,7,9,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#c8a070';
    ctx.beginPath(); ctx.arc(0,-8,5.5,0,Math.PI*2); ctx.fill();
    ctx.restore();
    // name tag
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(rp.x-20,rp.y-32,40,12);
    ctx.fillStyle='#7eff7e'; ctx.font='9px monospace'; ctx.textAlign='center';
    ctx.fillText(rp.name||'Player', rp.x, rp.y-22); ctx.textAlign='left';
  }

  // ── Supabase multiplayer ──────────────────────────────────
  let broadcastThrottle=0;

  function initMultiplayer() {
    if (!window.sb) return;
    try {
      rlChannel = sb.channel('royale-room', {config:{broadcast:{self:false}}});
      rlChannel.on('broadcast',{event:'state'},(msg)=>{
        const d=msg.payload;
        if (!d||d.id===localId) return;
        remotePlayers[d.id]={ x:d.x, y:d.y, angle:d.angle, hp:d.hp, name:d.name };
      });
      rlChannel.on('broadcast',{event:'hit'},(msg)=>{
        const d=msg.payload;
        if (d&&d.target===localId) {
          applyDamageToPlayer(d.dmg);
          if (player.health<=0) killFeed.push({text:'You were eliminated!',life:999});
        }
      });
      rlChannel.subscribe();
    } catch(e) { console.warn('Royale multiplayer unavailable',e); }
  }

  function broadcastState() {
    const now=performance.now();
    if (now-broadcastThrottle<80||!rlChannel) return;
    broadcastThrottle=now;
    const name=window.currentUser?.username||'Player';
    rlChannel.send({type:'broadcast',event:'state',
      payload:{id:localId,x:Math.round(player.x),y:Math.round(player.y),
               angle:+player.angle.toFixed(2),hp:player.health,name}
    }).catch(()=>{});
  }

  function destroyMultiplayer() {
    if (rlChannel) { try { rlChannel.unsubscribe(); } catch(_){} rlChannel=null; }
    remotePlayers={};
  }

  // ── Schedule airdrop ─────────────────────────────────────
  let airdropTimer=0;
  function tickAirdropSpawn(dt) {
    if (airdrop) return;
    airdropTimer+=dt;
    if (airdropTimer>180) { // every 3 min
      airdropTimer=0;
      airdrop={x:-200, y:MAP_PX/2+(Math.random()-0.5)*MAP_PX*0.3,
               vx:140, vy:0, z:300, phase:'fly'};
      killFeed.push({text:'Airdrop incoming!',life:5});
    }
  }

  // ── Parachute update ─────────────────────────────────────
  function updateParachute(dt) {
    if (paraLanded) return;

    // Plane advances east
    paraPlane.x += paraPlane.speed * dt;
    player.x = paraPlane.x;
    player.y = PLANE_Y;
    cam.x += (player.x - cam.x) * 4 * dt;
    cam.y += (player.y - cam.y) * 4 * dt;

    if (!paraDeployed) {
      // Tap space / touch right half to deploy chute
      paraZ = Math.max(0, paraZ - 320 * dt); // free-fall
      if (paraZ <= 0) paraDeployed = true;   // auto-deploy at ground
    } else {
      // Glide down
      paraVZ = Math.min(paraVZ + 60 * dt, 80);
      paraZ  = Math.max(0, paraZ - paraVZ * dt);

      // Left joystick / WASD steers horizontally while gliding
      let mx=0, my=0;
      if (keys['KeyW']||keys['ArrowUp'])   my-=1;
      if (keys['KeyS']||keys['ArrowDown']) my+=1;
      if (keys['KeyA']||keys['ArrowLeft']) mx-=1;
      if (keys['KeyD']||keys['ArrowRight'])mx+=1;
      if (joy.active){mx+=joy.dx;my+=joy.dy;}
      const len=Math.sqrt(mx*mx+my*my)||1;
      player.x = Math.max(PLAYER_R, Math.min(MAP_PX-PLAYER_R, player.x + (mx/Math.max(len,1))*90*dt));
      player.y = Math.max(PLAYER_R, Math.min(MAP_PX-PLAYER_R, player.y + (my/Math.max(len,1))*90*dt));
      cam.x += (player.x - cam.x) * 6 * dt;
      cam.y += (player.y - cam.y) * 6 * dt;

      if (paraZ <= 0) {
        paraLanded  = true;
        gamePhase   = 'playing';
        stance      = 'stand';
        killFeed.push({text:'Dropped in! Find weapons!', life:4});
      }
    }
  }

  // ── Damage helper ─────────────────────────────────────────
  function applyDamageToPlayer(rawDmg) {
    if (!player.alive) return;
    let dmg = rawDmg;
    if (player.armor > 0) {
      const absorbed = Math.min(dmg * 0.55, player.armor);
      player.armor = Math.max(0, player.armor - absorbed);
      dmg -= absorbed;
    }
    player.health = Math.max(0, player.health - dmg);
    if (player.health <= 0) {
      player.alive = false;
      gamePhase = 'dead';
      killFeed.push({text:'You were eliminated!', life:999});
    }
  }

  // ── Screen shake ─────────────────────────────────────────
  function addShake(amt) { shakeAmt = Math.max(shakeAmt, amt); }

  function updateShake(dt) {
    if (shakeAmt > 0) {
      shakeAmt = Math.max(0, shakeAmt - shakeAmt * 12 * dt);
      shakeX = (Math.random()-0.5)*shakeAmt;
      shakeY = (Math.random()-0.5)*shakeAmt;
    } else { shakeX=0; shakeY=0; }
  }

  // ── Floating damage numbers ───────────────────────────────
  function spawnDmgNum(wx, wy, val, col) {
    dmgNumbers.push({ x:wx, y:wy, val:Math.ceil(val), life:1.2, maxLife:1.2, col:col||'#ff4444' });
  }

  function updateDmgNumbers(dt) {
    for (let i=dmgNumbers.length-1;i>=0;i--) {
      const d=dmgNumbers[i]; d.y-=28*dt; d.life-=dt;
      if (d.life<=0) dmgNumbers.splice(i,1);
    }
  }

  function drawDmgNumbers() {
    for (const d of dmgNumbers) {
      const alpha=Math.min(1,d.life/d.maxLife);
      ctx.globalAlpha=alpha;
      ctx.fillStyle=d.col;
      ctx.font=`bold ${14+Math.round((1-d.life/d.maxLife)*6)}px monospace`;
      ctx.textAlign='center';
      ctx.fillText(d.val, d.x, d.y);
    }
    ctx.globalAlpha=1; ctx.textAlign='left';
  }

  // ── Muzzle flash ─────────────────────────────────────────
  function drawMuzzleFlash() {
    if (muzzleFlash <= 0) return;
    muzzleFlash--;
    const barrelDist = 22;
    const fx = player.x + Math.cos(player.angle)*barrelDist;
    const fy = player.y + Math.sin(player.angle)*barrelDist;
    const g = ctx.createRadialGradient(fx,fy,0,fx,fy,16);
    g.addColorStop(0,'rgba(255,255,180,0.95)');
    g.addColorStop(0.4,'rgba(255,140,0,0.7)');
    g.addColorStop(1,'rgba(255,60,0,0)');
    ctx.fillStyle=g;
    ctx.beginPath(); ctx.arc(fx,fy,16,0,Math.PI*2); ctx.fill();
  }

  // ── Win / death detection ────────────────────────────────
  function checkEndCondition() {
    if (gamePhase !== 'playing') return;
    const aliveCount = bots.filter(b=>b.alive).length + Object.keys(remotePlayers).length;
    if (aliveCount === 0 && player.alive) {
      gamePhase = 'win'; gameEndTimer = 0;
      killFeed.push({text:'VICTORY ROYALE!', life:999});
    }
  }

  // ── End screen ────────────────────────────────────────────
  function drawEndScreen() {
    if (gamePhase === 'playing') return;
    const alpha = Math.min(1, gameEndTimer / 1.2);
    ctx.fillStyle = `rgba(0,0,0,${alpha*0.78})`;
    ctx.fillRect(0,0,canvasW,canvasH);
    if (alpha < 0.3) return;

    const cx=canvasW/2, cy=canvasH/2;
    if (gamePhase === 'win') {
      ctx.fillStyle=`rgba(255,220,0,${alpha})`;
      ctx.font=`bold ${Math.round(canvasH*0.1)}px monospace`;
      ctx.textAlign='center';
      ctx.fillText('VICTORY ROYALE', cx, cy-40);
      ctx.fillStyle=`rgba(255,255,255,${alpha})`;
      ctx.font=`bold 22px monospace`;
      ctx.fillText(`Kills: ${player.kills}`, cx, cy+10);
    } else {
      ctx.fillStyle=`rgba(220,60,60,${alpha})`;
      ctx.font=`bold ${Math.round(canvasH*0.09)}px monospace`;
      ctx.textAlign='center';
      ctx.fillText('ELIMINATED', cx, cy-40);
      ctx.fillStyle=`rgba(255,255,255,${alpha})`;
      ctx.font='bold 18px monospace';
      ctx.fillText(`Kills: ${player.kills}`, cx, cy+10);
    }

    // Scoreboard
    const sorted = bots.slice().sort((a,b)=>(!a.alive?1:0)-(!b.alive?1:0));
    ctx.font='12px monospace'; ctx.fillStyle=`rgba(200,200,200,${alpha})`;
    let row=cy+50;
    ctx.fillText('NAME            HP', cx, row); row+=18;
    ctx.fillText('─────────────────────', cx, row); row+=18;
    for (const b of sorted.slice(0,8)) {
      const hp = b.alive ? b.hp : 0;
      ctx.fillStyle = b.alive ? `rgba(150,255,150,${alpha})` : `rgba(180,180,180,${alpha*0.6})`;
      ctx.fillText(`${(b.name||'Bot').padEnd(16)} ${hp}`, cx, row); row+=16;
    }

    ctx.fillStyle=`rgba(255,255,255,${alpha*0.7})`;
    ctx.font='13px monospace';
    ctx.fillText('Tap / press any key to exit', cx, row+24);
    ctx.textAlign='left';
  }

  // ── Dynamic crosshair ────────────────────────────────────
  function drawCrosshair() {
    if (gamePhase !== 'playing') return;
    const wkey = inventory[activeSlot];
    const spread = wkey ? (WEAPONS[wkey].spread * 180 * STANCE_SPREAD[stance]) : 20;
    const size   = Math.max(10, Math.min(60, spread * 12));
    const cx=canvasW/2, cy=canvasH/2;
    const col = hitMarker>0 ? 'rgba(255,60,60,0.9)' : 'rgba(255,255,255,0.85)';
    if (hitMarker>0) hitMarker--;

    ctx.strokeStyle=col; ctx.lineWidth=1.5;
    ctx.beginPath();
    // Top
    ctx.moveTo(cx,cy-size-4); ctx.lineTo(cx,cy-size+8);
    // Bottom
    ctx.moveTo(cx,cy+size+4); ctx.lineTo(cx,cy+size-8);
    // Left
    ctx.moveTo(cx-size-4,cy); ctx.lineTo(cx-size+8,cy);
    // Right
    ctx.moveTo(cx+size+4,cy); ctx.lineTo(cx+size-8,cy);
    ctx.stroke();
    // Center dot
    ctx.fillStyle=col;
    ctx.beginPath(); ctx.arc(cx,cy,1.8,0,Math.PI*2); ctx.fill();
  }

  // ── Spectate camera ───────────────────────────────────────
  function updateSpectate(dt) {
    if (gamePhase!=='dead') return;
    const alive = bots.filter(b=>b.alive);
    if (!spectateTarget || !spectateTarget.alive) {
      spectateTarget = alive.length ? alive[Math.floor(Math.random()*alive.length)] : null;
    }
    if (spectateTarget) {
      spectateCam.x += (spectateTarget.x - spectateCam.x) * 3 * dt;
      spectateCam.y += (spectateTarget.y - spectateCam.y) * 3 * dt;
    }
  }

  function drawSpectateTag() {
    if (gamePhase!=='dead'||!spectateTarget) return;
    ctx.fillStyle='rgba(0,0,0,0.5)';
    ctx.fillRect(canvasW/2-80, canvasH-44, 160, 26);
    ctx.fillStyle='rgba(255,200,0,0.9)';
    ctx.font='bold 12px monospace'; ctx.textAlign='center';
    ctx.fillText(`SPECTATING: ${spectateTarget.name}`, canvasW/2, canvasH-26);
    ctx.textAlign='left';
  }

  // ── Mouse aim + click-to-fire (desktop) ──────────────────
  function onMouseMove(e) {
    if (gamePhase !== 'playing') return;
    const rect=canvas.getBoundingClientRect();
    const mx=(e.clientX-rect.left)*(canvas.width/rect.width);
    const my=(e.clientY-rect.top)*(canvas.height/rect.height);
    player.angle=Math.atan2(my-canvasH/2, mx-canvasW/2);
  }

  function onMouseDown(e) {
    if (gamePhase !== 'playing') return;
    if (e.button!==0) return;
    const key=inventory[activeSlot];
    if (key) tryFire(player.x,player.y,player.angle,key,localId);
  }

  function onAnyKeyForExit(e) {
    if (gamePhase==='dead'||gamePhase==='win') {
      if (gameEndTimer>1.5) goToPage('first');
    }
  }

  // ── Advanced bot AI: zone-flee + loot-seek ────────────────
  function updateBotsAdvanced(dt) {
    const now=performance.now();
    for (const bt of bots) {
      if (!bt.alive) continue;

      // Zone flee — move toward zone center if outside
      const dz=Math.sqrt((bt.x-zone.cx)**2+(bt.y-zone.cy)**2);
      if (dz > zone.r*0.85) {
        const az=Math.atan2(zone.cy-bt.y, zone.cx-bt.x);
        bt.x+=Math.cos(az)*160*dt; bt.y+=Math.sin(az)*160*dt;
        bt.angle=az;
        bt.x=Math.max(PLAYER_R,Math.min(MAP_PX-PLAYER_R,bt.x));
        bt.y=Math.max(PLAYER_R,Math.min(MAP_PX-PLAYER_R,bt.y));
        continue;
      }

      // Loot-seek if unarmed or low ammo
      if (!bt.weapon || bt.ammo<=0) {
        let closest=null, cdist=Infinity;
        for (const it of loot) {
          if (it.supply) continue;
          const d=Math.sqrt((it.x-bt.x)**2+(it.y-bt.y)**2);
          if (d<cdist){cdist=d;closest=it;}
        }
        if (closest && cdist<400) {
          const al=Math.atan2(closest.y-bt.y,closest.x-bt.x);
          bt.x+=Math.cos(al)*130*dt; bt.y+=Math.sin(al)*130*dt; bt.angle=al;
          if (cdist<30) { bt.weapon=closest.key; bt.ammo=WEAPONS[closest.key].ammo; loot.splice(loot.indexOf(closest),1); }
          continue;
        }
      }

      const dx=player.x-bt.x, dy=player.y-bt.y;
      const distToPlayer=Math.sqrt(dx*dx+dy*dy);
      if (distToPlayer<350) bt.state='chase'; else if (distToPlayer>550) bt.state='roam';

      if (bt.state==='chase') {
        bt.angle=Math.atan2(dy,dx);
        bt.x+=Math.cos(bt.angle)*125*dt; bt.y+=Math.sin(bt.angle)*125*dt;
        if (distToPlayer<320 && bt.ammo>0 && now>bt.fireT) {
          tryFire(bt.x,bt.y,bt.angle+(Math.random()-0.5)*0.14,bt.weapon||'pistol',bt.id);
          bt.ammo=Math.max(0,bt.ammo-1);
          bt.fireT=now+(WEAPONS[bt.weapon||'pistol'].rof)*1.6;
        }
      } else {
        const wx=bt.waypointX-bt.x, wy=bt.waypointY-bt.y;
        const wd=Math.sqrt(wx*wx+wy*wy);
        if (wd<20) {
          const rng=seededRng(now*0.001+(bt.id.charCodeAt(4)||0));
          bt.waypointX=(20+rng()*(MAP_W-40))*TILE;
          bt.waypointY=(20+rng()*(MAP_H-40))*TILE;
        } else {
          bt.angle=Math.atan2(wy,wx);
          bt.x+=Math.cos(bt.angle)*85*dt; bt.y+=Math.sin(bt.angle)*85*dt;
        }
      }
      bt.x=Math.max(PLAYER_R,Math.min(MAP_PX-PLAYER_R,bt.x));
      bt.y=Math.max(PLAYER_R,Math.min(MAP_PX-PLAYER_R,bt.y));

      const zd=Math.sqrt((bt.x-zone.cx)**2+(bt.y-zone.cy)**2);
      if (zd>zone.r) bt.hp=Math.max(0,bt.hp-4*dt);
      if (bt.hp<=0) {
        bt.alive=false; player.kills++;
        killFeed.push({text:`You killed ${bt.name}`,life:4});
      }
    }
  }

  // ── Public API ────────────────────────────────────────────
  return { init, destroy };
})();
