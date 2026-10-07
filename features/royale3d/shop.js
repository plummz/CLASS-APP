/* Battle Royale 3D shop: weapon finishes (with Lv 2–3 upgrades) and soldier outfits, bought with
 * the coins earned in matches (localStorage 'rl_coins_v1', shared with the 2D Battle Royale).
 * Ids, names and prices match godot/royale3d/scripts/skins.gd, which draws them in the game.
 * Owned:    'rl3d_owned_v1' = { weapon: { id: level }, outfit: [ids] }
 * Equipped: 'rl3d_equip_v1' = { weapon: id | '', outfit: id }   (read when a match starts) */
(function () {
  const COINS = 'rl_coins_v1';
  const OWNED = 'rl3d_owned_v1';
  const EQUIP = 'rl3d_equip_v1';
  const PRICE = { common: 80, rare: 200, epic: 450, legendary: 900 };
  const TIER_LABEL = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };

  const WEAPON = [
    ['olive', 'Olive Drab', 'common', 'solid', '#5b6b3c', '#3e4a29'],
    ['desert', 'Desert Tan', 'common', 'solid', '#c2a878', '#9c8459'],
    ['arctic', 'Arctic White', 'common', 'solid', '#e9eef2', '#b9c3cc'],
    ['midnight', 'Midnight', 'common', 'solid', '#1c1f26', '#0d0f13'],
    ['sunset', 'Sunset Fade', 'rare', 'gradient', '#ff7a18', '#c2185b'],
    ['ocean', 'Deep Ocean', 'rare', 'gradient', '#1ec8c8', '#102a6b'],
    ['toxic', 'Toxic Waste', 'rare', 'gradient', '#b6ff2e', '#102010'],
    ['jungle', 'Jungle Camo', 'rare', 'camo', '#4c6b2f', '#2b2416', '#8a7a4a'],
    ['lava', 'Molten Core', 'epic', 'flow', '#2a0a05', '#ff5a1a'],
    ['aurora', 'Aurora', 'epic', 'flow', '#1b1240', '#3cf2c8'],
    ['circuit', 'Circuit Pulse', 'epic', 'pulse', '#06140c', '#29ff7a'],
    ['royal', 'Royal Velvet', 'epic', 'gradient', '#6a1bb3', '#f2c94c'],
    ['prism', 'Prism', 'legendary', 'prism', '#ffffff', '#ffffff'],
    ['inferno', 'Inferno Dragon', 'legendary', 'flow', '#140202', '#ffb000'],
    ['phantom', 'Neon Phantom', 'legendary', 'pulse', '#05070d', '#37d6ff'],
    ['gold', '24K Gold', 'legendary', 'gold', '#ffd45a', '#b8860b'],
  ].map(([id, name, tier, style, a, b, c]) => ({ id, name, tier, style, a, b, c: c || b }));

  const OUTFIT = [
    ['standard', 'Standard Issue', 'common', '#8d9196', '#4a4e52', '#c4c8cc', 0],
    ['woodland', 'Woodland', 'common', '#4a5a2e', '#2e2a1d', '#6f6a45'],
    ['sand', 'Sandstorm', 'common', '#c9b083', '#8f7550', '#e2d3ae'],
    ['urban', 'Urban Grey', 'common', '#6d7378', '#33373b', '#a3a8ac'],
    ['snow', 'Snow Ops', 'rare', '#eef2f5', '#a9b4bd', '#d4dbe1'],
    ['navy', 'Navy Digital', 'rare', '#23365c', '#101a2e', '#4c6a9c'],
    ['nightops', 'Night Ops', 'rare', '#17181b', '#0a0a0c', '#5a1414'],
    ['tiger', 'Tiger Stripe', 'epic', '#3c5a22', '#0c0c08', '#8a6a2a'],
    ['crimson', 'Crimson Guard', 'epic', '#7a0f16', '#2a0508', '#c23a3a', '#ff3b3b'],
    ['ghost', 'Neon Ghost', 'legendary', '#0c0f14', '#05070a', '#1a2a33', '#37d6ff'],
    ['general', 'Golden General', 'legendary', '#d4a62a', '#6b4e12', '#f3d27a', '#ffd45a'],
  ].map(([id, name, tier, a, b, c, glow]) => ({ id, name, tier, a, b, c, glow: glow || '' }));

  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} };
  const coins = () => { try { return parseInt(localStorage.getItem(COINS) || '0', 10) || 0; } catch (_) { return 0; } };
  const setCoins = (n) => { try { localStorage.setItem(COINS, String(Math.max(0, n))); } catch (_) {} };
  const owned = () => { const o = read(OWNED, {}); return { weapon: o.weapon || {}, outfit: Array.isArray(o.outfit) ? o.outfit : [] }; };
  const equipped = () => ({ weapon: '', outfit: 'standard', ...read(EQUIP, {}) });
  const esc = (v) => (typeof escapeHTML === 'function' ? escapeHTML(v) : String(v ?? ''));
  const toast = (m, t) => (typeof showToast === 'function' ? showToast(m, t) : null);

  let tab = 'weapon';

  // Upgrade costs: Lv 2 = half the price, Lv 3 = the full price again
  const upgradeCost = (skin, level) => Math.round(PRICE[skin.tier] * (level === 1 ? 0.5 : 1));

  function swatchStyle(s) {
    switch (s.style) {
      case 'solid': return `background:linear-gradient(135deg, ${s.a}, ${s.b})`;
      case 'gradient': return `background:linear-gradient(90deg, ${s.a}, ${s.b})`;
      case 'camo': return `background:radial-gradient(circle at 20% 30%, ${s.c} 0 18%, transparent 19%), radial-gradient(circle at 70% 60%, ${s.b} 0 22%, transparent 23%), radial-gradient(circle at 45% 80%, ${s.c} 0 12%, transparent 13%), ${s.a}`;
      case 'flow': return `--fa:${s.a};--fb:${s.b}`;
      case 'pulse': return `--fa:${s.a};--fb:${s.b}`;
      case 'gold': return `background:linear-gradient(110deg, ${s.b}, ${s.a} 40%, #fff6c8 50%, ${s.a} 60%, ${s.b})`;
      default: return '';
    }
  }

  function outfitStyle(o) {
    return `background:radial-gradient(circle at 30% 35%, ${o.c} 0 16%, transparent 17%), radial-gradient(circle at 68% 62%, ${o.b} 0 20%, transparent 21%), radial-gradient(circle at 40% 78%, ${o.b} 0 11%, transparent 12%), ${o.a};${o.glow ? `box-shadow:0 0 0 2px ${o.glow}, 0 0 18px ${o.glow}` : ''}`;
  }

  function open() {
    let panel = document.getElementById('rl3d-shop');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'rl3d-shop';
      panel.className = 'rl3d-shop';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-label', 'Battle Royale shop');
      panel.addEventListener('click', onClick);
      document.body.appendChild(panel);
    }
    panel.hidden = false;
    render();
  }

  function close() {
    const panel = document.getElementById('rl3d-shop');
    if (panel) panel.hidden = true;
  }

  function render() {
    const panel = document.getElementById('rl3d-shop');
    if (!panel || panel.hidden) return;
    const own = owned();
    const eq = equipped();
    const cards = tab === 'weapon'
      ? WEAPON.map((s) => {
        const level = own.weapon[s.id] || 0;
        const isEq = eq.weapon === s.id;
        let action;
        if (!level) action = `<button type="button" class="shop-btn buy" data-buy="${s.id}">🪙 ${PRICE[s.tier]}</button>`;
        else action = `<button type="button" class="shop-btn ${isEq ? 'on' : ''}" data-equip="${s.id}">${isEq ? 'Equipped' : 'Equip'}</button>`
          + (level < 3 ? `<button type="button" class="shop-btn up" data-upgrade="${s.id}">Lv ${level + 1} · 🪙 ${upgradeCost(s, level)}</button>` : '<span class="shop-max">MAX</span>');
        return `<li class="shop-card tier-${s.tier}">
          <div class="shop-gun style-${s.style}" style="${swatchStyle(s)}"></div>
          <div class="shop-name">${esc(s.name)}</div>
          <div class="shop-meta">${TIER_LABEL[s.tier]}${level ? ` · Lv ${level}` : ''}</div>
          <div class="shop-actions">${action}</div></li>`;
      }).join('')
      : OUTFIT.map((o) => {
        const has = o.id === 'standard' || own.outfit.includes(o.id);
        const isEq = eq.outfit === o.id;
        const action = has
          ? `<button type="button" class="shop-btn ${isEq ? 'on' : ''}" data-wear="${o.id}">${isEq ? 'Wearing' : 'Wear'}</button>`
          : `<button type="button" class="shop-btn buy" data-buyo="${o.id}">🪙 ${PRICE[o.tier]}</button>`;
        return `<li class="shop-card tier-${o.tier}">
          <div class="shop-outfit" style="${outfitStyle(o)}"><span>🪖</span></div>
          <div class="shop-name">${esc(o.name)}</div>
          <div class="shop-meta">${TIER_LABEL[o.tier]}</div>
          <div class="shop-actions">${action}</div></li>`;
      }).join('');
    panel.innerHTML = `<div class="shop-card-wrap">
      <div class="shop-head">
        <strong>🛒 Battle Royale Shop</strong>
        <span class="shop-coins">🪙 ${coins()}</span>
        <button type="button" class="shop-close" data-close aria-label="Close">&times;</button>
      </div>
      <div class="shop-tabs" role="tablist">
        <button type="button" role="tab" class="${tab === 'weapon' ? 'on' : ''}" data-tab="weapon">Weapon skins</button>
        <button type="button" role="tab" class="${tab === 'outfit' ? 'on' : ''}" data-tab="outfit">Outfits</button>
      </div>
      <p class="shop-note">${tab === 'weapon' ? 'Finishes go on every gun you carry. Upgrade to Lv 2 for a polished shine and Lv 3 for a moving highlight.' : 'Outfits recolour your uniform, vest, helmet and backpack. Classmates see them in room matches.'} Changes apply to your next match. Earn coins by playing.</p>
      <ul class="shop-grid">${cards}</ul>
      ${tab === 'weapon' && equipped().weapon ? '<button type="button" class="shop-btn plain" data-equip="">Use factory finish</button>' : ''}
    </div>`;
  }

  function spend(cost) {
    const have = coins();
    if (have < cost) { toast(`You need ${cost - have} more coins. Win matches to earn more.`, 'error'); return false; }
    setCoins(have - cost);
    return true;
  }

  function onClick(e) {
    const t = e.target;
    if (t === e.currentTarget || t.closest('[data-close]')) return close();
    const tabBtn = t.closest('[data-tab]');
    if (tabBtn) { tab = tabBtn.dataset.tab; return render(); }
    const own = owned();
    const eq = equipped();
    const buy = t.closest('[data-buy]');
    if (buy) {
      const s = WEAPON.find((x) => x.id === buy.dataset.buy);
      if (s && !own.weapon[s.id] && spend(PRICE[s.tier])) {
        own.weapon[s.id] = 1;
        write(OWNED, own);
        write(EQUIP, { ...eq, weapon: s.id });
        toast(`${s.name} unlocked and equipped`, 'success');
      }
      return render();
    }
    const up = t.closest('[data-upgrade]');
    if (up) {
      const s = WEAPON.find((x) => x.id === up.dataset.upgrade);
      const level = own.weapon[s?.id] || 0;
      if (s && level >= 1 && level < 3 && spend(upgradeCost(s, level))) {
        own.weapon[s.id] = level + 1;
        write(OWNED, own);
        toast(`${s.name} upgraded to Lv ${level + 1}`, 'success');
      }
      return render();
    }
    const eqBtn = t.closest('[data-equip]');
    if (eqBtn) { write(EQUIP, { ...eq, weapon: eqBtn.dataset.equip }); return render(); }
    const buyo = t.closest('[data-buyo]');
    if (buyo) {
      const o = OUTFIT.find((x) => x.id === buyo.dataset.buyo);
      if (o && !own.outfit.includes(o.id) && spend(PRICE[o.tier])) {
        own.outfit.push(o.id);
        write(OWNED, own);
        write(EQUIP, { ...eq, outfit: o.id });
        toast(`${o.name} unlocked`, 'success');
      }
      return render();
    }
    const wear = t.closest('[data-wear]');
    if (wear) { write(EQUIP, { ...eq, outfit: wear.dataset.wear }); return render(); }
  }

  window.royale3dShop = { open, close };
})();
