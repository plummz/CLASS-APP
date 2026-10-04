/* ============================================================
   POKÉMON WORLD ART — loads the Blender-rendered art and draws it.
   Used by pokemon.js. Everything here is optional: if the art can't
   load (offline, old cache), the game keeps its built-in drawing.
   Art is rendered at 2x (64 px per tile); the game works in 32 px tiles.
   ============================================================ */
(function () {
  const BASE = 'features/pokemon/art/';
  const TILE = 32;                  // game pixels per tile
  const ART_SCALE = 0.5;            // art pixels → game pixels
  const WORLD_GROUPS = ['terrain', 'nature', 'buildings', 'chars'];

  let manifest = null;
  let manifestPromise = null;
  const images = {};                // key → HTMLImageElement (decoded)
  const loading = {};               // key → Promise
  let worldReady = false;

  function fileUrl(entry) {
    return BASE + entry.file + (entry.v ? `?v=${entry.v}` : '');
  }

  function loadManifest() {
    if (manifestPromise) return manifestPromise;
    manifestPromise = fetch(BASE + 'manifest.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => { manifest = m && m.assets ? m : null; return manifest; })
      .catch(() => null);
    return manifestPromise;
  }

  function loadKey(key) {
    if (images[key]) return Promise.resolve(images[key]);
    if (loading[key]) return loading[key];
    const entry = manifest && manifest.assets[key];
    if (!entry) return Promise.resolve(null);
    loading[key] = new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        const done = () => { images[key] = img; resolve(img); };
        if (img.decode) img.decode().then(done, done); else done();
      };
      img.onerror = () => { delete loading[key]; resolve(null); };
      img.src = fileUrl(entry);
    });
    return loading[key];
  }

  function keysInGroups(groups) {
    if (!manifest) return [];
    return Object.keys(manifest.assets).filter((k) => {
      const g = manifest.assets[k].file.split('/')[0];
      return groups.includes(g);
    });
  }

  /* ── Public: loading ── */
  function init() {
    return loadManifest().then((m) => {
      if (!m) return false;
      return Promise.all(keysInGroups(WORLD_GROUPS).map(loadKey)).then(() => {
        // The world counts as ready when the essentials are there
        worldReady = ['grass', 'path', 'tree', 'player'].every((k) => images[k]);
        return worldReady;
      });
    });
  }

  function has(key) { return Boolean(images[key]); }
  function info(key) { return manifest && manifest.assets[key] ? manifest.assets[key] : null; }
  function url(key) { const e = info(key); return e ? fileUrl(e) : ''; }
  function load(keys) { return loadManifest().then(() => Promise.all([].concat(keys).map(loadKey))); }

  /* ── Public: drawing ── */
  // Draw frame `index` of `key` so the asset's anchor lands on (x, y) in game pixels.
  function drawAnchored(ctx, key, index, x, y, opts) {
    const img = images[key];
    const e = img && manifest.assets[key];
    if (!e) return false;
    const i = Math.max(0, Math.min(e.frames - 1, index | 0));
    const sx = (i % e.cols) * e.fw;
    const sy = Math.floor(i / e.cols) * e.fh;
    const s = (opts && opts.scale) || ART_SCALE;
    const ax = (e.ax || 0) * s;
    const ay = (e.ay || 0) * s;
    if (opts && opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
    ctx.drawImage(img, sx, sy, e.fw, e.fh, x - ax, y - ay, e.fw * s, e.fh * s);
    if (opts && opts.alpha !== undefined) ctx.globalAlpha = 1;
    return true;
  }

  // Bounding box (game px) an anchored draw would cover, for culling.
  function bounds(key, x, y, scale) {
    const e = info(key);
    if (!e) return null;
    const s = scale || ART_SCALE;
    const left = x - (e.ax || 0) * s;
    const top = y - (e.ay || 0) * s;
    return { left, top, right: left + e.fw * s, bottom: top + e.fh * s };
  }

  function drawTile(ctx, key, index, x, y) {
    const img = images[key];
    const e = img && manifest.assets[key];
    if (!e) return false;
    const i = index % e.frames;
    ctx.drawImage(img, (i % e.cols) * e.fw, Math.floor(i / e.cols) * e.fh, e.fw, e.fh, x, y, TILE, TILE);
    return true;
  }

  function frameCount(key) { const e = info(key); return e ? e.frames : 0; }

  /* ── Ground cache ──────────────────────────────────────────
     The map's ground is drawn once into 8×8-tile chunks (with soft edges
     between terrain types) and reused every frame. Water is left as holes
     so the animated water can show through from underneath. */
  const CHUNK = 8;
  const MAX_CHUNKS = 24;
  // Higher priority terrain spills its texture over the edge of lower priority terrain.
  const PRIORITY = { grass: 5, rock_ground: 4, path: 3, sand: 2 };
  const EDGE_BAND = 11;  // game px

  function hash(x, y, salt) {
    let h = (x * 374761393 + y * 668265263 + (salt || 0) * 2147483647) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0);
  }

  // Irregular edge masks (white = keep), built once per scale.
  const maskCache = {};
  function edgeMask(dir, scale) {
    const id = dir + '@' + scale;
    if (maskCache[id]) return maskCache[id];
    const size = Math.round(TILE * scale);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const band = EDGE_BAND * scale;
    const steps = 16;
    // A wobbly line, then a soft gradient behind it.
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps;
      const wob = band * (0.55 + 0.45 * Math.sin(i * 1.7 + (dir.length * 2.1)) * Math.cos(i * 0.9));
      const along0 = t0 * size;
      const along1 = (i + 1) / steps * size + 1;
      let grd;
      if (dir === 'n') { grd = g.createLinearGradient(0, 0, 0, wob); }
      if (dir === 's') { grd = g.createLinearGradient(0, size, 0, size - wob); }
      if (dir === 'w') { grd = g.createLinearGradient(0, 0, wob, 0); }
      if (dir === 'e') { grd = g.createLinearGradient(size, 0, size - wob, 0); }
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.65, 'rgba(255,255,255,0.75)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      if (dir === 'n') g.fillRect(along0, 0, along1 - along0, wob);
      if (dir === 's') g.fillRect(along0, size - wob, along1 - along0, wob);
      if (dir === 'w') g.fillRect(0, along0, wob, along1 - along0);
      if (dir === 'e') g.fillRect(size - wob, along0, wob, along1 - along0);
    }
    maskCache[id] = c;
    return c;
  }

  let scratch = null;
  function scratchCanvas(size) {
    if (!scratch || scratch.width !== size) {
      scratch = document.createElement('canvas');
      scratch.width = scratch.height = size;
    }
    return scratch;
  }

  function createGroundCache(opts) {
    // opts: { mapW, mapH, terrainAt(tx,ty) → key|null (null = water), scale }
    const scale = opts.scale || 1;
    const chunks = new Map();
    const tileTerrain = (tx, ty) => {
      if (tx < 0 || ty < 0 || tx >= opts.mapW || ty >= opts.mapH) return opts.terrainAt(Math.max(0, Math.min(opts.mapW - 1, tx)), Math.max(0, Math.min(opts.mapH - 1, ty)));
      return opts.terrainAt(tx, ty);
    };
    const variant = (key, tx, ty) => hash(tx, ty, 7) % Math.max(1, frameCount(key));

    function buildChunk(cx, cy) {
      const px = Math.round(CHUNK * TILE * scale);
      const c = document.createElement('canvas');
      c.width = c.height = px;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = true;
      g.scale(scale, scale);
      const x0 = cx * CHUNK, y0 = cy * CHUNK;
      // Pass 1: base textures
      for (let ty = y0; ty < y0 + CHUNK && ty < opts.mapH; ty++) {
        for (let tx = x0; tx < x0 + CHUNK && tx < opts.mapW; tx++) {
          const key = tileTerrain(tx, ty);
          if (!key) continue;
          drawTile(g, key, variant(key, tx, ty), (tx - x0) * TILE, (ty - y0) * TILE);
        }
      }
      // Pass 2: soft edges — the higher-priority (or land next to water) neighbour spills in
      const tsize = Math.round(TILE * scale);
      const tmp = scratchCanvas(tsize);
      const tg = tmp.getContext('2d');
      const dirs = [['n', 0, -1], ['s', 0, 1], ['w', -1, 0], ['e', 1, 0]];
      for (let ty = y0; ty < y0 + CHUNK && ty < opts.mapH; ty++) {
        for (let tx = x0; tx < x0 + CHUNK && tx < opts.mapW; tx++) {
          const here = tileTerrain(tx, ty);
          if (here && !(here in PRIORITY)) continue;   // interior floors etc.: no blending
          for (const [d, dx, dy] of dirs) {
            const nb = tileTerrain(tx + dx, ty + dy);
            if (!nb || nb === here || !(nb in PRIORITY)) continue;
            if (here && PRIORITY[nb] <= PRIORITY[here]) continue;
            // neighbour texture, continued as if it extended into this tile
            tg.setTransform(1, 0, 0, 1, 0, 0);
            tg.globalCompositeOperation = 'source-over';
            tg.clearRect(0, 0, tsize, tsize);
            tg.setTransform(scale, 0, 0, scale, 0, 0);
            drawTile(tg, nb, variant(nb, tx + dx, ty + dy), 0, 0);
            tg.setTransform(1, 0, 0, 1, 0, 0);
            tg.globalCompositeOperation = 'destination-in';
            tg.drawImage(edgeMask(d, scale), 0, 0);
            tg.globalCompositeOperation = 'source-over';
            g.drawImage(tmp, (tx - x0) * TILE, (ty - y0) * TILE, TILE, TILE);
          }
        }
      }
      return c;
    }

    function draw(ctx, camX, camY, viewW, viewH) {
      const cx0 = Math.max(0, Math.floor(camX / (CHUNK * TILE)));
      const cy0 = Math.max(0, Math.floor(camY / (CHUNK * TILE)));
      const cx1 = Math.floor((camX + viewW) / (CHUNK * TILE));
      const cy1 = Math.floor((camY + viewH) / (CHUNK * TILE));
      for (let cy = cy0; cy <= cy1; cy++) {
        for (let cx = cx0; cx <= cx1; cx++) {
          if (cx * CHUNK >= opts.mapW || cy * CHUNK >= opts.mapH) continue;
          const id = cx + ',' + cy;
          let c = chunks.get(id);
          if (!c) {
            c = buildChunk(cx, cy);
            chunks.set(id, c);
            if (chunks.size > MAX_CHUNKS) chunks.delete(chunks.keys().next().value);
          } else {
            chunks.delete(id); chunks.set(id, c);   // keep recently used last
          }
          ctx.drawImage(c, Math.round(cx * CHUNK * TILE - camX), Math.round(cy * CHUNK * TILE - camY), CHUNK * TILE, CHUNK * TILE);
        }
      }
    }

    return { draw, clear: () => chunks.clear(), scale };
  }

  /* ── Daylight ─────────────────────────────────────────────
     Follows the phone's clock: day, golden evening, blue night. */
  function daylight(date) {
    const d = date || new Date();
    const h = d.getHours() + d.getMinutes() / 60;
    // night amount 0..1 and a warm amount for dawn/dusk
    let night = 0, warm = 0;
    if (h >= 19.5 || h < 5) night = 1;
    else if (h >= 17.5) { warm = Math.min(1, (h - 17.5) / 1.2); night = Math.max(0, (h - 18.7) / 0.8); }
    else if (h < 6.5) { night = Math.max(0, 6 - h); warm = Math.max(0, 1 - Math.abs(h - 6) / 0.5) * 0.7; }
    night = Math.max(0, Math.min(1, night));
    warm = Math.max(0, Math.min(1, warm)) * (1 - night * 0.6);
    return { night, warm, label: night > 0.6 ? 'night' : warm > 0.3 ? 'evening' : 'day' };
  }

  let lightCanvas = null;
  function drawLighting(ctx, viewW, viewH, light, lights) {
    if (light.night < 0.02 && light.warm < 0.02) return;
    const w = Math.ceil(viewW / 2), h = Math.ceil(viewH / 2);  // half-res light map is plenty
    if (!lightCanvas) lightCanvas = document.createElement('canvas');
    if (lightCanvas.width !== w || lightCanvas.height !== h) { lightCanvas.width = w; lightCanvas.height = h; }
    const g = lightCanvas.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    // multiply colour: warm orange in the evening, deep blue at night
    const r = Math.round(255 - light.night * 170 - light.warm * 10);
    const gg = Math.round(255 - light.night * 160 - light.warm * 60);
    const b = Math.round(255 - light.night * 95 - light.warm * 120);
    g.fillStyle = `rgb(${r},${gg},${b})`;
    g.fillRect(0, 0, w, h);
    if (light.night > 0.05 && lights && lights.length) {
      g.globalCompositeOperation = 'lighter';
      for (const L of lights) {
        const x = L.x / 2, y = L.y / 2, rad = (L.r || 60) / 2;
        if (x < -rad || y < -rad || x > w + rad || y > h + rad) continue;
        const grd = g.createRadialGradient(x, y, 0, x, y, rad);
        const a = (L.a || 0.85) * light.night;
        grd.addColorStop(0, `rgba(255,214,150,${a})`);
        grd.addColorStop(1, 'rgba(255,214,150,0)');
        g.fillStyle = grd;
        g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    }
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(lightCanvas, 0, 0, viewW, viewH);
    ctx.restore();
    // Soft additive glow around lamps and windows
    if (light.night > 0.3 && lights && lights.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const L of lights) {
        if (!L.glow) continue;
        const grd = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.glow);
        grd.addColorStop(0, `rgba(255,200,120,${0.35 * light.night})`);
        grd.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(L.x - L.glow, L.y - L.glow, L.glow * 2, L.glow * 2);
      }
      ctx.restore();
    }
  }

  /* ── Ambience: drifting cloud shadows + light particles per zone ── */
  function createAmbience() {
    let parts = [];
    let clouds = [];
    let kind = '';
    function reset(newKind, viewW, viewH) {
      kind = newKind;
      parts = [];
      clouds = [];
      const count = { forest: 26, coast: 18, rock: 16, grass: 14, night: 22, city: 0, indoor: 0 }[kind] || 0;
      for (let i = 0; i < count; i++) parts.push(spawn(viewW, viewH, true));
      if (kind !== 'indoor') {
        for (let i = 0; i < 3; i++) clouds.push({ x: Math.random() * viewW * 1.5, y: Math.random() * viewH, r: 140 + Math.random() * 120 });
      }
    }
    function spawn(viewW, viewH, anywhere) {
      const p = { x: Math.random() * viewW, y: anywhere ? Math.random() * viewH : -10, t: Math.random() * 10, s: 0.6 + Math.random() * 0.8 };
      return p;
    }
    function update(dt, viewW, viewH) {
      for (const c of clouds) {
        c.x -= dt * 9; c.y += dt * 3;
        if (c.x < -c.r * 1.5) { c.x = viewW + c.r; c.y = Math.random() * viewH; }
        if (c.y > viewH + c.r) c.y = -c.r;
      }
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.t += dt;
        if (kind === 'forest') { p.y += dt * 22 * p.s; p.x += Math.sin(p.t * 1.6) * dt * 18; }
        else if (kind === 'coast') { p.x += dt * 10 * p.s; p.y += Math.sin(p.t) * dt * 4; }
        else if (kind === 'rock') { p.x += dt * 14 * p.s; p.y -= dt * 3; }
        else if (kind === 'night') { p.x += Math.sin(p.t * 0.9 + i) * dt * 14; p.y += Math.cos(p.t * 0.7 + i) * dt * 10; }
        else { p.y -= dt * 6 * p.s; p.x += Math.sin(p.t) * dt * 6; }
        if (p.y > viewH + 12 || p.y < -14 || p.x > viewW + 12 || p.x < -14) parts[i] = spawn(viewW, viewH, kind === 'night' || kind === 'grass');
      }
    }
    function drawShadows(ctx) {
      for (const c of clouds) {
        const grd = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
        grd.addColorStop(0, 'rgba(10,20,40,0.10)');
        grd.addColorStop(1, 'rgba(10,20,40,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2);
      }
    }
    function drawParticles(ctx) {
      for (const p of parts) {
        if (kind === 'forest') {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(p.t * 2) * 0.8);
          ctx.fillStyle = 'rgba(120,170,60,0.75)';
          ctx.beginPath(); ctx.ellipse(0, 0, 3.2 * p.s, 1.6 * p.s, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        } else if (kind === 'night') {
          const a = 0.35 + 0.35 * Math.sin(p.t * 3 + p.x);
          ctx.fillStyle = `rgba(220,255,140,${a})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, 1.6 * p.s, 0, Math.PI * 2); ctx.fill();
        } else {
          const a = 0.18 + 0.22 * Math.sin(p.t * 2 + p.y);
          ctx.fillStyle = kind === 'rock' ? `rgba(210,190,150,${a})` : `rgba(255,255,255,${a})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, 1.3 * p.s, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    return { reset, update, drawShadows, drawParticles, get kind() { return kind; } };
  }

  window.PKArt = {
    TILE, ART_SCALE,
    init, load, has, info, url,
    get ready() { return worldReady; },
    drawAnchored, drawTile, bounds, frameCount, hash,
    createGroundCache, daylight, drawLighting, createAmbience,
  };
})();
