/* Shared loading and empty-state building blocks (NO FILTER rules):
 * - uiSkeleton(kind, count): shimmering placeholders shaped like the content that is coming,
 *   instead of a blank area or a lone "Loading…" line. kind: 'list' (avatar + two lines),
 *   'cards' (title + text blocks), 'rows' (simple bars).
 * - uiEmpty({ icon, title, text, action, onclick }): says why the area is empty and offers the
 *   next step as one clear button.
 * Loaded before script.js so every feature can use them while it renders. */
(function () {
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  window.uiSkeleton = function (kind = 'list', count = 3) {
    const n = Math.max(1, Math.min(8, count | 0));
    let item;
    if (kind === 'cards') {
      item = '<div class="ui-sk-card"><div class="ui-sk ui-sk-line w60"></div><div class="ui-sk ui-sk-line w90"></div><div class="ui-sk ui-sk-line w75"></div></div>';
    } else if (kind === 'rows') {
      item = '<div class="ui-sk ui-sk-row"></div>';
    } else {
      item = '<div class="ui-sk-item"><div class="ui-sk ui-sk-avatar"></div><div class="ui-sk-lines"><div class="ui-sk ui-sk-line w50"></div><div class="ui-sk ui-sk-line w80"></div></div></div>';
    }
    return `<div class="ui-skeleton ui-skeleton-${kind}" role="status" aria-live="polite"><span class="sr-only">Loading…</span>${item.repeat(n)}</div>`;
  };

  window.uiEmpty = function ({ icon = '', title = '', text = '', action = '', onclick = '' } = {}) {
    return `<div class="ui-empty">
      ${icon ? `<div class="ui-empty-icon" aria-hidden="true">${esc(icon)}</div>` : ''}
      ${title ? `<p class="ui-empty-title">${esc(title)}</p>` : ''}
      ${text ? `<p class="ui-empty-text">${esc(text)}</p>` : ''}
      ${action && onclick ? `<button type="button" class="ui-empty-btn" onclick="${esc(onclick)}">${esc(action)}</button>` : ''}
    </div>`;
  };
})();
