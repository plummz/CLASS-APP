// features/logging-in/loading-components.js
// Startup-critical: Auth bootstrap, session restore, loading screen, splash

// Ensure shared startup state exists as a global-object binding.
// This file is loaded before `script.js`, so it cannot rely on `let` bindings
// that may not exist yet. Using a global object binding prevents
// `ReferenceError: isInitializing/isAuthenticated is not defined` which can
// abort DOMContentLoaded initialization and leave buttons unbound.
if (typeof isInitializing === 'undefined') window.isInitializing = true;
if (typeof isAuthenticated === 'undefined') window.isAuthenticated = false;

async function initSupabase(username = null) {
  try {
    // 5s hard timeout — if the server is still cold-starting the page shouldn't block.
    // waitForSupabaseClient() retries once on login if credentials are still empty.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const cfg = await fetch('/api/config', { signal: controller.signal }).then(r => r.json());
    clearTimeout(timer);
    SUPABASE_URL = cfg.supabaseUrl || '';
    SUPABASE_KEY = cfg.supabaseKey || '';
  } catch (error) {
    console.error('[auth] Failed to load Supabase config:', error);
  }
  if (!window.supabase?.createClient || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[auth] Supabase client could not be initialized.');
    sb = null;
    window.sb = null;
    return false;
  }
  try {
    const { createClient } = window.supabase;
    // Always attach x-class-username header to all Supabase requests so RLS
    // policies using class_app_username() work for browser SELECT calls.
    const resolvedUsername = username || (() => {
      try { return JSON.parse(localStorage.getItem('classAppUser') || 'null')?.username || null; } catch (_) { return null; }
    })();
    sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: {
        fetch: (url, options = {}) => {
          const headers = new Headers(options.headers || {});
          if (resolvedUsername) headers.set('x-class-username', resolvedUsername);
          return fetch(url, { ...options, headers });
        },
      },
    });
    window.sb = sb;
    return true;
  } catch (error) {
    console.error('[auth] Supabase createClient failed:', error);
    sb = null;
    window.sb = null;
    return false;
  }
}

function setServerAuthToken(token) {
  serverAuthToken = token || '';
  if (serverAuthToken) localStorage.setItem('classAppToken', serverAuthToken);
  else localStorage.removeItem('classAppToken');
}

function getServerAuthToken() {
  return serverAuthToken || localStorage.getItem('classAppToken') || '';
}

function getAuthHeaders(extraHeaders = {}) {
  const headers = new Headers(extraHeaders || {});
  const token = getServerAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

async function waitForSupabaseClient() {
  // Wait up to 3s for initSupabase to complete (covers slow page loads).
  // Also verify credentials are non-empty — sb is always non-null after init
  // even when credentials failed to load, so checking !sb alone is not enough.
  // Give initSupabase up to 2s to finish if it's still running
  const deadline = Date.now() + 2000;
  while (!sb || !SUPABASE_URL) {
    if (Date.now() >= deadline) break;
    await new Promise(r => setTimeout(r, 200));
  }
  // If credentials are still missing, the server may have been cold-starting during
  // page load. Try /api/config once more now that the server should be awake.
  if (!SUPABASE_URL) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const cfg = await fetch('/api/config', { signal: controller.signal }).then(r => r.json());
      clearTimeout(timer);
      if (cfg.supabaseUrl && cfg.supabaseKey) {
        SUPABASE_URL = cfg.supabaseUrl;
        SUPABASE_KEY = cfg.supabaseKey;
        sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
          global: {
            fetch: (url, options = {}) => {
              const headers = new Headers(options.headers || {});
              try {
                const sessionUser = JSON.parse(localStorage.getItem('classAppUser') || 'null');
                if (sessionUser?.username) headers.set('x-class-username', sessionUser.username);
              } catch (_) {}
              return fetch(url, { ...options, headers });
            },
          },
        });
        window.sb = sb;
      }
    } catch (_) {}
  }
  if (!sb || !SUPABASE_URL) {
    console.error('[sb] Supabase client unavailable or missing credentials.');
    return false;
  }
  return true;
}

function waitForSplashDismissal() {
  if (!document.getElementById('splash-screen')) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      observer.disconnect();
      resolve();
    };
    const timer = setTimeout(finish, 4500);
    const observer = new MutationObserver(() => {
      if (!document.getElementById('splash-screen')) finish();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('classapp:splash-dismissed', finish, { once: true });
  });
}

function syncAuthState() {
  isAuthenticated = Boolean(currentUser?.username);
}

function renderAppState() {
  const showShell = !isInitializing && isAuthenticated;
  const showAuthModal = !isInitializing && !isAuthenticated;
  const authModal = document.getElementById('auth-modal');
  if (authModal) authModal.style.display = showAuthModal ? 'flex' : 'none';

  const shellNodes = [
    document.getElementById('sidebar'),
    document.getElementById('menu-toggle'),
    document.getElementById('overlay'),
    document.getElementById('live-clock'),
    document.getElementById('page-indicator'),
  ];
  shellNodes.forEach((node) => {
    if (!node) return;
    node.style.visibility = showShell ? '' : 'hidden';
    node.style.pointerEvents = showShell ? '' : 'none';
  });

  document.querySelectorAll('.page').forEach((page) => {
    page.style.visibility = showShell ? '' : 'hidden';
    if (!showShell) page.style.pointerEvents = 'none';
    else page.style.pointerEvents = page.classList.contains('active') ? '' : '';
  });
}

function bindAuthPortalHandlers() {
  if (authBindingsReady) return;
  const signInBtn = document.getElementById('btn-sign-in');
  const createBtn = document.getElementById('btn-create-account');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  if (!signInBtn || !createBtn || !usernameInput || !passwordInput) {
    console.error('[auth] Portal controls missing from DOM.');
    return;
  }
  signInBtn.addEventListener('click', (event) => {
    event.preventDefault();
    window.login();
  });
  createBtn.addEventListener('click', (event) => {
    event.preventDefault();
    window.register();
  });
  usernameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      window.login();
    }
  });
  passwordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      window.login();
    }
  });
  authBindingsReady = true;
  console.info('[auth] Portal button handlers attached.');
}

window.getAuthToken = getServerAuthToken;
window.authFetch = function(url, options = {}) {
  return fetch(url, { ...options, headers: getAuthHeaders(options.headers) });
};
