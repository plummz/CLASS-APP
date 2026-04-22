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
    prepareBuildingInteriors();

    generateTrees();
    generateBoulders();
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

  const BUILDING_TYPES = ['house','apartment','warehouse','office','industrial'];

  function prepareBuildingInteriors() {
    interiorProps = [];
    BUILDINGS.forEach((b, idx) => {
      const type = BUILDING_TYPES[idx % BUILDING_TYPES.length];
      const floors = (b.tw >= 9 && b.th >= 7) ? 2 : 1;
      const hasRoof = floors > 1 || type === 'warehouse' || type === 'industrial';
      b.kind = type;
      b.floors = floors;
      b.hasRoof = hasRoof;
      b.door = { side: 'south', x: b.tx + Math.floor(b.tw / 2), y: b.ty + b.th };
      b.rooms = makeBuildingRooms(b);
      b.cover = makeBuildingCover(b, idx);
      for (const c of b.cover) interiorProps.push(c);
    });
  }

  function makeBuildingRooms(b) {
    const rooms = [];
    const x = b.tx * TILE, y = b.ty * TILE, w = b.tw * TILE, h = b.th * TILE;
    const midX = x + w * 0.5;
    const midY = y + h * 0.5;
    if (b.tw >= 9) rooms.push({ x: midX, y: y + 14, w: 3, h: h - 28, orient: 'v', gapY: midY });
    if (b.th >= 7) rooms.push({ x: x + 14, y: midY, w: w - 28, h: 3, orient: 'h', gapX: midX });
    if (b.floors > 1) rooms.push({ stairs: true, x: x + w - 36, y: y + 22, w: 22, h: 42 });
    return rooms;
  }

  function makeBuildingCover(b, seed) {
    const rng = seededRng(seed * 91 + 13);
    const list = [];
    const x = b.tx * TILE, y = b.ty * TILE, w = b.tw * TILE, h = b.th * TILE;
    const count = Math.max(3, Math.min(8, Math.floor((b.tw * b.th) / 12)));
    const types = b.kind === 'warehouse'
      ? ['crate','crate','shelf','barrier']
      : b.kind === 'office'
        ? ['desk','shelf','cabinet','barrier']
        : ['table','sofa','cabinet','crate'];
    for (let i = 0; i < count; i++) {
      const px = x + 24 + rng() * Math.max(1, w - 48);
      const py = y + 24 + rng() * Math.max(1, h - 52);
      const type = types[Math.floor(rng() * types.length)];
      const wide = type === 'sofa' || type === 'shelf' || type === 'barrier';
      list.push({
        x: px,
        y: py,
        w: wide ? 34 + rng() * 16 : 22 + rng() * 10,
        h: wide ? 14 + rng() * 10 : 20 + rng() * 10,
        type,
        building: seed,
        solid: true,
        lootSpot: i % 2 === 0,
      });
    }
    if (b.floors > 1) {
      list.push({ x: x + w - 28, y: y + 42, w: 28, h: 42, type:'stairs', building: seed, solid:false, lootSpot:true });
    }
    return list;
  }

  // ── Trees ─────────────────────────────────────────────────
  // { x, y — world px; r — canopy radius px; type: 'oak'|'pine'|'bush' }
  let trees = [];

  // ── Boulders ──────────────────────────────────────────────
  let boulders = [];
  let interiorProps = [];

  // ── Blood splatters ───────────────────────────────────────
  let bloodSplatters = [];

  // ── Trail particles ───────────────────────────────────────
  let trailParticles = [];

  // ── Animated water time ───────────────────────────────────
  let gameTime = 0;

  // ── Active throwable type ─────────────────────────────────
  let activeThrowable = 'grenade';

  // ── End screen button rects ───────────────────────────────
  let endBtnPlay = null, endBtnQuit = null;

  // ── Skin menu state ───────────────────────────────────────
  let skinBtnPlay = null, skinTabRects = [], skinItemRects = [];

  // ── Skin & Coin system ────────────────────────────────────
  const COIN_KEY = 'rl_coins_v1';
  const SKIN_KEY = 'rl_skin_v1';
  let coins = parseInt(localStorage.getItem(COIN_KEY)||'150', 10);
  let playerSkin = JSON.parse(localStorage.getItem(SKIN_KEY)||'{"head":"default","body":"gray","pants":"dark","trail":"none"}');
  function saveCoins() { try { localStorage.setItem(COIN_KEY, String(coins)); } catch(_){} }
  function saveSkin()  { try { localStorage.setItem(SKIN_KEY, JSON.stringify(playerSkin)); } catch(_){} }

  const HEADS = [
    {id:'default',name:'Default',price:0,color:'#c8a070'},
    {id:'chicken', name:'Chicken',price:150,color:'#f5c842',beak:true},
    {id:'zombie',  name:'Zombie', price:200,color:'#7aaa6a',eyes:'red'},
    {id:'skull',   name:'Skull',  price:250,color:'#e8e8e8',eyes:'black'},
    {id:'ninja',   name:'Ninja',  price:300,color:'#2a2a2a',mask:true},
    {id:'crown',   name:'Crown',  price:500,color:'#c8a070',crown:true},
  ];
  const BODIES = [
    {id:'gray',  name:'Gray',  price:0,   color:'#6a7a8a'},
    {id:'red',   name:'Red',   price:100, color:'#c83030'},
    {id:'blue',  name:'Blue',  price:100, color:'#3060c0'},
    {id:'green', name:'Green', price:100, color:'#308050'},
    {id:'gold',  name:'Gold',  price:300, color:'#c89820'},
    {id:'camo',  name:'Camo',  price:250, color:'#4a6a3a'},
  ];
  const PANTS = [
    {id:'dark',  name:'Dark',  price:0,  color:'#2a2a3a'},
    {id:'tan',   name:'Tan',   price:50, color:'#8a7a5a'},
    {id:'black', name:'Black', price:80, color:'#151515'},
    {id:'camo',  name:'Camo',  price:150,color:'#3a5a2a'},
    {id:'white', name:'White', price:120,color:'#d8d8d8'},
  ];
  const TRAILS = [
    {id:'none',    name:'None',    price:0},
    {id:'fire',    name:'Fire',    price:400},
    {id:'sparkle', name:'Sparkle', price:300},
    {id:'rainbow', name:'Rainbow', price:600},
  ];
  let skinMenuTab = 'head';
  let ownedSkins = JSON.parse(localStorage.getItem('rl_owned_v1')||'{"head":["default"],"body":["gray"],"pants":["dark"],"trail":["none"]}');
  function saveOwned() { try { localStorage.setItem('rl_owned_v1', JSON.stringify(ownedSkins)); } catch(_){} }

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

  function generateBoulders() {
    boulders = [];
    const rng = seededRng(99);
    for (let i = 0; i < 18; i++) {
      const tx = 15 + rng()*(MAP_W-30), ty = 15 + rng()*(MAP_H-30);
      const ix = Math.floor(tx), iy = Math.floor(ty);
      if (!mapTiles[iy] || mapTiles[iy][ix] === T.WATER || mapTiles[iy][ix] === T.DEEP_WATER) continue;
      let near = false;
      for (const b of BUILDINGS) { if (tx>b.tx-3&&tx<b.tx+b.tw+3&&ty>b.ty-3&&ty<b.ty+b.th+3) { near=true; break; } }
      if (!near) boulders.push({ x: tx*TILE, y: ty*TILE, r: 22+rng()*16 });
    }
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
  let gamePhase = 'skinSelect'; // 'skinSelect'|'parachute'|'playing'|'dead'|'win'
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
  let moveVel = { x: 0, y: 0 };
  let aimVel = 0;
  let adsActive = false;
  let jumpBoost = 0;
  let recoilKick = 0;
  let weaponSway = 0;
  let healCharges = 0;
  let damageIndicator = { life: 0, angle: 0 };
  let pickupBanner = { text: '', life: 0 };
  let viewMode = 'fps';

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

    if (!mapTiles) { generateMap(); }
    else if (!interiorProps.length) { prepareBuildingInteriors(); }

    player.x=0; player.y=PLANE_Y; player.health=100; player.armor=0; player.alive=true; player.kills=0;
    gamePhase='skinSelect'; gameEndTimer=0; totalKills=0;
    paraPlane={x:0, speed:280}; paraDeployed=false; paraZ=800; paraVZ=0; paraLanded=false;
    stance='stand'; shakeAmt=0; shakeX=0; shakeY=0; muzzleFlash=0;
    moveVel={x:0,y:0}; adsActive=false; jumpBoost=0; recoilKick=0; healCharges=0;
    damageIndicator={life:0,angle:0}; pickupBanner={text:'',life:0};
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

    // Fire button: touchstart = press, touchend = release
    const fireBtn = document.getElementById('rl-fire-btn');
    if (fireBtn) {
      fireBtn.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        if (gamePhase === 'parachute' && !paraDeployed) { paraDeployed = true; return; }
        shootPressed = true; shootJustDown = true;
      }, {passive: true});
      fireBtn.addEventListener('touchend', (e) => {
        e.stopPropagation(); shootPressed = false;
      }, {passive: true});
      fireBtn.addEventListener('mousedown', () => { shootPressed = true; shootJustDown = true; });
      fireBtn.addEventListener('mouseup',   () => { shootPressed = false; });
    }
    const reloadBtn = document.getElementById('rl-reload-btn');
    if (reloadBtn) {
      reloadBtn.addEventListener('touchstart', (e) => { e.stopPropagation(); startReload(); }, {passive: true});
      reloadBtn.addEventListener('mousedown', () => startReload());
    }
    const throwBtn = document.getElementById('rl-throw-btn');
    if (throwBtn) {
      // Quick tap = throw current item. Hold 350ms = switch grenade ↔ molotov.
      let throwHoldTimer = null;
      let throwDidSwitch = false;

      function doThrow() {
        if (gamePhase !== 'playing') return;
        const tKey = activeThrowable;
        if (ammoCache[tKey] && ammoCache[tKey] > 0) {
          ammoCache[tKey]--;
          throwItem(player.x, player.y, player.angle, tKey, localId);
        }
      }
      function doSwitch() {
        activeThrowable = activeThrowable === 'grenade' ? 'molotov' : 'grenade';
        throwBtn.textContent = activeThrowable === 'grenade' ? '💣' : '🍾';
        throwBtn.classList.add('pressed');
        setTimeout(() => throwBtn.classList.remove('pressed'), 200);
      }

      throwBtn.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        throwDidSwitch = false;
        throwHoldTimer = setTimeout(() => {
          throwDidSwitch = true;
          doSwitch();
        }, 350);
      }, {passive: true});

      throwBtn.addEventListener('touchend', (e) => {
        e.stopPropagation();
        if (throwHoldTimer) { clearTimeout(throwHoldTimer); throwHoldTimer = null; }
        if (!throwDidSwitch) doThrow();
        throwDidSwitch = false;
      }, {passive: true});

      throwBtn.addEventListener('touchcancel', () => {
        if (throwHoldTimer) { clearTimeout(throwHoldTimer); throwHoldTimer = null; }
        throwDidSwitch = false;
      }, {passive: true});

      // Desktop: click = throw, right-click = switch
      throwBtn.addEventListener('mousedown', (e) => {
        if (e.button === 2) { e.preventDefault(); doSwitch(); }
        else doThrow();
      });
      throwBtn.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    bindHoldButton('rl-ads-btn', () => { adsActive = true; }, () => { adsActive = false; });
    bindTapButton('rl-crouch-btn', () => { stance = stance === 'crouch' ? 'stand' : 'crouch'; });
    bindTapButton('rl-prone-btn', () => { stance = stance === 'prone' ? 'stand' : 'prone'; });
    bindTapButton('rl-jump-btn', () => { if (stance !== 'prone') jumpBoost = Math.max(jumpBoost, 0.22); });
    bindTapButton('rl-heal-btn', useHealKit);
    bindTapButton('rl-pov-btn', toggleViewMode);
    updatePovButton();

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
    shootPressed = false; shootJustDown = false;
    destroyMultiplayer();
  }

  function checkOrientation() {
    resize(); // canvas transform handles portrait; no CSS class needed
  }

  function resize() {
    // Canvas always matches the physical screen size
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    // Game logic always uses landscape dims (swapped when portrait)
    const port = canvas.height > canvas.width;
    canvasW = port ? canvas.height : canvas.width;
    canvasH = port ? canvas.width  : canvas.height;
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
    // Skin menu: handle taps immediately on touchstart for responsiveness
    if (gamePhase === 'skinSelect') {
      const rect=canvas.getBoundingClientRect();
      for (const t of e.changedTouches) {
        const sx=(t.clientX-rect.left)*(canvas.width/rect.width);
        const sy=(t.clientY-rect.top)*(canvas.height/rect.height);
        const port=canvas.height>canvas.width;
        const gx=port?sy:sx, gy=port?(canvas.width-sx):sy;
        checkSkinMenuClick(gx, gy);
      }
      return;
    }
    const splitX = window.innerWidth * 0.5; // always screen space
    for (const t of e.changedTouches) {
      if (t.clientX < splitX && !joy.active) {
        joy.active=true; joy.id=t.identifier;
        joy.sx=joy.cx=t.clientX; joy.sy=joy.cy=t.clientY;
        joy.dx=joy.dy=0;
        joyShow(joy.sx,joy.sy,joy.cx,joy.cy,'rl-joy-base','rl-joy-knob');
      } else if (t.clientX >= splitX) {
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
        // Convert touch screen coords to game coords for button checks
        const rect=canvas.getBoundingClientRect();
        const sx=(t.clientX-rect.left)*(canvas.width/rect.width);
        const sy=(t.clientY-rect.top)*(canvas.height/rect.height);
        const port = canvas.height > canvas.width;
        const gx = port ? sy : sx;
        const gy = port ? (canvas.width - sx) : sy;
        checkEndBtnClick(gx, gy);
        if (gamePhase==='playing') checkWeaponSlotClick(gx, gy);
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

  function bindTapButton(id, fn) {
    const btn = document.getElementById(id);
    if (!btn || btn.dataset.rlBound) return;
    btn.dataset.rlBound = '1';
    const press = (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.add('pressed');
      fn();
      setTimeout(() => btn.classList.remove('pressed'), 130);
    };
    btn.addEventListener('touchstart', press, { passive:false });
    btn.addEventListener('mousedown', press);
  }

  function bindHoldButton(id, down, up) {
    const btn = document.getElementById(id);
    if (!btn || btn.dataset.rlBound) return;
    btn.dataset.rlBound = '1';
    const start = (e) => { e.preventDefault(); e.stopPropagation(); btn.classList.add('pressed'); down(); };
    const end = (e) => { e?.preventDefault?.(); e?.stopPropagation?.(); btn.classList.remove('pressed'); up(); };
    btn.addEventListener('touchstart', start, { passive:false });
    btn.addEventListener('touchend', end, { passive:false });
    btn.addEventListener('touchcancel', end, { passive:false });
    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', end);
    btn.addEventListener('mouseleave', end);
  }

  function toggleViewMode() {
    viewMode = viewMode === 'fps' ? 'topdown' : 'fps';
    updatePovButton();
    showPickup(viewMode === 'fps' ? 'First-person POV' : 'Tactical map view');
  }

  function updatePovButton() {
    const btn = document.getElementById('rl-pov-btn');
    if (!btn) return;
    const fps = viewMode === 'fps';
    btn.classList.toggle('active', fps);
    btn.textContent = fps ? 'POV' : 'MAP';
    btn.title = fps ? 'First-person view is active' : 'Tactical map view is active';
  }

  function pointInRect(x, y, r) {
    return x >= r.x - r.w/2 && x <= r.x + r.w/2 && y >= r.y - r.h/2 && y <= r.y + r.h/2;
  }

  function resolveInteriorCollision(entity, radius = PLAYER_R) {
    for (const p of interiorProps) {
      if (!p.solid) continue;
      const left = p.x - p.w / 2 - radius;
      const right = p.x + p.w / 2 + radius;
      const top = p.y - p.h / 2 - radius;
      const bottom = p.y + p.h / 2 + radius;
      if (entity.x < left || entity.x > right || entity.y < top || entity.y > bottom) continue;
      const dx = entity.x - p.x;
      const dy = entity.y - p.y;
      const pushX = (p.w / 2 + radius) - Math.abs(dx);
      const pushY = (p.h / 2 + radius) - Math.abs(dy);
      if (pushX < pushY) entity.x += (dx < 0 ? -pushX : pushX);
      else entity.y += (dy < 0 ? -pushY : pushY);
    }
  }

  function isInsideBuilding(x, y) {
    return BUILDINGS.find((b) => x >= b.tx*TILE && x <= (b.tx+b.tw)*TILE && y >= b.ty*TILE && y <= (b.ty+b.th)*TILE) || null;
  }

  function nearestInteriorCover(x, y, maxDist) {
    let best = null;
    let bestD = maxDist * maxDist;
    for (const p of interiorProps) {
      if (!p.solid) continue;
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bestD) { best = p; bestD = d; }
    }
    return best;
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
    gameTime += dt;
    updateShake(dt);
    updateSpectate(dt);
    updateDmgNumbers(dt);
    bloodSplatters = bloodSplatters.filter(s => { s.life -= dt; return s.life > 0; });

    // Skin select — no game logic
    if (gamePhase === 'skinSelect') return;

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
    if (viewMode === 'fps') {
      let forward = 0, strafe = 0;
      if (keys['KeyW']||keys['ArrowUp'])    forward += 1;
      if (keys['KeyS']||keys['ArrowDown'])  forward -= 1;
      if (keys['KeyA']||keys['ArrowLeft'])  strafe -= 1;
      if (keys['KeyD']||keys['ArrowRight']) strafe += 1;
      if (joy.active) {
        strafe += joy.dx;
        forward += -joy.dy;
      }
      const fl = Math.hypot(forward, strafe);
      if (fl > 1) { forward /= fl; strafe /= fl; }
      mx = Math.cos(player.angle) * forward + Math.cos(player.angle + Math.PI / 2) * strafe;
      my = Math.sin(player.angle) * forward + Math.sin(player.angle + Math.PI / 2) * strafe;
    } else {
    if (keys['KeyW']||keys['ArrowUp'])    my -= 1;
    if (keys['KeyS']||keys['ArrowDown'])  my += 1;
    if (keys['KeyA']||keys['ArrowLeft'])  mx -= 1;
    if (keys['KeyD']||keys['ArrowRight']) mx += 1;
    if (joy.active) {
      // Portrait: canvas is rotated 90° CW in render(), so screen +Y = game +X, screen +X = game -Y
      if (canvas.height > canvas.width) {
        mx += joy.dy;
        my -= joy.dx;
      } else {
        mx += joy.dx;
        my += joy.dy;
      }
    }

    }

    const len = Math.sqrt(mx*mx+my*my);
    if (len > 1) { mx /= len; my /= len; }

    // Smooth mobile-shooter acceleration/deceleration.
    const adsMul = adsActive ? 0.68 : 1;
    const jumpMul = jumpBoost > 0 ? 1.08 : 1;
    const spd = STANCE_SPEED[stance] * adsMul * jumpMul;
    const targetVX = mx * spd;
    const targetVY = my * spd;
    const accel = len > 0.05 ? 15 : 18;
    moveVel.x += (targetVX - moveVel.x) * Math.min(1, accel * dt);
    moveVel.y += (targetVY - moveVel.y) * Math.min(1, accel * dt);
    const nx = player.x + moveVel.x * dt;
    const ny = player.y + moveVel.y * dt;

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

    // Boulder collision
    for (const bo of boulders) {
      const bdx = player.x - bo.x, bdy = player.y - bo.y;
      const bd = Math.sqrt(bdx*bdx+bdy*bdy);
      if (bd < PLAYER_R + bo.r) {
        const push = (PLAYER_R + bo.r - bd) / bd || 0;
        player.x += bdx * push; player.y += bdy * push;
      }
    }
    resolveInteriorCollision(player, PLAYER_R);
    jumpBoost = Math.max(0, jumpBoost - dt);

    // Update facing angle when moving
    if (viewMode !== 'fps' && len > 0.05 && !aimJoy.active && !adsActive) player.angle = Math.atan2(my, mx);

    // Trail particles
    if (len > 0.1 && playerSkin.trail !== 'none') {
      const colors = {fire:['#ff6600','#ff3300','#ffaa00'],sparkle:['#ffffff','#ffffaa','#aaaaff'],rainbow:[`hsl(${(gameTime*200)%360},100%,60%)`,'#fff',`hsl(${(gameTime*200+120)%360},100%,60%)`]};
      const cols = colors[playerSkin.trail]||['#fff'];
      trailParticles.push({x:player.x+(Math.random()-0.5)*8, y:player.y+(Math.random()-0.5)*8, r:2+Math.random()*3, col:cols[Math.floor(Math.random()*cols.length)], life:0.5+Math.random()*0.4, maxLife:0.9});
    }
    trailParticles = trailParticles.filter(p=>{p.life-=0.016; return p.life>0;});

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

    // ── Fire — auto: held button/key; semi-auto: single tap per press
    const wkey = inventory[activeSlot];
    if (wkey && WEAPONS[wkey]) {
      const w = WEAPONS[wkey];
      const held  = keys['Space'] || shootPressed;
      const tapped = keysJustDown.has('Space') || shootJustDown;
      if (w.auto ? held : tapped) tryFire(player.x, player.y, player.angle, wkey, localId);
    }
    keysJustDown.clear();
    shootJustDown = false;
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
    pickupBanner.life = Math.max(0, pickupBanner.life - dt);
    damageIndicator.life = Math.max(0, damageIndicator.life - dt);
    recoilKick = Math.max(0, recoilKick - dt * 12);
    weaponSway += dt * (len > 0.1 ? 8 : 2);
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
            // Subtle shade variation
            if ((tx*5+ty*3)%7===0) {
              ctx.fillStyle='rgba(0,0,0,0.06)';
              ctx.fillRect(px,py,TILE,TILE);
            }
            // Grass blades
            if ((tx*7+ty*11)%9===0) {
              ctx.fillStyle='rgba(80,160,40,0.55)';
              ctx.fillRect(px+6,py+4,2,8);
              ctx.fillRect(px+14,py+8,2,6);
              ctx.fillRect(px+22,py+5,2,7);
            } else if ((tx+ty)%5===0) {
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
            const wave = Math.sin(gameTime * 1.8 + tx * 0.6 + ty * 0.4) * 0.5 + 0.5;
            ctx.fillStyle=`rgb(${30+wave*15|0},${100+wave*30|0},${160+wave*20|0})`;
            ctx.fillRect(px,py,TILE,TILE);
            ctx.fillStyle=`rgba(140,220,255,${0.08+wave*0.14})`;
            ctx.fillRect(px+2, py+4+wave*6|0, TILE-4, 2);
            if ((tx*3+ty*7+Math.floor(gameTime*3))%11===0) {
              ctx.fillStyle=`rgba(255,255,255,${0.5+wave*0.5})`;
              ctx.fillRect(px+(tx*5)%20+4, py+(ty*7)%18+4, 2, 2);
            }
            break;
          }
          case T.DEEP_WATER: {
            const wave = Math.sin(gameTime * 1.4 + tx * 0.5 + ty * 0.6) * 0.5 + 0.5;
            ctx.fillStyle=`rgb(${18+wave*8|0},${48+wave*15|0},${100+wave*15|0})`;
            ctx.fillRect(px,py,TILE,TILE);
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
    const meta = BUILDINGS.find((b) => b.tx*TILE === px && b.ty*TILE === py);
    if (meta) {
      drawEnterableBuilding(meta, px, py, pw, ph, roof, wall);
      return;
    }
    // Drop shadow
    ctx.fillStyle='rgba(0,0,0,0.20)';
    ctx.beginPath();
    ctx.ellipse(px+pw/2+8, py+ph+WALL_H+4, pw/2+10, WALL_H/2+5, 0, 0, Math.PI*2);
    ctx.fill();

    // South wall with texture
    ctx.fillStyle = wall;
    ctx.fillRect(px, py+ph, pw, WALL_H);
    // Brick pattern on south wall
    ctx.fillStyle='rgba(0,0,0,0.08)';
    for (let brow=0; brow<2; brow++) {
      const by2 = py+ph + brow*(WALL_H/2);
      const off = brow%2===0 ? 0 : 14;
      for (let bx2=px+off; bx2<px+pw; bx2+=28) {
        ctx.fillRect(bx2, by2, 26, WALL_H/2-1);
      }
    }
    // Windows on south wall
    drawWallWindows(px, py+ph, pw, WALL_H);
    // Door (center-ish of south wall)
    const dw=10, dh=WALL_H-4, dx=px+pw/2-dw/2;
    ctx.fillStyle='rgba(20,12,5,0.85)';
    ctx.fillRect(dx, py+ph+2, dw, dh);
    ctx.strokeStyle='rgba(160,120,60,0.6)'; ctx.lineWidth=1;
    ctx.strokeRect(dx, py+ph+2, dw, dh);
    ctx.fillStyle='rgba(200,170,80,0.7)';
    ctx.fillRect(dx+dw-3, py+ph+dh/2, 2, 2);
    // Wall bottom shadow
    ctx.fillStyle='rgba(0,0,0,0.24)';
    ctx.fillRect(px, py+ph+WALL_H-3, pw, 3);

    // East wall (right side depth)
    const wallD = WALL_DEPTH + 4;
    ctx.fillStyle = shade(wall,-30);
    ctx.fillRect(px+pw, py+WALL_H/2, wallD, ph+WALL_H/2);
    ctx.fillStyle='rgba(0,0,0,0.22)';
    ctx.fillRect(px+pw+wallD-2, py+WALL_H/2, 2, ph+WALL_H/2);

    // Roof face
    ctx.fillStyle = roof;
    ctx.fillRect(px, py, pw, ph);
    // Roof tiles pattern
    ctx.fillStyle = shade(roof,-18);
    for (let ry=py+6; ry<py+ph; ry+=7) ctx.fillRect(px+1, ry, pw-2, 1);
    ctx.fillStyle = shade(roof,-8);
    for (let rx=px+14; rx<px+pw-1; rx+=14) ctx.fillRect(rx, py+1, 1, ph-2);
    // Roof highlight
    ctx.fillStyle = shade(roof,36);
    ctx.fillRect(px, py, pw, 2);
    ctx.fillRect(px, py, 2, ph);
    // Roof border
    ctx.strokeStyle = shade(roof,20); ctx.lineWidth=1.5;
    ctx.strokeRect(px+0.5, py+0.5, pw-1, ph-1);
    // Chimney
    if (pw > 64) {
      const cx2 = px+pw*0.75, cy2 = py+ph*0.2;
      ctx.fillStyle=shade(wall,8); ctx.fillRect(cx2,cy2-10,10,12);
      ctx.fillStyle=shade(wall,-10); ctx.fillRect(cx2+8,cy2-10,3,12);
      ctx.fillStyle='#222'; ctx.fillRect(cx2-1,cy2-11,12,3);
    }
  }

  function drawEnterableBuilding(b, px, py, pw, ph, roof, wall) {
    const floorGrad = ctx.createLinearGradient(px, py, px + pw, py + ph);
    floorGrad.addColorStop(0, b.kind === 'industrial' ? '#7c7f7d' : '#b8aa96');
    floorGrad.addColorStop(1, b.kind === 'warehouse' ? '#8d806c' : '#d0c1aa');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(px, py, pw, ph);

    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    for (let gx = px + 24; gx < px + pw; gx += 24) {
      ctx.beginPath(); ctx.moveTo(gx, py); ctx.lineTo(gx, py + ph); ctx.stroke();
    }
    for (let gy = py + 24; gy < py + ph; gy += 24) {
      ctx.beginPath(); ctx.moveTo(px, gy); ctx.lineTo(px + pw, gy); ctx.stroke();
    }

    drawBuildingOuterWalls(px, py, pw, ph, wall);
    drawInteriorWalls(b, px, py, pw, ph, wall);
    drawInteriorProps(b);

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(px + 7, py + 7, Math.max(16, pw * 0.18), 4);
    ctx.fillStyle = 'rgba(0,0,0,0.24)';
    ctx.fillRect(px, py + ph - 4, pw, 4);
    if (b.hasRoof) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(px + pw - 44, py + 8, 34, 22);
      ctx.fillStyle = shade(roof, 18);
      ctx.fillRect(px + pw - 40, py + 10, 26, 16);
      ctx.fillStyle = '#e8d27a';
      ctx.font = '9px monospace';
      ctx.fillText('ROOF', px + pw - 39, py + 21);
    }
  }

  function drawBuildingOuterWalls(px, py, pw, ph, wall) {
    const doorW = Math.min(42, pw * 0.28);
    const doorX = px + pw / 2 - doorW / 2;
    ctx.strokeStyle = shade(wall, 18);
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(px, py); ctx.lineTo(px + pw, py);
    ctx.moveTo(px, py); ctx.lineTo(px, py + ph);
    ctx.moveTo(px + pw, py); ctx.lineTo(px + pw, py + ph);
    ctx.moveTo(px, py + ph); ctx.lineTo(doorX, py + ph);
    ctx.moveTo(doorX + doorW, py + ph); ctx.lineTo(px + pw, py + ph);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.strokeRect(px + 3, py + 3, pw - 6, ph - 6);
    ctx.fillStyle = 'rgba(0,255,136,0.22)';
    ctx.fillRect(doorX, py + ph - 5, doorW, 10);
  }

  function drawInteriorWalls(b, px, py, pw, ph, wall) {
    ctx.strokeStyle = shade(wall, 40);
    ctx.lineWidth = 4;
    for (const r of b.rooms || []) {
      if (r.stairs) {
        ctx.fillStyle = 'rgba(50,55,62,0.76)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        for (let sy = r.y + 6; sy < r.y + r.h; sy += 7) {
          ctx.beginPath(); ctx.moveTo(r.x + 3, sy); ctx.lineTo(r.x + r.w - 3, sy); ctx.stroke();
        }
        ctx.strokeStyle = shade(wall, 40);
      } else if (r.orient === 'v') {
        ctx.beginPath();
        ctx.moveTo(r.x, r.y); ctx.lineTo(r.x, r.gapY - 17);
        ctx.moveTo(r.x, r.gapY + 17); ctx.lineTo(r.x, r.y + r.h);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(r.x, r.y); ctx.lineTo(r.gapX - 17, r.y);
        ctx.moveTo(r.gapX + 17, r.y); ctx.lineTo(r.x + r.w, r.y);
        ctx.stroke();
      }
    }
  }

  function drawInteriorProps(b) {
    for (const p of b.cover || []) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(-p.w/2 + 3, -p.h/2 + 4, p.w, p.h);
      const colors = {
        crate:'#8a5c2d', shelf:'#5b4738', table:'#765438', sofa:'#536b8a',
        cabinet:'#6b604e', barrier:'#8f9396', desk:'#70543f', stairs:'#40464f',
      };
      ctx.fillStyle = colors[p.type] || '#765438';
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-p.w/2 + 0.5, -p.h/2 + 0.5, p.w - 1, p.h - 1);
      if (p.lootSpot) {
        ctx.fillStyle = 'rgba(255,220,80,0.35)';
        ctx.beginPath(); ctx.arc(p.w/2 - 5, -p.h/2 + 5, 3, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawWallWindows(px, py, pw, wh) {
    const ww=8, whh=wh-7;
    for (let wx=px+18; wx+ww<px+pw-18; wx+=22) {
      // Window frame
      ctx.fillStyle='rgba(120,90,40,0.6)';
      ctx.fillRect(wx-1, py+2, ww+2, whh+2);
      // Glass
      const lit = Math.random() > 0.4;
      ctx.fillStyle= lit ? 'rgba(255,240,160,0.55)' : 'rgba(20,30,60,0.8)';
      ctx.fillRect(wx, py+3, ww, whh);
      // Glass reflection
      ctx.fillStyle='rgba(255,255,255,0.22)';
      ctx.fillRect(wx+1, py+4, 2, 3);
      // Window sill
      ctx.fillStyle='rgba(180,150,80,0.4)';
      ctx.fillRect(wx-1, py+3+whh, ww+2, 2);
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

  // ── Boulder rendering ─────────────────────────────────────
  function drawBoulders() {
    for (const bo of boulders) {
      ctx.fillStyle='rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.ellipse(bo.x+bo.r*0.3, bo.y+bo.r*0.25, bo.r*0.9, bo.r*0.4, 0, 0, Math.PI*2); ctx.fill();
      const g = ctx.createRadialGradient(bo.x-bo.r*0.25, bo.y-bo.r*0.3, 0, bo.x, bo.y, bo.r);
      g.addColorStop(0,'#9a9a9a'); g.addColorStop(0.5,'#6a6a6a'); g.addColorStop(1,'#3a3a3a');
      ctx.fillStyle=g;
      ctx.beginPath(); ctx.ellipse(bo.x, bo.y, bo.r, bo.r*0.8, -0.2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.ellipse(bo.x-bo.r*0.25, bo.y-bo.r*0.28, bo.r*0.35, bo.r*0.22, -0.3, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(bo.x-bo.r*0.1, bo.y-bo.r*0.3); ctx.lineTo(bo.x+bo.r*0.2, bo.y+bo.r*0.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bo.x+bo.r*0.15, bo.y-bo.r*0.2); ctx.lineTo(bo.x-bo.r*0.1, bo.y+bo.r*0.2); ctx.stroke();
    }
  }

  // ── Blood effects ─────────────────────────────────────────
  function spawnBlood(x, y) {
    const parts = [];
    for (let i=0; i<12; i++) {
      const a = Math.random()*Math.PI*2, d = 4+Math.random()*22;
      parts.push({ ox:Math.cos(a)*d, oy:Math.sin(a)*d, r:2+Math.random()*4, alpha:0.7+Math.random()*0.3 });
    }
    bloodSplatters.push({ x, y, particles:parts, life:8, maxLife:8 });
  }

  function drawBloodSplatters() {
    for (const s of bloodSplatters) {
      const fade = s.life / s.maxLife;
      for (const p of s.particles) {
        ctx.fillStyle = `rgba(180,0,0,${p.alpha * fade * 0.85})`;
        ctx.beginPath(); ctx.arc(s.x+p.ox, s.y+p.oy, p.r, 0, Math.PI*2); ctx.fill();
      }
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
    const hd=HEADS.find(h=>h.id===playerSkin.head)||HEADS[0];
    const bd=BODIES.find(b=>b.id===playerSkin.body)||BODIES[0];
    const pd=PANTS.find(p=>p.id===playerSkin.pants)||PANTS[0];
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

    // Body
    ctx.fillStyle=bd.color;
    ctx.beginPath(); ctx.ellipse(0,2,7,9,0,0,Math.PI*2); ctx.fill();
    // Pants
    ctx.fillStyle=pd.color;
    ctx.beginPath(); ctx.ellipse(0,8,6,5,0,0,Math.PI*2); ctx.fill();
    // Vest highlight
    ctx.fillStyle='rgba(255,255,255,0.07)';
    ctx.beginPath(); ctx.ellipse(-1,-1,4,6,0,0,Math.PI*2); ctx.fill();

    // Rifle barrel
    ctx.fillStyle='#222';
    ctx.fillRect(-1.5,-20,3,14);
    ctx.fillRect(-2,-12,4,8);

    // Head
    ctx.fillStyle=hd.color;
    ctx.beginPath(); ctx.arc(0,-8,5.5,0,Math.PI*2); ctx.fill();

    if (hd.crown) {
      ctx.fillStyle='#ffd700';
      ctx.beginPath();
      ctx.moveTo(-4,-13); ctx.lineTo(-2,-17); ctx.lineTo(0,-14); ctx.lineTo(2,-17); ctx.lineTo(4,-13); ctx.closePath();
      ctx.fill();
      ctx.strokeStyle='rgba(255,255,100,0.6)'; ctx.lineWidth=0.8; ctx.strokeRect(-4,-14,8,2);
    } else if (hd.beak) {
      ctx.fillStyle='#ff8c00';
      ctx.beginPath(); ctx.moveTo(3,-7); ctx.lineTo(9,-10); ctx.lineTo(9,-5); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#cc6000';
      ctx.beginPath(); ctx.moveTo(3,-7); ctx.lineTo(9,-10); ctx.lineTo(9,-8); ctx.closePath(); ctx.fill();
    } else if (hd.mask) {
      ctx.fillStyle='rgba(0,0,0,0.78)'; ctx.fillRect(-4,-12,8,7);
      ctx.fillStyle='rgba(255,0,0,0.25)'; ctx.fillRect(-4,-12,8,2);
    } else {
      ctx.fillStyle='#4a4a2a';
      ctx.beginPath(); ctx.arc(0,-9,5.9,Math.PI,Math.PI*2); ctx.fill();
      ctx.fillRect(-7,-9,14,2);
    }

    if (hd.eyes==='red') {
      ctx.fillStyle='rgba(255,30,30,0.9)';
      ctx.beginPath(); ctx.arc(-2,-9,1.2,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(2,-9,1.2,0,Math.PI*2); ctx.fill();
    } else if (hd.eyes==='black') {
      ctx.fillStyle='#080808';
      ctx.beginPath(); ctx.arc(-2,-9,1.5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(2,-9,1.5,0,Math.PI*2); ctx.fill();
    }

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
    let ky=canvasH-80; // game bottom-left = portrait top-left area (safe)
    for (const kf of killFeed) {
      const alpha=Math.min(1,kf.life);
      ctx.fillStyle=`rgba(0,0,0,${alpha*0.5})`;
      ctx.fillRect(10,ky-14,200,18);
      ctx.fillStyle=`rgba(255,255,255,${alpha})`;
      ctx.font='11px monospace'; ctx.textAlign='left';
      ctx.fillText(kf.text, 14, ky);
      ky-=22;
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
    const aliveTotal = bots.filter(b=>b.alive).length + Object.keys(remotePlayers).length + 1;
    ctx.fillStyle='#fff'; ctx.font='bold 10px monospace'; ctx.textAlign='center';
    ctx.fillText(`${label}  ${secs}s`, canvasW/2, by+bh-3);
    ctx.textAlign='left';
    // Alive count badge (right of zone bar)
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(bx+bw+6, by-2, 52, bh+4);
    ctx.fillStyle='#8fce50'; ctx.font='bold 10px monospace'; ctx.textAlign='center';
    ctx.fillText(`👥 ${aliveTotal}`, bx+bw+32, by+bh-3);
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

    // ── Minimap — positioned at game top-LEFT so it appears at portrait top-right,
    // safely away from the FIRE/RELOAD buttons at portrait bottom-right
    if (!mmCanvas) buildMinimap();
    const mx=10, my=10, mw=110, mh=110;
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
    drawShooterFeedback();
  }

  function drawShooterFeedback() {
    const wkey = inventory[activeSlot];
    const w = wkey ? WEAPONS[wkey] : null;
    const sway = Math.sin(weaponSway) * (adsActive ? 2 : 6);
    const recoil = recoilKick * 24;
    const gunX = canvasW - 210 + sway;
    const gunY = canvasH - 92 + recoil;
    ctx.save();
    ctx.globalAlpha = 0.94;
    ctx.fillStyle = adsActive ? 'rgba(12,18,24,0.92)' : 'rgba(18,22,28,0.88)';
    ctx.fillRect(gunX, gunY, 170, 28);
    ctx.fillStyle = '#202832';
    ctx.fillRect(gunX + 112, gunY - 13, 58, 12);
    ctx.fillStyle = '#10151b';
    ctx.fillRect(gunX + 22, gunY + 24, 50, 24);
    ctx.fillStyle = muzzleFlash > 0 ? 'rgba(255,210,80,0.95)' : 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.moveTo(gunX + 176, gunY + 5);
    ctx.lineTo(gunX + 212 + muzzleFlash * 4, gunY + 14);
    ctx.lineTo(gunX + 176, gunY + 23);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(w ? w.name.toUpperCase() : 'NO WEAPON', gunX, gunY - 8);
    if (adsActive) {
      ctx.strokeStyle = 'rgba(0,212,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(canvasW/2, canvasH/2, 28, 0, Math.PI*2); ctx.stroke();
    }
    ctx.restore();

    if (damageIndicator.life > 0) {
      const alpha = Math.min(1, damageIndicator.life / 0.85);
      const rel = damageIndicator.angle - player.angle;
      const ix = canvasW/2 + Math.cos(rel) * 94;
      const iy = canvasH/2 + Math.sin(rel) * 70;
      ctx.save();
      ctx.translate(ix, iy);
      ctx.rotate(rel + Math.PI/2);
      ctx.fillStyle = `rgba(255,55,55,${alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, -16); ctx.lineTo(-13, 13); ctx.lineTo(13, 13); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    if (pickupBanner.life > 0) {
      const alpha = Math.min(1, pickupBanner.life / 0.35);
      ctx.fillStyle = `rgba(0,0,0,${0.45 * alpha})`;
      ctx.fillRect(canvasW/2 - 120, canvasH - 102, 240, 28);
      ctx.strokeStyle = `rgba(0,212,255,${0.45 * alpha})`;
      ctx.strokeRect(canvasW/2 - 120, canvasH - 102, 240, 28);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pickupBanner.text, canvasW/2, canvasH - 84);
      ctx.textAlign = 'left';
    }

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(20, canvasH - 104, 110, 18);
    ctx.fillStyle = '#a7ffcf';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`HEALS ${healCharges}`, 28, canvasH - 91);
  }

  // ── Render ────────────────────────────────────────────────
  function normalizeAngle(a) {
    while (a < -Math.PI) a += Math.PI * 2;
    while (a > Math.PI) a -= Math.PI * 2;
    return a;
  }

  function fpsSample(x, y) {
    if (x < 0 || y < 0 || x >= MAP_PX || y >= MAP_PX) return { hit:true, color:'#111827' };
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    const tile = mapTiles?.[ty]?.[tx];
    if (tile === T.WATER || tile === T.DEEP_WATER) return { hit:true, color:'#1e6da8' };
    for (const p of interiorProps) {
      if (p.solid && pointInRect(x, y, p)) return { hit:true, color:p.type === 'sofa' ? '#62483f' : '#7b6748' };
    }
    for (const b of BUILDINGS) {
      const bx = b.tx * TILE, by = b.ty * TILE, bw = b.tw * TILE, bh = b.th * TILE;
      if (x < bx || x > bx + bw || y < by || y > by + bh) continue;
      const wall = 7;
      const doorCx = (b.tx + Math.floor(b.tw / 2) + 0.5) * TILE;
      const nearSouth = y > by + bh - wall;
      const inDoor = nearSouth && Math.abs(x - doorCx) < TILE * 0.65;
      if ((x < bx + wall || x > bx + bw - wall || y < by + wall || nearSouth) && !inDoor) return { hit:true, color:b.wall || '#3a3a3a' };
      for (const room of b.rooms || []) {
        if (room.stairs) continue;
        if (room.orient === 'v' && Math.abs(x - room.x) < 3 && y > room.y && y < room.y + room.h && Math.abs(y - room.gapY) > TILE * 0.72) return { hit:true, color:'#2f3440' };
        if (room.orient === 'h' && Math.abs(y - room.y) < 3 && x > room.x && x < room.x + room.w && Math.abs(x - room.gapX) > TILE * 0.72) return { hit:true, color:'#2f3440' };
      }
    }
    return { hit:false, color:'#24321f' };
  }

  function castFpsRay(angle, maxDist = 950) {
    for (let dist = 0; dist < maxDist; dist += 7) {
      const x = player.x + Math.cos(angle) * dist;
      const y = player.y + Math.sin(angle) * dist;
      const hit = fpsSample(x, y);
      if (hit.hit) return { ...hit, x, y, dist };
    }
    return { hit:false, dist:maxDist, color:'#24321f' };
  }

  function shadeColor(hex, factor) {
    const raw = (hex || '#555').replace('#', '');
    const n = parseInt(raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw, 16);
    const r = Math.max(0, Math.min(255, ((n >> 16) & 255) * factor));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) * factor));
    const b = Math.max(0, Math.min(255, (n & 255) * factor));
    return `rgb(${r|0},${g|0},${b|0})`;
  }

  function drawFpsSprite(obj, color, label, size, sw, sh, fov, projection) {
    const dx = obj.x - player.x, dy = obj.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 18 || dist > 800) return;
    const rel = normalizeAngle(Math.atan2(dy, dx) - player.angle);
    if (Math.abs(rel) > fov * 0.62) return;
    const wallHit = castFpsRay(player.angle + rel, dist);
    if (wallHit.hit && wallHit.dist < dist - 16) return;
    const sx = sw / 2 + Math.tan(rel) * projection;
    const h = Math.max(10, (size * projection) / Math.max(1, dist));
    const w = h * 0.62;
    const sy = sh * 0.56 - h * 0.5 + Math.sin(gameTime * 4 + obj.x * 0.01) * 4;
    ctx.save();
    ctx.globalAlpha = Math.max(0.35, 1 - dist / 900);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(sx - w / 2, sy, w, h, Math.min(12, w * 0.3));
    ctx.fill();
    ctx.shadowBlur = 0;
    if (label) {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, sx, sy - 6);
    }
    ctx.restore();
  }

  function drawFpsOverlay(sw, sh) {
    const key = inventory[activeSlot];
    const w = WEAPONS[key];
    const ammo = key ? (ammoCache[key] || 0) : 0;
    const cx = sw / 2, cy = sh / 2;
    ctx.strokeStyle = adsActive ? 'rgba(0,212,255,0.82)' : 'rgba(255,255,255,0.72)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy); ctx.lineTo(cx - 5, cy);
    ctx.moveTo(cx + 5, cy); ctx.lineTo(cx + 14, cy);
    ctx.moveTo(cx, cy - 14); ctx.lineTo(cx, cy - 5);
    ctx.moveTo(cx, cy + 5); ctx.lineTo(cx, cy + 14);
    ctx.stroke();
    if (hitMarker > 0) {
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy - 18); ctx.lineTo(cx - 7, cy - 7);
      ctx.moveTo(cx + 18, cy - 18); ctx.lineTo(cx + 7, cy - 7);
      ctx.moveTo(cx - 18, cy + 18); ctx.lineTo(cx - 7, cy + 7);
      ctx.moveTo(cx + 18, cy + 18); ctx.lineTo(cx + 7, cy + 7);
      ctx.stroke();
    }
    const gunW = Math.min(250, sw * 0.42);
    const gunX = sw - gunW - 20 + Math.sin(weaponSway) * (adsActive ? 2 : 8);
    const gunY = sh - 110 + recoilKick * 24;
    ctx.fillStyle = adsActive ? 'rgba(18,25,34,0.96)' : 'rgba(15,20,28,0.92)';
    ctx.fillRect(gunX, gunY, gunW, 34);
    ctx.fillStyle = '#263140';
    ctx.fillRect(gunX + gunW * 0.62, gunY - 16, gunW * 0.36, 14);
    ctx.fillStyle = '#0b1017';
    ctx.fillRect(gunX + 32, gunY + 30, gunW * 0.26, 34);
    if (muzzleFlash > 0) {
      ctx.fillStyle = 'rgba(255,198,65,0.94)';
      ctx.beginPath();
      ctx.moveTo(gunX + gunW + 2, gunY + 6);
      ctx.lineTo(gunX + gunW + 58 + muzzleFlash * 5, gunY + 17);
      ctx.lineTo(gunX + gunW + 2, gunY + 29);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.48)';
    ctx.fillRect(16, 16, 190, 78);
    ctx.fillStyle = '#eaffff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`HP ${Math.ceil(player.health)}  ARMOR ${Math.ceil(player.armor || 0)}`, 28, 38);
    ctx.fillText(`${w ? w.name.toUpperCase() : 'NO WEAPON'}  ${ammo}`, 28, 61);
    ctx.fillText(`ALIVE ${bots.filter(b => b.alive).length + 1}  KILLS ${player.kills}`, 28, 84);
    if (pickupBanner.life > 0) {
      const alpha = Math.min(1, pickupBanner.life / 0.35);
      ctx.fillStyle = `rgba(0,0,0,${0.5 * alpha})`;
      ctx.fillRect(cx - 120, sh - 146, 240, 30);
      ctx.strokeStyle = `rgba(0,212,255,${0.5 * alpha})`;
      ctx.strokeRect(cx - 120, sh - 146, 240, 30);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pickupBanner.text, cx, sh - 126);
      ctx.textAlign = 'left';
    }
  }

  function renderFirstPerson() {
    const sw = canvas.width, sh = canvas.height;
    ctx.clearRect(0, 0, sw, sh);
    const horizon = sh * (adsActive ? 0.47 : 0.44) + jumpBoost * -35 + recoilKick * 14;
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#7eb8df');
    sky.addColorStop(1, '#d6eefb');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, sw, horizon);
    const indoor = isInsideBuilding(player.x, player.y);
    const floor = ctx.createLinearGradient(0, horizon, 0, sh);
    floor.addColorStop(0, indoor ? '#34302a' : '#4f7b34');
    floor.addColorStop(1, indoor ? '#151515' : '#263a1d');
    ctx.fillStyle = floor; ctx.fillRect(0, horizon, sw, sh - horizon);
    const fov = adsActive ? Math.PI / 3.4 : Math.PI / 2.55;
    const projection = (sw / 2) / Math.tan(fov / 2);
    const columns = Math.min(260, Math.max(120, Math.floor(sw / 3)));
    const strip = Math.ceil(sw / columns) + 1;
    for (let i = 0; i < columns; i++) {
      const rayA = player.angle + (i / columns - 0.5) * fov;
      const hit = castFpsRay(rayA);
      const corrected = Math.max(1, hit.dist * Math.cos(rayA - player.angle));
      const wallH = Math.min(sh * 1.45, (TILE * 1.95 * projection) / corrected);
      const x = i * (sw / columns);
      const shade = Math.max(0.28, 1 - corrected / 1000);
      ctx.fillStyle = shadeColor(hit.color, shade);
      ctx.fillRect(x, horizon - wallH * 0.5, strip, wallH);
    }
    for (const it of loot) drawFpsSprite(it, it.supply ? '#64ff9d' : '#ffd35a', it.supply ? 'SUPPLY' : (WEAPONS[it.key]?.name || 'LOOT'), 28, sw, sh, fov, projection);
    for (const bt of bots) if (bt.alive) drawFpsSprite(bt, '#ff4b55', bt.name, 46, sw, sh, fov, projection);
    for (const b of bullets) drawFpsSprite(b, '#ffe66b', '', 8, sw, sh, fov, projection);
    for (const ex of explosions) drawFpsSprite(ex, '#ff7a2f', 'BOOM', Math.max(36, ex.r), sw, sh, fov, projection);
    drawFpsOverlay(sw, sh);
    if (gamePhase === 'parachute') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(sw / 2 - 130, sh / 2 - 22, 260, 40);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
      ctx.fillText('Tap FIRE to deploy chute', sw / 2, sh / 2 + 3); ctx.textAlign = 'left';
    }
    if (gamePhase === 'dead' || gamePhase === 'win') {
      ctx.fillStyle = 'rgba(0,0,0,0.66)'; ctx.fillRect(0, 0, sw, sh);
      ctx.fillStyle = gamePhase === 'win' ? '#ffe66b' : '#ff5b5b';
      ctx.font = `bold ${Math.max(34, Math.min(76, sw * 0.09))}px monospace`;
      ctx.textAlign = 'center'; ctx.fillText(gamePhase === 'win' ? 'VICTORY' : 'ELIMINATED', sw / 2, sh / 2 - 12);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 15px monospace'; ctx.fillText('Tap or press any key to return', sw / 2, sh / 2 + 28);
      ctx.textAlign = 'left';
    }
  }

  function render() {
    // Clear the physical screen (canvas.width × canvas.height = screen size)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (viewMode === 'fps' && gamePhase !== 'skinSelect') {
      renderFirstPerson();
      return;
    }

    // Portrait: rotate canvas 90° CW so the game renders in landscape orientation.
    // canvas.width < canvas.height means portrait phone.
    // After this transform, all drawing uses canvasW × canvasH (landscape game dims).
    const port = canvas.height > canvas.width;
    if (port) {
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.rotate(Math.PI / 2);
    }

    // Skin select screen — render locker UI then return
    if (gamePhase === 'skinSelect') {
      drawSkinMenu();
      if (port) ctx.restore();
      return;
    }

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
    drawBoulders();
    drawBuildings(ty1, ty2);
    drawBots();
    drawThrowables();

    // Remote players
    for (const id in remotePlayers) drawRemotePlayer(remotePlayers[id]);

    // Trail particles (drawn behind player)
    for (const p of trailParticles) {
      ctx.globalAlpha = Math.max(0, p.life/p.maxLife)*0.7;
      ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r*(p.life/p.maxLife), 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;

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
    drawBloodSplatters();
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

    // Close portrait rotation transform
    if (port) ctx.restore();
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
  let lastFireT     = {}; // keyed by weaponKey so ROF doesn't bleed between weapons
  let reloading     = false;
  let reloadEnd     = 0;
  let shootPressed  = false; // fire button held (auto weapons)
  let shootJustDown = false; // fire button just tapped (semi-auto, cleared each frame)

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
  const WEAPON_RARITY = ['pistol','pistol','smg','smg','ar','ar','shotgun','revolver','battlerifle','sniper','grenade','grenade','molotov','molotov','rpg'];
  const SUPPLY_POOL = ['armor_light','armor_heavy','medkit','ammo_box'];

  function spawnLoot() {
    loot = []; crates = [];
    const rng = seededRng(99);
    for (const p of interiorProps) {
      if (!p.lootSpot || rng() > 0.82) continue;
      const supply = rng() < 0.28;
      const key = supply ? SUPPLY_POOL[Math.floor(rng()*SUPPLY_POOL.length)] : WEAPON_RARITY[Math.floor(rng()*WEAPON_RARITY.length)];
      loot.push({
        x: p.x + (rng()-0.5) * Math.max(8, p.w * 0.65),
        y: p.y + (rng()-0.5) * Math.max(8, p.h * 0.65),
        key,
        ammo: WEAPONS[key] ? WEAPONS[key].ammo * (key === 'grenade' || key === 'molotov' ? 1 : 2) : 0,
        supply,
        indoor: true,
      });
    }
    for (let i = 0; i < 125; i++) {
      const tx = 3 + rng()*(MAP_W-6), ty = 3 + rng()*(MAP_H-6);
      const tile = mapTiles[Math.floor(ty)][Math.floor(tx)];
      if (tile === T.WATER || tile === T.DEEP_WATER) continue;
      if (rng() < 0.25) {
        // supply item
        const key = SUPPLY_POOL[Math.floor(rng()*SUPPLY_POOL.length)];
        loot.push({ x:tx*TILE, y:ty*TILE, key, ammo:0, supply:true });
      } else {
        const key = WEAPON_RARITY[Math.floor(rng()*WEAPON_RARITY.length)];
        loot.push({ x:tx*TILE, y:ty*TILE, key, ammo: WEAPONS[key].ammo*2 });
      }
    }
    const pts = [[96,94],[105,93],[148,35],[22,144],[157,158],[70,30],[130,70]];
    for (const [tx,ty] of pts) crates.push({ x:tx*TILE, y:ty*TILE, open:false, lootLeft:3 });
  }

  function spawnBots() {
    bots = [];
    const rng = seededRng(55);
    const names = [
      'Alpha','Bravo','Charlie','Delta','Echo','Foxtrot','Ghost','Hawk',
      'Indigo','Juliet','Kilo','Lima','Mike','Nova','Oscar','Phoenix',
      'Quinn','Ranger','Sierra','Tango','Umbra','Victor','Whiskey','Xavier',
      'Yankee','Zulu','Apex','Blade','Cipher','Dusk','Ember','Frost',
      'Glitch','Hydra','Ivory','Jinx','Karma','Lynx',
    ]; // 38 names → 38 bots + 1 player = 39 total (lobby of 40 fills with remotes)
    const weaponKeys = ['pistol','smg','ar','shotgun','revolver'];
    for (let i = 0; i < 39; i++) {
      const tx = 10 + rng()*(MAP_W-20), ty = 10 + rng()*(MAP_H-20);
      const key = weaponKeys[Math.floor(rng()*weaponKeys.length)];
      bots.push({
        id:'bot_'+i, name: names[i] || ('Bot'+(i+1)),
        x:tx*TILE, y:ty*TILE, angle:0,
        hp:100, maxHp:100,
        weapon:key, ammo: WEAPONS[key].ammo,
        state:'roam', target:null,
        fireT:0, reloadT:0,
        waypointX:tx*TILE, waypointY:ty*TILE,
        damageCooldowns:{},
        alive:true,
      });
    }
  }

  function damageBot(bot, amount, source, options = {}) {
    if (!bot || !bot.alive) return false;
    const dmg = Math.max(0, Number(amount) || 0);
    if (dmg <= 0) return false;

    const now = performance.now();
    const cooldown = Math.max(0, options.cooldown || 0);
    const key = source || 'unknown';
    bot.damageCooldowns = bot.damageCooldowns || {};
    if (cooldown && now - (bot.damageCooldowns[key] || 0) < cooldown) return false;
    if (cooldown) bot.damageCooldowns[key] = now;

    bot.hp = Math.max(0, Math.min(bot.maxHp || 100, bot.hp) - dmg);
    if (window.CLASS_APP_DEBUG_ROYALE_DAMAGE) {
      console.debug(`[Royale] Bot took ${Math.round(dmg * 10) / 10} damage from ${key}`, bot.name);
    }

    if (bot.hp <= 0) {
      bot.alive = false;
      if (options.credit !== false) {
        player.kills++;
        coins += 15;
        saveCoins();
      }
      spawnBlood(bot.x, bot.y);
      const message = options.message || `${bot.name} eliminated by ${key}${options.credit === false ? '' : ' (+15)'}`;
      killFeed.push({ text: message, life: 4 });
      return true;
    }
    return false;
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
      recoilKick = Math.min(1, recoilKick + (w.recoil || 0.16));
      player.angle += (Math.random() - 0.5) * (adsActive ? 0.01 : 0.025);
      const shakeMap={pistol:3,revolver:7,smg:2,ar:4,battlerifle:6,shotgun:9,sniper:12,rpg:0};
      addShake((shakeMap[weaponKey]||3) * (adsActive ? 0.55 : 1));
    }
    if (w.pellets === 0) { throwItem(fromX, fromY, angle, weaponKey, ownerId); return; }
    for (let p = 0; p < w.pellets; p++) {
      const moving = Math.hypot(moveVel.x, moveVel.y) > 50 ? 1.28 : 1;
      const aimSpread = w.spread * STANCE_SPREAD[stance] * moving * (adsActive ? 0.55 : 1);
      const a = angle + (Math.random()-0.5)*aimSpread;
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
      fuse: weaponKey === 'grenade' ? 2.35 : 0,
      bounces: 0,
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
      if (item.key==='medkit')       { healCharges=Math.min(3,healCharges+1); showPickup('Health kit ready'); killFeed.push({text:'Health kit picked up',life:2}); }
      else if (item.key==='armor_light') { player.armor=Math.min(player.maxArmor,player.armor+50); showPickup('Light armor equipped'); killFeed.push({text:'Light Armor +50',life:2}); }
      else if (item.key==='armor_heavy') { player.armor=Math.min(player.maxArmor,player.armor+100); showPickup('Heavy armor equipped'); killFeed.push({text:'Heavy Armor +100',life:2}); }
      else if (item.key==='ammo_box') {
        for (const k of inventory) ammoCache[k]=(ammoCache[k]||0)+WEAPONS[k].ammo*3;
        ammoCache.grenade=(ammoCache.grenade||0)+1;
        ammoCache.molotov=(ammoCache.molotov||0)+1;
        showPickup('Ammo box');
        killFeed.push({text:'Ammo Box',life:2});
      }
      return;
    }
    if (item.key === 'grenade' || item.key === 'molotov') {
      ammoCache[item.key] = Math.min(WEAPONS[item.key].maxAmmo, (ammoCache[item.key]||0) + Math.max(1, item.ammo || 1));
      activeThrowable = item.key;
      const throwBtn = document.getElementById('rl-throw-btn');
      if (throwBtn) throwBtn.textContent = item.key === 'grenade' ? '💣' : '🍾';
      showPickup(`${WEAPONS[item.key].name} x${ammoCache[item.key]}`);
      return;
    }
    if (inventory.length < 2 && !inventory.includes(item.key)) {
      inventory.push(item.key);
      ammoCache[item.key] = (ammoCache[item.key]||0) + item.ammo;
      showPickup(`${WEAPONS[item.key]?.name || item.key} picked up`);
    } else {
      ammoCache[item.key] = (ammoCache[item.key]||0) + item.ammo;
      showPickup(`${WEAPONS[item.key]?.name || item.key} ammo`);
    }
  }

  function showPickup(text) {
    pickupBanner.text = text;
    pickupBanner.life = 2.2;
  }

  function useHealKit() {
    if (gamePhase !== 'playing') return;
    if (healCharges <= 0) { showPickup('No health kits'); return; }
    if (player.health >= player.maxHealth) { showPickup('Health already full'); return; }
    healCharges--;
    player.health = Math.min(player.maxHealth, player.health + 55);
    showPickup('Health kit used +55 HP');
    killFeed.push({ text:'Health kit used', life:2 });
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
    if (len>8) {
      if (viewMode === 'fps') {
        player.angle += dx * 0.0048;
        aimJoy.sx = aimJoy.cx;
        aimJoy.sy = aimJoy.cy;
      } else {
      // Portrait: canvas rotated 90° CW → screen +Y = game +X, screen +X = game -Y
      if (canvas.height > canvas.width) {
        player.angle = Math.atan2(-dx, dy);
      } else {
        player.angle = Math.atan2(dy, dx);
      }
    }
    }
    joyShow(aimJoy.sx,aimJoy.sy,
      aimJoy.sx+dx/Math.max(len/max,1),
      aimJoy.sy+dy/Math.max(len/max,1),
      'rl-aim-base','rl-aim-knob');
    // Aim stick no longer auto-fires — use the FIRE button
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
      let blocked = false;
      for (const p of interiorProps) {
        if (p.solid && pointInRect(b.x, b.y, p)) { blocked = true; break; }
      }
      if (blocked) {
        spawnDmgNum(b.x, b.y - 8, '•', 'rgba(220,220,220,0.8)');
        bullets.splice(i,1); continue;
      }
      // Hit player
      if (b.owner !== localId) {
        const dx=b.x-player.x, dy=b.y-player.y;
        if (Math.sqrt(dx*dx+dy*dy) < PLAYER_R+4) {
          applyDamageToPlayer(b.dmg, b.x - b.vx * 0.08, b.y - b.vy * 0.08);
          addShake(6); spawnDmgNum(player.x, player.y-20, b.dmg, '#ff4444');
          bullets.splice(i,1); continue;
        }
      }
      // Hit bots
      for (let j=bots.length-1; j>=0; j--) {
        const bt=bots[j]; if (!bt.alive) continue;
        const dx=b.x-bt.x, dy=b.y-bt.y;
        if (Math.sqrt(dx*dx+dy*dy) < PLAYER_R+4) {
          damageBot(bt, b.dmg, 'bullet', { message:`You killed ${bt.name} (+15 coins)` });
          hitMarker = 6;
          spawnDmgNum(bt.x, bt.y-20, b.dmg, bt.hp<=0?'#ff0':'#fff');
          if (false && bt.hp <= 0) {
            bt.alive=false; player.kills++;
            spawnBlood(bt.x, bt.y);
            coins+=15; saveCoins();
            killFeed.push({text:`You killed ${bt.name} (+15 💰)`,life:4});
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
        if (t.type==='grenade') {
          if (t.timer >= t.fuse || t.bounces >= 2) { doExplosion(t.x,t.y,120,120); throwables.splice(i,1); }
          else {
            t.z = 1;
            t.vz = 70 * Math.pow(0.55, t.bounces);
            t.vx *= 0.72; t.vy *= 0.72; t.bounces++;
          }
        }
        else if (t.type==='molotov') { fires.push({x:t.x,y:t.y,r:62,life:8,maxLife:8}); throwables.splice(i,1); }
        else throwables.splice(i,1);
      }
    }
  }

  function doExplosion(x,y,r,dmg) {
    explosions.push({x,y,r:10,maxR:r,life:0.55,maxLife:0.55});
    const d2=(x-player.x)**2+(y-player.y)**2;
    if (d2<r*r) { applyDamageToPlayer(dmg*Math.max(0,1-Math.sqrt(d2)/r), x, y); addShake(18); }
    for (const bt of bots) {
      if (!bt.alive) continue;
      const bd2=(x-bt.x)**2+(y-bt.y)**2;
      if (bd2<r*r) {
        damageBot(bt, dmg*Math.max(0,1-Math.sqrt(bd2)/r), 'explosion', { message:`Explosion eliminated ${bt.name} (+15)` });
        if (false && bt.hp <= 0) {
          bt.alive=false; player.kills++;
          spawnBlood(bt.x, bt.y);
          coins+=15; saveCoins();
          killFeed.push({text:`Explosion eliminated ${bt.name} (+15)`,life:4});
        }
      }
    }
  }

  function updateFires(dt) {
    for (let i=fires.length-1; i>=0; i--) {
      const f=fires[i]; f.life -= dt;
      if (f.life<=0) { fires.splice(i,1); continue; }
      const d2=(f.x-player.x)**2+(f.y-player.y)**2;
      if (d2<f.r*f.r) applyDamageToPlayer(8*dt, f.x, f.y);
      for (const bt of bots) {
        if (!bt.alive) continue;
        const bd2=(f.x-bt.x)**2+(f.y-bt.y)**2;
        if (bd2<f.r*f.r) {
          damageBot(bt, 9*dt, 'molotov fire', { message:`${bt.name} burned out (+15)` });
          if (false && bt.hp <= 0) {
            bt.alive=false; player.kills++;
            spawnBlood(bt.x, bt.y);
            coins+=15; saveCoins();
            killFeed.push({text:`${bt.name} burned out (+15)`,life:4});
          }
        }
      }
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
      const pulse = 0.75 + Math.sin(gameTime * 4 + it.x * 0.01) * 0.25;
      ctx.fillStyle=it.indoor ? `rgba(0,212,255,${0.10 + pulse*0.08})` : `rgba(255,220,0,${0.12 + pulse*0.08})`;
      ctx.beginPath(); ctx.arc(it.x,it.y,16 + pulse*2,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=it.supply ? 'rgba(80,255,150,0.7)' : 'rgba(255,235,120,0.62)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(it.x,it.y,16,0,Math.PI*2); ctx.stroke();
      ctx.font='16px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(ICONS[it.key]||'?', it.x, it.y);
      if (Math.hypot(player.x-it.x, player.y-it.y) < 95) {
        ctx.fillStyle='rgba(0,0,0,0.58)';
        ctx.fillRect(it.x-42,it.y+18,84,16);
        ctx.fillStyle='#fff'; ctx.font='bold 9px monospace';
        const label = it.supply ? it.key.replace('_',' ') : (WEAPONS[it.key]?.name || it.key);
        ctx.fillText(label.toUpperCase(), it.x, it.y+29);
      }
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
  function applyDamageToPlayer(rawDmg, sourceX = null, sourceY = null) {
    if (!player.alive) return;
    let dmg = rawDmg;
    if (player.armor > 0) {
      const absorbed = Math.min(dmg * 0.55, player.armor);
      player.armor = Math.max(0, player.armor - absorbed);
      dmg -= absorbed;
    }
    player.health = Math.max(0, player.health - dmg);
    damageIndicator.life = 0.85;
    damageIndicator.angle = sourceX == null ? player.angle + Math.PI : Math.atan2(sourceY - player.y, sourceX - player.x);
    if (dmg > 2) spawnBlood(player.x, player.y);
    if (player.health <= 0) {
      player.alive = false;
      gamePhase = 'dead';
      spawnBlood(player.x, player.y);
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
    dmgNumbers.push({ x:wx, y:wy, val:Number.isFinite(val) ? Math.ceil(val) : String(val), life:1.2, maxLife:1.2, col:col||'#ff4444' });
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
      coins += 100; saveCoins();
      killFeed.push({text:'VICTORY ROYALE! (+100 💰)', life:999});
    }
  }

  // ── Skin locker ───────────────────────────────────────────
  function drawSkinPreview(px, py, scale) {
    const hd=HEADS.find(h=>h.id===playerSkin.head)||HEADS[0];
    const bd=BODIES.find(b=>b.id===playerSkin.body)||BODIES[0];
    const pd=PANTS.find(p=>p.id===playerSkin.pants)||PANTS[0];
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(scale, scale);
    ctx.fillStyle=bd.color;
    ctx.beginPath(); ctx.ellipse(0,2,7,9,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=pd.color;
    ctx.beginPath(); ctx.ellipse(0,9,5.5,4.5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=hd.color;
    ctx.beginPath(); ctx.arc(0,-8,5.5,0,Math.PI*2); ctx.fill();
    if (hd.crown) {
      ctx.fillStyle='#ffd700';
      ctx.beginPath();
      ctx.moveTo(-4,-13); ctx.lineTo(-2,-17); ctx.lineTo(0,-14); ctx.lineTo(2,-17); ctx.lineTo(4,-13); ctx.closePath();
      ctx.fill();
    } else if (hd.beak) {
      ctx.fillStyle='#ff8c00';
      ctx.beginPath(); ctx.moveTo(3,-7); ctx.lineTo(9,-10); ctx.lineTo(9,-5); ctx.closePath(); ctx.fill();
    } else if (hd.mask) {
      ctx.fillStyle='rgba(0,0,0,0.75)'; ctx.fillRect(-4,-12,8,6);
    } else {
      ctx.fillStyle='#4a4a2a';
      ctx.beginPath(); ctx.arc(0,-9,5.9,Math.PI,Math.PI*2); ctx.fill();
      ctx.fillRect(-6,-9,12,2);
    }
    if (hd.eyes==='red') {
      ctx.fillStyle='#ff2020';
      ctx.beginPath(); ctx.arc(-2,-9,1.2,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(2,-9,1.2,0,Math.PI*2); ctx.fill();
    } else if (hd.eyes==='black') {
      ctx.fillStyle='#151515';
      ctx.beginPath(); ctx.arc(-2,-9,1.5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(2,-9,1.5,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  function drawSkinMenu() {
    const bg=ctx.createLinearGradient(0,0,0,canvasH);
    bg.addColorStop(0,'#080f18'); bg.addColorStop(1,'#101e2a');
    ctx.fillStyle=bg; ctx.fillRect(0,0,canvasW,canvasH);

    // Stars
    const srng=seededRng(42);
    ctx.globalAlpha=1;
    for (let i=0;i<90;i++) {
      const a=0.12+srng()*0.35, sz=0.8+srng()*1.6;
      ctx.fillStyle=`rgba(255,255,255,${a})`;
      ctx.fillRect(srng()*canvasW, srng()*canvasH, sz, sz);
    }

    // Title
    ctx.shadowColor='rgba(255,215,0,0.55)'; ctx.shadowBlur=16;
    ctx.fillStyle='#ffd700';
    ctx.font=`bold 26px monospace`; ctx.textAlign='center';
    ctx.fillText('⚔  BATTLE ROYALE  LOCKER', canvasW/2, 28);
    ctx.shadowBlur=0;

    // Coins badge (top-right)
    const cbx=canvasW-158, cby=8, cbw=148, cbh=26;
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(cbx,cby,cbw,cbh);
    ctx.strokeStyle='rgba(255,215,0,0.45)'; ctx.lineWidth=1.5; ctx.strokeRect(cbx,cby,cbw,cbh);
    ctx.fillStyle='#ffd700'; ctx.font='bold 13px monospace'; ctx.textAlign='center';
    ctx.fillText(`💰  ${coins} coins`, cbx+cbw/2, cby+18);

    // Player preview badge
    const pvX=cbx-52, pvY=cby+13;
    ctx.fillStyle='rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.arc(pvX,pvY,22,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(255,215,0,0.4)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(pvX,pvY,22,0,Math.PI*2); ctx.stroke();
    drawSkinPreview(pvX, pvY, 1.7);

    // Tab bar
    const tabs=['head','body','pants','trail'];
    const tabLabels=['👤 HEAD','👕 BODY','👖 PANTS','✨ TRAIL'];
    const tbY=44, tbH=30, tbW=(canvasW-40)/4;
    skinTabRects=[];
    for (let i=0;i<4;i++) {
      const tx=20+i*tbW;
      const active=skinMenuTab===tabs[i];
      ctx.fillStyle=active?'rgba(255,215,0,0.22)':'rgba(255,255,255,0.05)';
      ctx.fillRect(tx,tbY,tbW-5,tbH);
      ctx.strokeStyle=active?'rgba(255,215,0,0.85)':'rgba(255,255,255,0.15)';
      ctx.lineWidth=active?2:1; ctx.strokeRect(tx,tbY,tbW-5,tbH);
      ctx.fillStyle=active?'#ffd700':'rgba(200,200,200,0.7)';
      ctx.font=`bold 12px monospace`; ctx.textAlign='center';
      ctx.fillText(tabLabels[i], tx+(tbW-5)/2, tbY+20);
      skinTabRects.push({x:tx,y:tbY,w:tbW-5,h:tbH,tab:tabs[i]});
    }

    // Item grid
    const items=skinMenuTab==='head'?HEADS:skinMenuTab==='body'?BODIES:skinMenuTab==='pants'?PANTS:TRAILS;
    const cols=3, gx=20, gy=tbY+tbH+8;
    const iw=Math.floor((canvasW-40)/cols);
    const ih=Math.min(70, Math.floor((canvasH-gy-68)/Math.ceil(items.length/cols))-6);
    skinItemRects=[];
    for (let i=0;i<items.length;i++) {
      const itm=items[i];
      const col=i%cols, row=Math.floor(i/cols);
      const ix=gx+col*iw, iy=gy+row*(ih+6);
      const owned=(ownedSkins[skinMenuTab]||[]).includes(itm.id);
      const selected=playerSkin[skinMenuTab]===itm.id;
      const canAfford=coins>=itm.price;

      ctx.fillStyle=selected?'rgba(255,215,0,0.17)':(owned?'rgba(80,200,80,0.08)':'rgba(0,0,0,0.42)');
      ctx.fillRect(ix,iy,iw-6,ih);
      ctx.strokeStyle=selected?'rgba(255,215,0,0.9)':(owned?'rgba(100,220,100,0.45)':'rgba(255,255,255,0.1)');
      ctx.lineWidth=selected?2.5:1; ctx.strokeRect(ix,iy,iw-6,ih);

      // Swatch
      const sw=ih*0.44;
      if (skinMenuTab==='trail') {
        const ti={none:'—',fire:'🔥',sparkle:'✨',rainbow:'🌈'};
        ctx.font=`${sw*0.85}px serif`; ctx.textAlign='left'; ctx.textBaseline='middle';
        ctx.fillText(ti[itm.id]||'?', ix+8, iy+ih/2);
        ctx.textBaseline='alphabetic';
      } else {
        ctx.fillStyle=itm.color||'#888';
        ctx.beginPath(); ctx.arc(ix+8+sw/2, iy+ih/2, sw/2, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.25)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.arc(ix+8+sw/2, iy+ih/2, sw/2, 0, Math.PI*2); ctx.stroke();
      }

      const tx2=ix+10+sw;
      ctx.fillStyle='#fff'; ctx.font=`bold 12px monospace`; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
      ctx.fillText(itm.name, tx2, iy+ih*0.42);

      if (selected) {
        ctx.fillStyle='#ffd700'; ctx.font='10px monospace';
        ctx.fillText('✓ EQUIPPED', tx2, iy+ih*0.75);
      } else if (owned) {
        ctx.fillStyle='#8fce50'; ctx.font='10px monospace';
        ctx.fillText('OWNED', tx2, iy+ih*0.75);
      } else {
        ctx.fillStyle=canAfford?'#ffd700':'#777'; ctx.font='10px monospace';
        ctx.fillText(`💰 ${itm.price}`, tx2, iy+ih*0.75);
        if (!canAfford) {
          ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(ix,iy,iw-6,ih);
        }
      }
      skinItemRects.push({x:ix,y:iy,w:iw-6,h:ih,item:itm,owned,selected});
    }

    // PLAY button
    const bw=200, bh=44, bx2=canvasW/2-bw/2, by2=canvasH-bh-12;
    const playGrad=ctx.createLinearGradient(bx2,by2,bx2,by2+bh);
    playGrad.addColorStop(0,'rgba(30,200,80,0.95)'); playGrad.addColorStop(1,'rgba(15,140,50,0.95)');
    ctx.fillStyle=playGrad; ctx.fillRect(bx2,by2,bw,bh);
    ctx.shadowColor='rgba(0,255,80,0.5)'; ctx.shadowBlur=14;
    ctx.strokeStyle='rgba(80,255,130,0.9)'; ctx.lineWidth=2.5; ctx.strokeRect(bx2,by2,bw,bh);
    ctx.shadowBlur=0;
    ctx.fillStyle='#fff'; ctx.font='bold 17px monospace'; ctx.textAlign='center';
    ctx.fillText('▶  BATTLE ROYALE', bx2+bw/2, by2+bh*0.65);
    skinBtnPlay={x:bx2,y:by2,w:bw,h:bh};
    ctx.textAlign='left';
  }

  function checkSkinMenuClick(gx, gy) {
    if (gamePhase !== 'skinSelect') return false;
    for (const tr of skinTabRects) {
      if (gx>=tr.x&&gx<=tr.x+tr.w&&gy>=tr.y&&gy<=tr.y+tr.h) {
        skinMenuTab=tr.tab; return true;
      }
    }
    for (const ir of skinItemRects) {
      if (gx>=ir.x&&gx<=ir.x+ir.w&&gy>=ir.y&&gy<=ir.y+ir.h) {
        const cat=skinMenuTab;
        if (ir.owned) {
          playerSkin[cat]=ir.item.id; saveSkin();
        } else if (coins>=ir.item.price) {
          coins-=ir.item.price; saveCoins();
          if (!ownedSkins[cat]) ownedSkins[cat]=[];
          if (!ownedSkins[cat].includes(ir.item.id)) ownedSkins[cat].push(ir.item.id);
          saveOwned();
          playerSkin[cat]=ir.item.id; saveSkin();
        }
        return true;
      }
    }
    if (skinBtnPlay && gx>=skinBtnPlay.x&&gx<=skinBtnPlay.x+skinBtnPlay.w&&gy>=skinBtnPlay.y&&gy<=skinBtnPlay.y+skinBtnPlay.h) {
      gamePhase='parachute'; return true;
    }
    return false;
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

    if (gameEndTimer > 1) {
      // Play Again button
      const bw=160, bh=44, gap=16;
      const playX = cx - bw - gap/2, quitX = cx + gap/2, btnY = canvasH - 80;
      ctx.fillStyle=`rgba(20,160,60,${alpha*0.9})`;
      ctx.fillRect(playX, btnY, bw, bh);
      ctx.strokeStyle=`rgba(80,255,120,${alpha})`; ctx.lineWidth=2;
      ctx.strokeRect(playX, btnY, bw, bh);
      ctx.fillStyle=`rgba(255,255,255,${alpha})`; ctx.font='bold 15px monospace'; ctx.textAlign='center';
      ctx.fillText('▶ PLAY AGAIN', playX+bw/2, btnY+28);
      endBtnPlay = {x:playX, y:btnY, w:bw, h:bh};

      // Quit button
      ctx.fillStyle=`rgba(180,30,30,${alpha*0.9})`;
      ctx.fillRect(quitX, btnY, bw, bh);
      ctx.strokeStyle=`rgba(255,80,80,${alpha})`; ctx.lineWidth=2;
      ctx.strokeRect(quitX, btnY, bw, bh);
      ctx.fillStyle=`rgba(255,255,255,${alpha})`; ctx.font='bold 15px monospace';
      ctx.fillText('✕ QUIT', quitX+bw/2, btnY+28);
      endBtnQuit = {x:quitX, y:btnY, w:bw, h:bh};
    } else {
      endBtnPlay = null; endBtnQuit = null;
    }
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
    if (viewMode === 'fps') {
      if (e.buttons || document.pointerLockElement === canvas) {
        player.angle += (e.movementX || 0) * 0.0042;
      }
      return;
    }
    const rect=canvas.getBoundingClientRect();
    const mx=(e.clientX-rect.left)*(canvas.width/rect.width);
    const my=(e.clientY-rect.top)*(canvas.height/rect.height);
    player.angle=Math.atan2(my-canvasH/2, mx-canvasW/2);
  }

  function checkEndBtnClick(gx, gy) {
    if ((gamePhase==='dead'||gamePhase==='win') && gameEndTimer>1) {
      if (endBtnPlay && gx>=endBtnPlay.x && gx<=endBtnPlay.x+endBtnPlay.w && gy>=endBtnPlay.y && gy<=endBtnPlay.y+endBtnPlay.h) {
        restartGame(); return true;
      }
      if (endBtnQuit && gx>=endBtnQuit.x && gx<=endBtnQuit.x+endBtnQuit.w && gy>=endBtnQuit.y && gy<=endBtnQuit.y+endBtnQuit.h) {
        goToPage('games'); return true;
      }
    }
    return false;
  }

  function checkWeaponSlotClick(gx, gy) {
    const slotW=110, slotH=44, gap=8, startX=canvasW/2-slotW-gap/2, y=canvasH-slotH-12;
    for (let i=0; i<2; i++) {
      const sx = startX + i*(slotW+gap);
      if (gx>=sx && gx<=sx+slotW && gy>=y && gy<=y+slotH) {
        activeSlot = i; return true;
      }
    }
    return false;
  }

  function onMouseDown(e) {
    if (e.button!==0) return;
    // Convert mouse coords to game coords (portrait rotation handled)
    const rect=canvas.getBoundingClientRect();
    const sx=(e.clientX-rect.left)*(canvas.width/rect.width);
    const sy=(e.clientY-rect.top)*(canvas.height/rect.height);
    const port = canvas.height > canvas.width;
    const gx = port ? sy : sx;
    const gy = port ? (canvas.width - sx) : sy;

    if (checkEndBtnClick(gx, gy)) return;
    if (checkSkinMenuClick(gx, gy)) return;
    if (gamePhase !== 'playing') return;
    if (checkWeaponSlotClick(gx, gy)) return;
    const key=inventory[activeSlot];
    if (key) tryFire(player.x,player.y,player.angle,key,localId);
  }

  function onAnyKeyForExit(e) {
    if (gamePhase==='dead'||gamePhase==='win') {
      if (gameEndTimer>1.5) goToPage('games');
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
          if (it.supply || it.key === 'grenade' || it.key === 'molotov') continue;
          const d=Math.sqrt((it.x-bt.x)**2+(it.y-bt.y)**2);
          if (d<cdist){cdist=d;closest=it;}
        }
        if (closest && cdist<400) {
          const al=Math.atan2(closest.y-bt.y,closest.x-bt.x);
          bt.x+=Math.cos(al)*130*dt; bt.y+=Math.sin(al)*130*dt; bt.angle=al;
          if (cdist<30 && WEAPONS[closest.key]) { bt.weapon=closest.key; bt.ammo=WEAPONS[closest.key].ammo; loot.splice(loot.indexOf(closest),1); }
          continue;
        }
      }

      const dx=player.x-bt.x, dy=player.y-bt.y;
      const distToPlayer=Math.sqrt(dx*dx+dy*dy);
      if (distToPlayer<350) bt.state='chase'; else if (distToPlayer>550) bt.state='roam';

      if (bt.state==='chase') {
        bt.angle=Math.atan2(dy,dx);
        const indoor = isInsideBuilding(bt.x, bt.y) || isInsideBuilding(player.x, player.y);
        const flank = indoor ? Math.sin(gameTime * 1.7 + bt.x * 0.01) * 0.55 : 0;
        const moveAngle = bt.angle + (distToPlayer < 130 ? Math.PI * 0.55 : flank);
        const coverNear = nearestInteriorCover(bt.x, bt.y, 150);
        if (coverNear && distToPlayer < 260 && bt.hp < 55) {
          const ca = Math.atan2(coverNear.y - bt.y, coverNear.x - bt.x);
          bt.x+=Math.cos(ca)*105*dt; bt.y+=Math.sin(ca)*105*dt;
        } else {
          bt.x+=Math.cos(moveAngle)*118*dt; bt.y+=Math.sin(moveAngle)*118*dt;
        }
        if (distToPlayer<320 && bt.ammo>0 && now>bt.fireT) {
          tryFire(bt.x,bt.y,bt.angle+(Math.random()-0.5)*(indoor ? 0.09 : 0.14),bt.weapon||'pistol',bt.id);
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

      for (const bo of boulders) {
        const bdx=bt.x-bo.x, bdy=bt.y-bo.y;
        const bd=Math.sqrt(bdx*bdx+bdy*bdy);
        if (bd < PLAYER_R + bo.r) {
          const push=(PLAYER_R+bo.r-bd)/bd||0;
          bt.x+=bdx*push; bt.y+=bdy*push;
        }
      }
      resolveInteriorCollision(bt, PLAYER_R);

      const zd=Math.sqrt((bt.x-zone.cx)**2+(bt.y-zone.cy)**2);
      if (zd>zone.r) damageBot(bt, 4*dt, 'storm zone', { credit:false, message:`${bt.name} was lost in the storm` });
      if (false && bt.hp<=0) {
        bt.alive=false; player.kills++;
        spawnBlood(bt.x, bt.y);
        coins+=15; saveCoins();
        killFeed.push({text:`You killed ${bt.name} (+15 💰)`,life:4});
      }
    }
  }

  // ── Restart game (no re-adding event listeners) ───────────
  function restartGame() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    player.x=0; player.y=PLANE_Y; player.health=100; player.armor=0; player.alive=true; player.kills=0;
    gamePhase='skinSelect'; gameEndTimer=0; totalKills=0;
    paraPlane={x:0, speed:280}; paraDeployed=false; paraZ=800; paraVZ=0; paraLanded=false;
    stance='stand'; shakeAmt=0; shakeX=0; shakeY=0; muzzleFlash=0;
    moveVel={x:0,y:0}; adsActive=false; jumpBoost=0; recoilKick=0; healCharges=0;
    damageIndicator={life:0,angle:0}; pickupBanner={text:'',life:0};
    dmgNumbers=[]; hitMarker=0; spectateTarget=null; spectateCam={x:player.x,y:player.y};
    cam.x=player.x; cam.y=player.y;
    inventory=[]; ammoCache={}; activeSlot=0; reloading=false;
    bullets=[]; throwables=[]; fires=[]; explosions=[]; killFeed=[];
    bloodSplatters=[]; trailParticles=[]; endBtnPlay=null; endBtnQuit=null;
    airdrop=null; airdropTimer=0; broadcastThrottle=0;
    spawnLoot(); spawnBots(); initZone(); destroyMultiplayer(); initMultiplayer();
    running = true;
    lastTime = performance.now();
    animId = requestAnimationFrame(loop);
  }

  // ── Public API ────────────────────────────────────────────
  return { init, destroy };
})();
