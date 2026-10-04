/* Dungeon of Knowledge — embeds the published Study Arena 3D dungeon (Godot web build).
 * The game is ~50 MB, so the iframe is only created when the page opens and is removed
 * on leave to free WebGL memory and stop audio. */
(function () {
  const DUNGEON_URL = 'https://plummz.github.io/Study_Arena/dungeon/index.html';

  let frame = null;
  let loads = 0;

  function el(id) { return document.getElementById(id); }

  function setStatus(text) {
    const s = el('dungeon-status');
    if (!s) return;
    s.textContent = text || '';
    s.classList.toggle('hidden', !text);
  }

  function init() {
    const stage = el('dungeon-stage');
    if (!stage || frame) return;
    loads = 0;
    setStatus('Opening the dungeon… first load is about 50 MB, later visits are faster.');
    frame = document.createElement('iframe');
    frame.id = 'dungeon-frame';
    frame.title = 'Dungeon of Knowledge';
    frame.setAttribute('allow', 'fullscreen; autoplay; gamepad; screen-wake-lock');
    frame.setAttribute('allowfullscreen', '');
    frame.addEventListener('load', () => {
      loads += 1;
      // The game's own "Return to Study Arena" button navigates the frame away;
      // treat any second load as "leave the dungeon" and go back to the Arcade.
      if (loads > 1) { goToPage('games'); return; }
      setStatus('');
      try { frame.focus(); } catch (_) {}
    });
    frame.src = DUNGEON_URL;
    stage.appendChild(frame);
  }

  function destroy() {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    try { screen.orientation?.unlock?.(); } catch (_) {}
    if (frame) { frame.src = 'about:blank'; frame.remove(); frame = null; }
    setStatus('');
  }

  async function toggleFullscreen() {
    const page = el('page-dungeon');
    if (!page) return;
    if (document.fullscreenElement) { await document.exitFullscreen?.().catch(() => {}); return; }
    if (!page.requestFullscreen) { openNewTab(); return; } // iPhone Safari: no element fullscreen
    try {
      await page.requestFullscreen({ navigationUI: 'hide' });
      await screen.orientation?.lock?.('landscape').catch(() => {});
    } catch (_) {
      openNewTab();
    }
    try { frame?.focus(); } catch (_) {}
  }

  function openNewTab() {
    window.open(DUNGEON_URL, '_blank', 'noopener');
  }

  window.dungeonModule = { init, destroy, toggleFullscreen, openNewTab };
})();
