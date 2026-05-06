// Phase 3: Session & Lifecycle Hardening
// 3.1 Token auto-refresh | 3.2 Idle timeout | 3.3 Multi-tab sync | 3.4 Logout cleanup
(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────────
  var IDLE_WARN_MS       = 25 * 60 * 1000; // warn after 25 min idle
  var IDLE_LOGOUT_MS     = 30 * 60 * 1000; // logout after 30 min idle
  var IDLE_CHECK_MS      = 60 * 1000;       // poll every 60 s
  var TOKEN_CHECK_MS     = 30 * 60 * 1000; // check token expiry every 30 min
  var TOKEN_THRESHOLD_MS = 24 * 60 * 60 * 1000; // refresh if < 24 h left
  var STORAGE_KEY_TOKEN  = 'classAppToken';
  var STORAGE_KEY_USER   = 'classAppUser';
  var ACTIVITY_EVENTS    = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'];

  // ── State ────────────────────────────────────────────────────────────────────
  var lastActivityAt  = Date.now();
  var idleCheckId     = null;
  var tokenRefreshId  = null;
  var warnBannerEl    = null;
  var warnShown       = false;
  var _storageHandler = null;
  var _activityHandler = null;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function isLoggedIn() {
    // Use the globally-exposed getAuthToken; fall back to localStorage check
    return Boolean(window.getAuthToken?.() || localStorage.getItem(STORAGE_KEY_TOKEN));
  }

  function parseJWTPayload(token) {
    try {
      var parts = token.split('.');
      if (parts.length !== 3) return null;
      // atob handles standard base64; JWT uses base64url — swap chars first
      var b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(b64));
    } catch (_) {
      return null;
    }
  }

  // ── Phase 3.1: Token Auto-Refresh ────────────────────────────────────────────
  async function refreshTokenIfNeeded() {
    var token = window.getAuthToken?.();
    if (!token) return;
    var payload = parseJWTPayload(token);
    if (!payload || !payload.exp) return;
    var msLeft = payload.exp * 1000 - Date.now();
    if (msLeft > TOKEN_THRESHOLD_MS) return; // plenty of time left
    try {
      var res = await window.authFetch('/api/session/refresh', { method: 'POST' });
      if (!res || !res.ok) return;
      var data = await res.json().catch(function () { return {}; });
      if (data.token) {
        window.setServerAuthToken?.(data.token);
        console.info('[session] Token refreshed — new expiry in 7 days.');
      }
    } catch (err) {
      console.warn('[session] Token refresh failed:', err.message);
    }
  }

  function startTokenRefreshPoller() {
    stopTokenRefreshPoller();
    refreshTokenIfNeeded();
    tokenRefreshId = window.setInterval(refreshTokenIfNeeded, TOKEN_CHECK_MS);
  }

  function stopTokenRefreshPoller() {
    if (!tokenRefreshId) return;
    clearInterval(tokenRefreshId);
    tokenRefreshId = null;
  }

  // ── Phase 3.2: Idle Timeout ───────────────────────────────────────────────────
  function resetIdleTimer() {
    lastActivityAt = Date.now();
    if (warnShown) hideIdleWarning();
  }

  function showIdleWarning() {
    if (warnShown) return;
    warnShown = true;
    if (!warnBannerEl) {
      warnBannerEl = document.createElement('div');
      warnBannerEl.id = 'session-idle-warning';
      warnBannerEl.setAttribute('role', 'alert');
      warnBannerEl.setAttribute('aria-live', 'assertive');
      // iOS-safe fixed position: above bottom nav, respects safe-area-inset
      warnBannerEl.style.cssText =
        'position:fixed;bottom:calc(80px + env(safe-area-inset-bottom, 0px));' +
        'left:50%;transform:translateX(-50%);' +
        'background:rgba(255,200,0,0.96);color:#111;' +
        'padding:12px 22px;border-radius:14px;' +
        'font-size:14px;font-weight:700;line-height:1.4;' +
        'z-index:99999;cursor:pointer;text-align:center;' +
        'box-shadow:0 4px 24px rgba(0,0,0,0.35);' +
        'max-width:310px;width:max-content;' +
        'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);' +
        'touch-action:manipulation;-webkit-tap-highlight-color:transparent;';
      warnBannerEl.textContent = 'Session expiring in 5 min—tap to stay logged in';
      warnBannerEl.addEventListener('click', resetIdleTimer, { passive: true });
      warnBannerEl.addEventListener('touchstart', resetIdleTimer, { passive: true });
    }
    if (!document.getElementById('session-idle-warning')) {
      document.body.appendChild(warnBannerEl);
    }
  }

  function hideIdleWarning() {
    warnShown = false;
    var el = document.getElementById('session-idle-warning');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function checkIdleState() {
    if (!isLoggedIn()) return;
    var idleMs = Date.now() - lastActivityAt;
    if (idleMs >= IDLE_LOGOUT_MS) {
      console.info('[session] Idle timeout — logging out.');
      hideIdleWarning();
      window.handleLogout?.();
    } else if (idleMs >= IDLE_WARN_MS) {
      showIdleWarning();
    } else {
      if (warnShown) hideIdleWarning();
    }
  }

  function startIdleTimer() {
    stopIdleTimer();
    lastActivityAt = Date.now();
    _activityHandler = resetIdleTimer;
    ACTIVITY_EVENTS.forEach(function (ev) {
      document.addEventListener(ev, _activityHandler, { passive: true, capture: false });
    });
    idleCheckId = window.setInterval(checkIdleState, IDLE_CHECK_MS);
  }

  function stopIdleTimer() {
    if (_activityHandler) {
      ACTIVITY_EVENTS.forEach(function (ev) {
        document.removeEventListener(ev, _activityHandler);
      });
      _activityHandler = null;
    }
    if (idleCheckId) {
      clearInterval(idleCheckId);
      idleCheckId = null;
    }
    hideIdleWarning();
  }

  // ── Phase 3.3: Multi-Tab Session Sync ────────────────────────────────────────
  function onStorageChange(event) {
    if (!isLoggedIn()) return;
    // Another tab cleared our token or user object → log out this tab too
    if (
      (event.key === STORAGE_KEY_TOKEN && event.newValue === null) ||
      (event.key === STORAGE_KEY_USER  && event.newValue === null)
    ) {
      console.info('[session] Logout detected in another tab — syncing.');
      window.handleLogout?.();
    }
  }

  function initMultiTabSync() {
    destroyMultiTabSync();
    _storageHandler = onStorageChange;
    window.addEventListener('storage', _storageHandler);
  }

  function destroyMultiTabSync() {
    if (_storageHandler) {
      window.removeEventListener('storage', _storageHandler);
      _storageHandler = null;
    }
  }

  // ── Phase 3.4: Lifecycle ──────────────────────────────────────────────────────
  function init() {
    lastActivityAt = Date.now(); // reset idle clock on fresh login
    startTokenRefreshPoller();
    startIdleTimer();
    initMultiTabSync();
    console.info('[session] Session manager started (idle=30m, token-refresh=7d).');
  }

  function destroy() {
    stopTokenRefreshPoller();
    stopIdleTimer();
    destroyMultiTabSync();
    console.info('[session] Session manager stopped.');
  }

  window.sessionManager = {
    init: init,
    destroy: destroy,
    resetIdleTimer: resetIdleTimer, // expose so other UI modules can reset idle on custom interactions
  };
})();
