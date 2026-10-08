/* Signed database pass. The Supabase client's fetch wrappers call window.classAppDbAuth(headers)
 * before each request: it adds "Authorization: Bearer <pass>", where the pass is a short-lived token
 * the server signs (/api/db-token) saying who is signed in. The database reads the username from
 * that verified pass instead of trusting a header the browser could set to anyone's name.
 * If the server has no pass configured, requests go out exactly as before. */
(function () {
  const REFRESH_BEFORE_MS = 5 * 60 * 1000;
  const RECHECK_MS = 10 * 60 * 1000;   // ask the server again regularly (it can switch passes off)
  let cached = { token: '', exp: 0, user: '', at: 0 };
  let pending = null;
  let pausedUntil = 0;

  function appToken() {
    try { return localStorage.getItem('classAppToken') || ''; } catch (_) { return ''; }
  }
  function appUser() {
    try { return JSON.parse(localStorage.getItem('classAppUser') || 'null')?.username || ''; } catch (_) { return ''; }
  }

  async function fetchPass() {
    const token = appToken();
    if (!token || Date.now() < pausedUntil) return '';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    try {
      const res = await fetch('/api/db-token', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: ctrl.signal });
      if (res.status === 503) { cached = { token: '', exp: 0, user: '', at: 0 }; pausedUntil = Date.now() + RECHECK_MS; return ''; }   // passes off on the server
      if (!res.ok) return '';
      const data = await res.json();
      cached = { token: String(data.token || ''), exp: Number(data.expiresAt) || 0, user: appUser(), at: Date.now() };
      return cached.token;
    } catch (_) {
      return '';
    } finally {
      clearTimeout(timer);
    }
  }

  function currentPass() {
    if (cached.token && cached.user === appUser() && cached.exp - Date.now() > REFRESH_BEFORE_MS && Date.now() - cached.at < RECHECK_MS) return Promise.resolve(cached.token);
    if (Date.now() < pausedUntil) return Promise.resolve('');
    if (!pending) pending = fetchPass().finally(() => { pending = null; });
    return pending;
  }

  window.classAppDbAuth = async function (headers) {
    const pass = await currentPass();
    if (pass) headers.set('Authorization', `Bearer ${pass}`);
    return headers;
  };
})();
