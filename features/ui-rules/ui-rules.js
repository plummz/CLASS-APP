/* App-wide usability rules (from "NO FILTER — Practical Digital Product Design"):
 * 1. Every popup has three ways out: an X, its own Cancel/No/Close button, and tapping outside or
 *    pressing Esc. Outside taps and Esc press the popup's own close button, so its existing logic
 *    runs. The sign-in popup and popups marked data-no-dismiss are left alone.
 * 2. On touch screens, text fields smaller than 16px are raised to 16px so phones don't zoom in.
 * Game screens are not touched. */
(function () {
  const SKIP = '#auth-modal, [data-no-dismiss]';
  const CLOSE_SELECTORS = [
    '[data-close-modal-id]', '.modal-close-btn', '.ui-modal-x', '#confirm-no',
    '[data-dismiss]', '.btn-cancel', '.modal-cancel-btn',
  ];

  function isOpen(overlay) {
    const cs = getComputedStyle(overlay);
    // (offsetParent is always null for fixed overlays, so check the rendered boxes instead)
    return cs.display !== 'none' && cs.visibility !== 'hidden' && overlay.getClientRects().length > 0;
  }
  function closeButton(overlay) {
    for (const sel of CLOSE_SELECTORS) {
      const btn = overlay.querySelector(sel);
      if (btn && btn.offsetParent !== null) return btn;
    }
    // A plain "Cancel", "Close" or "No" button
    return [...overlay.querySelectorAll('button')].find((b) => b.offsetParent !== null && /^(cancel|close|no|not now|dismiss)$/i.test(b.textContent.trim())) || null;
  }
  function topOverlay() {
    const open = [...document.querySelectorAll('.custom-modal-overlay')].filter((o) => isOpen(o) && !o.matches(SKIP));
    return open.sort((a, b) => (parseInt(getComputedStyle(b).zIndex, 10) || 0) - (parseInt(getComputedStyle(a).zIndex, 10) || 0))[0] || null;
  }
  function dismiss(overlay) {
    const btn = closeButton(overlay);
    if (btn) { btn.click(); return true; }
    return false;
  }

  // Tap or click on the dark backdrop (not inside the box)
  let downOnBackdrop = null;
  document.addEventListener('pointerdown', (e) => {
    const o = e.target;
    downOnBackdrop = o instanceof Element && o.classList.contains('custom-modal-overlay') && !o.matches(SKIP) ? o : null;
  }, true);
  document.addEventListener('click', (e) => {
    const o = e.target;
    if (downOnBackdrop && o === downOnBackdrop && isOpen(o)) dismiss(o);
    downOnBackdrop = null;
  });
  // Esc closes the top popup
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    const o = topOverlay();
    if (o && dismiss(o)) e.preventDefault();
  });

  // An X for the shared Notice / Input / Confirm dialogs (they only had text buttons)
  function addCloseX(id) {
    const overlay = document.getElementById(id);
    const box = overlay?.querySelector('.custom-modal-box');
    if (!box || box.querySelector('.ui-modal-x, .modal-close-btn')) return;
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'ui-modal-x';
    x.setAttribute('aria-label', 'Close');
    x.textContent = '×';
    x.addEventListener('click', () => {
      const own = [...overlay.querySelectorAll('[data-close-modal-id], #confirm-no, button')].find((b) => b !== x && b.offsetParent !== null && /^(ok|cancel|no)$/i.test(b.textContent.trim()));
      if (own) own.click(); else overlay.style.display = 'none';
    });
    box.prepend(x);
  }

  // Phones zoom into text fields under 16px; raise only those, keep bigger ones as they are
  const coarse = window.matchMedia?.('(pointer: coarse)');
  const FIELD = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="color"]):not([type="button"]):not([type="submit"]), select, textarea';
  function fixFieldSizes(root = document) {
    if (!coarse?.matches) return;
    root.querySelectorAll(FIELD).forEach((el) => {
      if (el.closest('#page-pokemon, #page-royale, #page-royale3d, #page-dungeon, #page-pacman, #page-candy, #page-tetris')) return;
      if (parseFloat(getComputedStyle(el).fontSize) < 16) el.style.fontSize = '16px';
    });
  }

  function setup() {
    ['custom-alert-modal', 'custom-prompt-modal', 'custom-confirm-modal'].forEach(addCloseX);
    fixFieldSizes();
    window.addEventListener('classapp:page', () => setTimeout(fixFieldSizes, 50));
    // Fields added later (dialogs, lists rendered by features)
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; fixFieldSizes(); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
