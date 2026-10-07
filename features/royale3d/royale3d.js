/* Battle Royale 3D — first-person Godot web build served from /features/royale3d/game/.
 * Like the dungeon, the iframe is only created when the page opens (the game is ~12 MB
 * compressed) and is removed on leave to free WebGL memory and stop audio. Coins earned in a
 * match are added to the same balance as the 2D Battle Royale ('rl_coins_v1'). */
(function () {
  const GAME_URL = 'features/royale3d/game/index.html?v=4';

  let frame = null;

  function el(id) { return document.getElementById(id); }

  function setStatus(text) {
    const s = el('royale3d-status');
    if (!s) return;
    s.textContent = text || '';
    s.classList.toggle('hidden', !text);
  }

  function init() {
    const stage = el('royale3d-stage');
    if (!stage || frame) return;
    setStatus('Loading the island… the first time takes a moment, later visits are faster.');
    frame = document.createElement('iframe');
    frame.id = 'royale3d-frame';
    frame.title = 'Battle Royale 3D';
    frame.setAttribute('allow', 'fullscreen; autoplay; gamepad; screen-wake-lock');
    frame.setAttribute('allowfullscreen', '');
    frame.addEventListener('load', () => {
      setStatus('');
      try { frame.focus(); } catch (_) {}
    });
    frame.src = GAME_URL;
    stage.appendChild(frame);
  }

  function destroy() {
    window.classAppRooms?.gameClosed?.();   // leaving mid-match counts as quitting it
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    try { screen.orientation?.unlock?.(); } catch (_) {}
    if (frame) { frame.src = 'about:blank'; frame.remove(); frame = null; }
    setStatus('');
  }

  async function toggleFullscreen() {
    const page = el('page-royale3d');
    if (!page) return;
    if (document.fullscreenElement) { await document.exitFullscreen?.().catch(() => {}); return; }
    if (!page.requestFullscreen) { window.open(GAME_URL, '_blank', 'noopener'); return; } // iPhone Safari
    try {
      await page.requestFullscreen({ navigationUI: 'hide' });
      await screen.orientation?.lock?.('landscape').catch(() => {});
    } catch (_) {
      window.open(GAME_URL, '_blank', 'noopener');
    }
    try { frame?.focus(); } catch (_) {}
  }

  // The game asks to leave (fallback when it can't call goToPage directly)
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type === 'royale3d-exit') window.goToPage?.('games');
  });

  window.royale3dModule = { init, destroy, toggleFullscreen };
})();
