/* ============================================================
   UTILITIES
   ============================================================ */

const Utils = (() => {

  /* ── ANIMATED COUNTER ── */
  function animateCounter(el, target, duration = 1200, prefix = '', suffix = '') {
    const start = performance.now();
    const initial = parseInt(el.dataset.from || '0', 10);

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out-expo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(initial + (target - initial) * eased);
      el.textContent = prefix + current.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  /* ── FORMAT NUMBER ── */
  function formatNumber(n) {
    if (n == null) return '—';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString();
  }

  function formatPercent(n, decimals = 1) {
    if (n == null) return '—';
    return n.toFixed(decimals) + '%';
  }

  function formatCurrency(n) {
    if (n == null) return '—';
    return '$' + formatNumber(n);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  /* ── REGION COLOR ── */
  const REGION_COLORS = {
    lck:   '#C89B3C',
    lpl:   '#FF4B4B',
    lec:   '#9B59B6',
    lcs:   '#00A1DE',
    pcs:   '#E67E22',
    lms:   '#E67E22',
    ljl:   '#E74C3C',
    cblol: '#27AE60',
    vcs:   '#F39C12',
    lla:   '#16A085',
    other: '#7F8C8D'
  };

  function regionColor(regionId) {
    return REGION_COLORS[regionId?.toLowerCase()] || REGION_COLORS.other;
  }

  function regionBadgeClass(regionId) {
    return 'region-' + (regionId?.toLowerCase() || 'other');
  }

  /* ── ROLE COLOR ── */
  function roleBadgeClass(role) {
    const map = { top: 'role-top', jungle: 'role-jungle', mid: 'role-mid', bot: 'role-bot', support: 'role-support' };
    return map[role?.toLowerCase()] || 'role-mid';
  }

  /* ── TROPHY ROW ── */
  function buildTrophyRow(worldsTitles, msiTitles, ewcTitles) {
    const items = [];
    for (let i = 0; i < (worldsTitles || 0); i++) items.push('🏆 Worlds');
    for (let i = 0; i < (msiTitles || 0); i++) items.push('⚔️ MSI');
    for (let i = 0; i < (ewcTitles || 0); i++) items.push('🌍 EWC');
    return items;
  }

  /* ── DYNASTY BAR WIDTH ── */
  function dynastyWidth(score) {
    return Math.min(100, Math.max(0, score || 0)) + '%';
  }

  /* ── TEAM AVATAR COLOR ── */
  function teamAvatarStyle(team) {
    const color = team.color_primary || '#C89B3C';
    const color2 = team.color_secondary || '#000000';
    return `background: linear-gradient(135deg, ${color}, ${color2});`;
  }

  /* ── SCROLL REVEAL ── */
  function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Trigger counters
          entry.target.querySelectorAll('[data-counter]').forEach(el => {
            const target = parseInt(el.dataset.counter, 10);
            const suffix = el.dataset.suffix || '';
            const prefix = el.dataset.prefix || '';
            animateCounter(el, target, 1400, prefix, suffix);
          });
          // Trigger progress bars
          entry.target.querySelectorAll('.progress-bar__fill[data-width]').forEach(el => {
            el.style.width = el.dataset.width;
          });
          // Trigger dynasty fills
          entry.target.querySelectorAll('.team-card__dynasty-fill[data-width]').forEach(el => {
            el.style.width = el.dataset.width;
          });
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal, .reveal-left, .reveal-scale, .stagger-children').forEach(el => {
      observer.observe(el);
    });

    return observer;
  }

  /* ── DEBOUNCE ── */
  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  /* ── SORT TABLE ── */
  let sortState = {};
  function initSortableTable(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const headers = table.querySelectorAll('th[data-sort]');
    headers.forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        const dir = sortState[tableId] === key + ':asc' ? 'desc' : 'asc';
        sortState[tableId] = key + ':' + dir;

        headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
        th.classList.add('sort-' + dir);

        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));

        rows.sort((a, b) => {
          const aVal = a.querySelector(`td[data-key="${key}"]`)?.dataset.value || '';
          const bVal = b.querySelector(`td[data-key="${key}"]`)?.dataset.value || '';
          const aNum = parseFloat(aVal), bNum = parseFloat(bVal);
          const isNum = !isNaN(aNum) && !isNaN(bNum);
          const cmp = isNum ? aNum - bNum : aVal.localeCompare(bVal);
          return dir === 'asc' ? cmp : -cmp;
        });

        rows.forEach(r => tbody.appendChild(r));
      });
    });
  }

  /* ── TOAST ── */
  let toastContainer;

  function showToast(message, type = 'info', duration = 3000) {
    if (!toastContainer) {
      toastContainer = document.getElementById('toast-container');
    }
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toast-out 0.4s ease forwards';
      setTimeout(() => toast.remove(), 400);
    }, duration);
  }

  /* ── MODAL ── */
  function openModal(content, title = '') {
    const overlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalBody  = document.getElementById('modal-body');
    if (!overlay) return;
    if (title && modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.innerHTML = content;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  /* ── RESULT PILL ── */
  function resultPill(result) {
    const r = (result || '').toLowerCase();
    if (r.includes('champion')) return `<span class="result-pill result-win">🏆 Champion</span>`;
    if (r.includes('finalist')) return `<span class="result-pill result-win">🥈 Finalist</span>`;
    if (r.includes('semifinal')) return `<span class="result-pill badge-neutral">Semi</span>`;
    if (r.includes('quarter')) return `<span class="result-pill badge-neutral">QF</span>`;
    return `<span class="result-pill badge-neutral">${result || '—'}</span>`;
  }

  /* ── WORLD MAP REGION DOTS ── */
  const REGION_COORDS = {
    lck:    { x: 78, y: 38 },
    lpl:    { x: 72, y: 42 },
    lec:    { x: 51, y: 32 },
    lcs:    { x: 22, y: 38 },
    pcs:    { x: 78, y: 50 },
    ljl:    { x: 83, y: 38 },
    cblol:  { x: 32, y: 60 },
    vcs:    { x: 75, y: 48 },
    lla:    { x: 26, y: 55 },
    other:  { x: 50, y: 50 }
  };

  function regionCoords(regionId) {
    return REGION_COORDS[regionId?.toLowerCase()] || REGION_COORDS.other;
  }

  /* ── GENERATE INITIALS ── */
  function initials(name, max = 3) {
    return name?.split(/[\s.]+/)
      .map(w => w[0]?.toUpperCase() || '')
      .join('')
      .slice(0, max) || '?';
  }

  /* ── ESCAPE HTML ── */
  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    animateCounter, formatNumber, formatPercent, formatCurrency, formatDate,
    regionColor, regionBadgeClass, roleBadgeClass,
    buildTrophyRow, dynastyWidth, teamAvatarStyle,
    initScrollReveal, debounce,
    initSortableTable, showToast, openModal, closeModal,
    resultPill, regionCoords, initials, escHtml
  };
})();
