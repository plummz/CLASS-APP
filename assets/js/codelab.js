(function () {
  const CODE_LAB_CHALLENGES = [
    {
      id: 'html-missing-image-alt',
      env: 'web',
      title: 'Repair the profile card markup',
      type: 'HTML',
      difficulty: 'Simple',
      description: 'Fix the broken HTML so the heading, image, and button render correctly.',
      language: 'html',
      files: {
        html: `<section class="card">\n  <h1>Debug Lab</h2>\n  <img src=""\n  <button>Toggle</button>\n</section>`,
        css: `.card { font-family: Arial, sans-serif; padding: 24px; border-radius: 16px; background: #111827; color: white; }\n.active .card { outline: 3px solid #22d3ee; }`,
        javascript: `document.querySelector('button')?.addEventListener('click', () => {\n  document.body.classList.toggle('active');\n});\nconsole.log('Profile card ready');`,
        java: '',
      },
    },
    {
      id: 'js-total-loop',
      env: 'web',
      title: 'Fix the JavaScript total',
      type: 'JavaScript',
      difficulty: 'Moderate',
      description: 'Repair the loop so the console prints Total: 15.',
      language: 'javascript',
      files: {
        html: `<main><h1>Cart Total</h1><p id="result">Waiting...</p></main>`,
        css: `body { font-family: system-ui; padding: 24px; } #result { color: #2563eb; font-weight: 800; }`,
        javascript: `const prices = [2, 4, 9];\nlet total = 0;\nfor (let i = 1; i <= prices.length; i++) {\n  total += prices[i];\n}\ndocument.getElementById('result').textContent = 'Total: ' + total;\nconsole.log('Total: ' + total);`,
        java: '',
      },
    },
    {
      id: 'css-center-button',
      env: 'web',
      title: 'Fix the CSS layout',
      type: 'CSS',
      difficulty: 'Simple',
      description: 'Repair the CSS so the panel is centered and the button has rounded corners.',
      language: 'css',
      files: {
        html: `<div class="stage"><button class="launch">Launch</button></div>`,
        css: `.stage {\n  min-height: 260px;\n  display: flexbox;\n  align-items: middle;\n  justify-content: center;\n}\n.launch {\n  padding: 14px 24px;\n  border-radius: none;\n  background: #22c55e;\n}`,
        javascript: `console.log('CSS challenge preview loaded');`,
        java: '',
      },
    },
    {
      id: 'java-hello-total',
      env: 'java',
      title: 'Repair the Java main method',
      type: 'Java',
      difficulty: 'Moderate',
      description: 'Fix the Java code so it compiles and prints Sum: 10.',
      language: 'java',
      files: {
        html: '',
        css: '',
        javascript: '',
        java: `public class Main {\n  public static void main(String args) {\n    int sum = 4 + 6\n    System.out.println("Sum: " + total);\n  }\n}`,
      },
    },
    {
      id: 'swing-button-label',
      env: 'java',
      title: 'Repair the Swing source',
      type: 'Java Swing',
      difficulty: 'Moderate',
      description: 'Fix imports and class names so this Swing source compiles.',
      language: 'java',
      files: {
        html: '',
        css: '',
        javascript: '',
        java: `import javax.swing.JFrame;\nimport javax.swing.JButon;\nimport javax.swing.JLabel;\n\npublic class Main {\n  public static void main(String[] args) {\n    JFrame frame = new JFrame("Practice");\n    frame.add(new JLabel("Ready"));\n    frame.add(new JButton("Click"));\n    frame.setSize(240, 160);\n    frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);\n    System.out.println("Swing source compiles");\n  }\n}`,
      },
    },
  ];

  const CODE_LAB_PRACTICE_STARTER = {
    html: `<main class="hero">\n  <h1>Hello Code Lab</h1>\n  <button id="demoBtn">Click me</button>\n  <p id="status">HTML, CSS, and JavaScript run together here.</p>\n</main>`,
    css: `body { margin: 0; font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }\n.hero { min-height: 100vh; display: grid; place-items: center; align-content: center; gap: 14px; }\nbutton { border: 0; border-radius: 999px; padding: 12px 18px; background: #22d3ee; font-weight: 800; cursor: pointer; }`,
    javascript: `document.getElementById('demoBtn')?.addEventListener('click', () => {\n  document.getElementById('status').textContent = 'JavaScript is running inside the sandbox.';\n  console.log('Button clicked');\n});`,
    java: `import javax.swing.JButton;\nimport javax.swing.JFrame;\nimport javax.swing.JLabel;\nimport javax.swing.JPanel;\n\npublic class Main {\n  public static void main(String[] args) {\n    JFrame frame = new JFrame("Swing Practice");\n    JPanel panel = new JPanel();\n    panel.add(new JLabel("Hello Swing"));\n    panel.add(new JButton("Click"));\n    frame.add(panel);\n    frame.setSize(320, 180);\n    System.out.println("Swing source compiled in headless practice mode");\n  }\n}`,
  };

  let codeLabEnvironment = 'web';
  let codeLabMode = 'daily';
  let codeLabLanguage = 'html';
  let codeLabEditor = null;
  let codeLabInitialized = false;
  let codeLabRealtimeReady = false;
  let codeLabFiles = { ...CODE_LAB_PRACTICE_STARTER };
  let codeLabPracticeFiles = readStoredJson('codeLabPracticeFiles', { ...CODE_LAB_PRACTICE_STARTER });
  let codeLabAssets = readStoredJson('codeLabAssets', []);
  let codeLabConsoleLines = [];

  function readStoredJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null') || fallback;
    } catch (_) {
      return fallback;
    }
  }

  function client() {
    return typeof sb !== 'undefined' ? sb : null;
  }

  function user() {
    if (typeof currentUser !== 'undefined' && currentUser) return currentUser;
    return readStoredJson('classAppUser', null);
  }

  function esc(value) {
    if (typeof escapeHTML === 'function') return escapeHTML(value);
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function toast(message, type = 'success') {
    if (typeof showToast === 'function') showToast(message, type);
  }

  function alertUser(message) {
    if (typeof customAlert === 'function') customAlert(message);
    else window.alert(message);
  }

  function confirmUser(message, callback) {
    if (typeof customConfirm === 'function') customConfirm(message, callback);
    else if (window.confirm(message)) callback();
  }

  function loader(text) {
    return typeof createInlineLoader === 'function'
      ? createInlineLoader(text)
      : `<div class="inline-loader">${esc(text)}</div>`;
  }

  function closeModal(id) {
    if (typeof removeDynamicModal === 'function') removeDynamicModal(id);
    else document.getElementById(id)?.remove();
  }

  function rankIcon(index) {
    if (typeof contributionRankIcon === 'function') return contributionRankIcon(index);
    return index === 0 ? '1' : index === 1 ? '2' : index === 2 ? '3' : `#${index + 1}`;
  }

  function codeLabTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function challengesForCurrentEnvironment() {
    return CODE_LAB_CHALLENGES.filter((challenge) => challenge.env === codeLabEnvironment);
  }

  function getDailyCodeLabChallenge() {
    const list = challengesForCurrentEnvironment();
    const key = `${codeLabTodayKey()}-${codeLabEnvironment}`;
    const seed = key.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return list[seed % list.length];
  }

  function codeLabSetConsole(message, type = 'info') {
    const panel = document.getElementById('code-lab-console');
    if (!panel) return;
    codeLabConsoleLines = [`[${type.toUpperCase()}] ${message}`];
    panel.textContent = codeLabConsoleLines.join('\n');
  }

  function codeLabAppendConsole(message, type = 'log') {
    const panel = document.getElementById('code-lab-console');
    if (!panel) return;
    codeLabConsoleLines.push(`[${type.toUpperCase()}] ${message}`);
    panel.textContent = codeLabConsoleLines.join('\n');
    panel.scrollTop = panel.scrollHeight;
  }

  function getCodeLabEditorValue() {
    const fallback = document.getElementById('code-lab-editor-fallback');
    if (codeLabEditor) return codeLabEditor.getValue();
    return fallback ? fallback.value : '';
  }

  function setCodeLabEditorValue(value, lang = codeLabLanguage) {
    const fallback = document.getElementById('code-lab-editor-fallback');
    if (codeLabEditor) {
      codeLabEditor.setValue(value || '');
      const model = codeLabEditor.getModel();
      if (model && window.monaco) window.monaco.editor.setModelLanguage(model, lang === 'javascript' ? 'javascript' : lang);
    }
    if (fallback) fallback.value = value || '';
  }

  function saveActiveCodeLabFile() {
    codeLabFiles[codeLabLanguage] = getCodeLabEditorValue();
    if (codeLabMode === 'practice') {
      codeLabPracticeFiles = { ...codeLabFiles };
      localStorage.setItem('codeLabPracticeFiles', JSON.stringify(codeLabPracticeFiles));
    }
  }

  function loadMonacoForCodeLab() {
    return new Promise((resolve) => {
      if (window.monaco) return resolve(true);
      if (window.require?.config) {
        window.require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.49.0/min/vs' } });
        window.require(['vs/editor/editor.main'], () => resolve(true), () => resolve(false));
        return;
      }
      const loaderScript = document.createElement('script');
      loaderScript.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.49.0/min/vs/loader.js';
      loaderScript.onload = () => {
        window.require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.49.0/min/vs' } });
        window.require(['vs/editor/editor.main'], () => resolve(true), () => resolve(false));
      };
      loaderScript.onerror = () => resolve(false);
      document.head.appendChild(loaderScript);
    });
  }

  function registerCodeLabSuggestions() {
    if (!window.monaco || window.codeLabSuggestionsReady) return;
    window.codeLabSuggestionsReady = true;
    const javaSuggestions = [
      'public class Main',
      'public static void main(String[] args)',
      'System.out.println',
      'JFrame',
      'JPanel',
      'JButton',
      'JLabel',
      'JTextField',
      'ActionListener',
      'BorderLayout',
      'FlowLayout',
    ];
    window.monaco.languages.registerCompletionItemProvider('java', {
      provideCompletionItems: () => ({
        suggestions: javaSuggestions.map((label) => ({
          label,
          kind: window.monaco.languages.CompletionItemKind.Snippet,
          insertText: label,
        })),
      }),
    });
  }

  async function initCodeLabEditor() {
    const ok = await loadMonacoForCodeLab();
    const host = document.getElementById('code-lab-editor');
    const fallback = document.getElementById('code-lab-editor-fallback');
    if (!host || codeLabEditor || !ok || !window.monaco) {
      if (fallback && !codeLabEditor) fallback.style.display = 'block';
      return;
    }
    registerCodeLabSuggestions();
    if (fallback) fallback.style.display = 'none';
    codeLabEditor = window.monaco.editor.create(host, {
      value: codeLabFiles[codeLabLanguage] || '',
      language: codeLabLanguage,
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: 'on',
      bracketPairColorization: { enabled: true },
      tabSize: 2,
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
    });
    codeLabEditor.onDidChangeModelContent(() => saveActiveCodeLabFile());
  }

  function updateEnvironmentUi() {
    const shell = document.getElementById('code-lab-shell');
    const envLabel = document.getElementById('code-lab-env-label');
    const title = document.getElementById('code-lab-workspace-title');
    const previewTitle = document.getElementById('code-lab-preview-title');
    if (shell) {
      shell.classList.toggle('is-java', codeLabEnvironment === 'java');
      shell.classList.toggle('is-web', codeLabEnvironment === 'web');
    }
    if (envLabel) envLabel.textContent = codeLabEnvironment === 'java' ? 'Java Swing' : 'HTML / CSS / JavaScript';
    if (title) title.textContent = codeLabEnvironment === 'java' ? 'Java Swing Workspace' : 'Web Workspace';
    if (previewTitle) previewTitle.textContent = codeLabEnvironment === 'java' ? 'Swing Preview' : 'Preview';

    document.querySelectorAll('.code-lab-file-tab').forEach((tab) => {
      const lang = tab.dataset.lang;
      const visible = codeLabEnvironment === 'java' ? lang === 'java' : lang !== 'java';
      tab.hidden = !visible;
    });
  }

  function refreshCodeLabHeader() {
    const challenge = getDailyCodeLabChallenge();
    const dateKey = codeLabTodayKey();
    const type = document.getElementById('code-lab-challenge-type');
    const title = document.getElementById('code-lab-challenge-title');
    const desc = document.getElementById('code-lab-challenge-desc');
    const date = document.getElementById('code-lab-challenge-date');
    if (type) type.textContent = `${challenge.type} - ${challenge.difficulty}`;
    if (title) title.textContent = challenge.title;
    if (desc) desc.textContent = challenge.description;
    if (date) date.textContent = dateKey;
  }

  window.refreshCodeLabStatus = async function () {
    const activeUser = user();
    if (!activeUser?.username) return;
    const badge = document.getElementById('code-lab-solved-badge');
    const streak = document.getElementById('code-lab-streak-badge');
    const submit = document.getElementById('code-lab-submit-btn');
    const db = client();
    if (!db) return;
    const { data, error } = await db
      .from('code_lab_completions')
      .select('challenge_id,challenge_date,created_at')
      .eq('username', activeUser.username)
      .order('challenge_date', { ascending: false });
    if (error) {
      if (badge) badge.textContent = 'Run CODE LAB schema update';
      if (streak) streak.textContent = 'Points unavailable';
      return;
    }
    const rows = data || [];
    const solvedToday = rows.some((row) => row.challenge_date === codeLabTodayKey());
    if (badge) {
      badge.textContent = solvedToday ? 'Solved today - point claimed' : 'Not solved yet';
      badge.classList.toggle('solved', solvedToday);
    }
    if (submit) submit.disabled = solvedToday;
    if (streak) streak.textContent = `Solved: ${rows.length}`;
  };

  function loadDailyCodeLabChallenge() {
    const challenge = getDailyCodeLabChallenge();
    codeLabFiles = { ...CODE_LAB_PRACTICE_STARTER, ...challenge.files };
    setCodeLabLanguage(challenge.language || (codeLabEnvironment === 'java' ? 'java' : 'html'), false);
    refreshCodeLabHeader();
    window.refreshCodeLabStatus();
  }

  function renderCodeLabAssets() {
    const box = document.getElementById('code-lab-assets');
    if (!box) return;
    if (!codeLabAssets.length) {
      box.innerHTML = '<p>No practice assets uploaded yet.</p>';
      return;
    }
    box.innerHTML = codeLabAssets.map((asset, index) => `
      <div class="code-lab-asset">
        ${asset.type?.startsWith('image/') ? `<img src="${esc(asset.url)}" alt="">` : '<span class="code-lab-video-thumb">VIDEO</span>'}
        <div>
          <strong>${esc(asset.name)}</strong>
          <small>${esc(asset.type || 'asset')}</small>
        </div>
        <button type="button" data-code-lab-copy-asset="${index}">Copy src</button>
        <button type="button" data-code-lab-insert-asset="${index}">Insert</button>
      </div>
    `).join('');
  }

  window.initCodeLab = async function () {
    bindCodeLabEvents();
    initCodeLabRealtime();
    refreshCodeLabHeader();
    renderCodeLabAssets();
    updateEnvironmentUi();
    await initCodeLabEditor();
    if (codeLabMode === 'daily') loadDailyCodeLabChallenge();
    else {
      codeLabFiles = { ...codeLabPracticeFiles };
      setCodeLabLanguage(codeLabLanguage, false);
    }
  };

  window.openCodeLabEnvironment = async function (env) {
    saveActiveCodeLabFile();
    codeLabEnvironment = env === 'java' ? 'java' : 'web';
    codeLabLanguage = codeLabEnvironment === 'java' ? 'java' : 'html';
    document.getElementById('code-lab-shell')?.classList.remove('is-portrait');
    document.getElementById('code-lab-shell')?.classList.add('is-landscape');
    updateEnvironmentUi();
    await initCodeLabEditor();
    if (codeLabMode === 'daily') loadDailyCodeLabChallenge();
    else {
      codeLabFiles = { ...codeLabPracticeFiles };
      setCodeLabLanguage(codeLabLanguage, false);
    }
    codeLabSetConsole(`${codeLabEnvironment === 'java' ? 'Java Swing' : 'Web'} workspace ready.`);
  };

  window.returnCodeLabHome = function () {
    saveActiveCodeLabFile();
    document.getElementById('code-lab-shell')?.classList.add('is-portrait');
    document.getElementById('code-lab-shell')?.classList.remove('is-landscape');
  };

  window.switchCodeLabMode = function (mode) {
    saveActiveCodeLabFile();
    codeLabMode = mode === 'practice' ? 'practice' : 'daily';
    document.querySelectorAll('.code-lab-tab').forEach((tab) => tab.classList.remove('active'));
    document.getElementById(`code-lab-tab-${codeLabMode}`)?.classList.add('active');
    const submit = document.getElementById('code-lab-submit-btn');
    if (submit) submit.style.display = codeLabMode === 'daily' ? '' : 'none';
    if (codeLabMode === 'daily') loadDailyCodeLabChallenge();
    else {
      codeLabFiles = { ...codeLabPracticeFiles };
      setCodeLabLanguage(codeLabEnvironment === 'java' ? 'java' : 'html', false);
      codeLabSetConsole('Free practice ready.');
    }
  };

  window.setCodeLabLanguage = function (lang, persist = true) {
    if (persist) saveActiveCodeLabFile();
    codeLabLanguage = lang;
    document.querySelectorAll('.code-lab-file-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.lang === lang));
    setCodeLabEditorValue(codeLabFiles[lang] || '', lang);
  };

  function buildCodeLabPreviewSource() {
    const html = codeLabFiles.html || '';
    const css = `<style>${codeLabFiles.css || ''}</style>`;
    const js = String(codeLabFiles.javascript || '').replace(/<\/script>/gi, '<\\/script>');
    const harness = `<script>
      (function(){
        function send(level, message){ parent.postMessage({ type: 'code-lab-console', level: level, message: String(message) }, '*'); }
        ['log','warn','error'].forEach(function(level){
          var original = console[level];
          console[level] = function(){ send(level, Array.prototype.slice.call(arguments).join(' ')); original.apply(console, arguments); };
        });
        window.onerror = function(message, source, line, column){ send('error', message + ' at ' + line + ':' + column); };
      })();
    <\/script>`;
    const userScript = `<script>${js}\n<\/script>`;
    if (/<html[\s>]/i.test(html)) {
      return html
        .replace(/<\/head>/i, `${css}${harness}</head>`)
        .replace(/<\/body>/i, `${userScript}</body>`);
    }
    return `<!doctype html><html><head><meta charset="utf-8">${css}${harness}</head><body>${html}${userScript}</body></html>`;
  }

  window.runCodeLab = async function () {
    saveActiveCodeLabFile();
    codeLabConsoleLines = [];
    if (codeLabEnvironment === 'java' || codeLabLanguage === 'java') {
      codeLabSetConsole('Compiling Java...');
      try {
        const res = await fetch('/api/code-lab/run-java', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: codeLabFiles.java || '' }),
        });
        const data = await res.json();
        codeLabSetConsole(data.output || data.error || 'No output.', data.ok ? 'success' : 'error');
      } catch (error) {
        codeLabSetConsole(error.message, 'error');
      }
      return;
    }
    codeLabSetConsole('Rendering browser preview...');
    const frame = document.getElementById('code-lab-preview');
    if (frame) frame.srcdoc = buildCodeLabPreviewSource();
  };

  window.submitCodeLabChallenge = async function () {
    const activeUser = user();
    if (!activeUser?.username) return alertUser('Login first to claim debug points.');
    saveActiveCodeLabFile();
    const challenge = getDailyCodeLabChallenge();
    codeLabSetConsole('Checking solution...');
    try {
      const validation = await fetch('/api/code-lab/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: challenge.id, files: codeLabFiles }),
      }).then((res) => res.json());
      if (!validation.ok) {
        codeLabSetConsole(validation.error || 'Solution is not correct yet.', 'error');
        return;
      }
      const db = client();
      if (!db) throw new Error('Supabase client unavailable.');
      const { data, error } = await db.rpc('class_app_claim_code_lab_point', {
        p_challenge_id: challenge.id,
        p_challenge_date: codeLabTodayKey(),
      });
      if (error) throw error;
      if (data === 'already_claimed') {
        codeLabSetConsole('Point already claimed for today.', 'info');
      } else {
        codeLabSetConsole('Correct. You earned 1 debug point.', 'success');
        toast('CODE LAB point earned.');
      }
      window.refreshCodeLabStatus();
    } catch (error) {
      codeLabSetConsole(error.message, 'error');
    }
  };

  window.openCodeLabLeaderboard = async function () {
    closeModal('code-lab-leaderboard-modal');
    document.body.insertAdjacentHTML('beforeend', `
      <div id="code-lab-leaderboard-modal" class="custom-modal-overlay blur-bg high-z code-lab-modal-open">
        <div class="custom-modal-box contribution-modal-box border-blue">
          <button class="modal-close-btn" type="button" data-code-lab-close-leaderboard>&times;</button>
          <h3 class="modal-title text-blue">CODE LAB Leaderboard</h3>
          <div class="contribution-board-list" id="code-lab-leaderboard-list">${loader('Loading leaderboard...')}</div>
        </div>
      </div>
    `);
    document.querySelector('[data-code-lab-close-leaderboard]')?.addEventListener('click', () => closeModal('code-lab-leaderboard-modal'));
    const list = document.getElementById('code-lab-leaderboard-list');
    try {
      const db = client();
      if (!db) throw new Error('Supabase client unavailable.');
      const { data, error } = await db.rpc('class_app_code_lab_leaderboard');
      if (error) throw error;
      const rows = data || [];
      list.innerHTML = rows.length ? rows.map((row, index) => `
        <div class="contribution-row ${index < 3 ? 'top-rank' : ''}">
          <span class="contribution-rank">${rankIcon(index)}</span>
          <span class="contribution-user">${esc(row.username)}</span>
          <span class="contribution-total">${Number(row.total_points || 0).toLocaleString()} pts</span>
        </div>
      `).join('') : '<p class="lobby-open-empty">No solved challenges yet.</p>';
    } catch (error) {
      list.innerHTML = `<p class="lobby-open-empty">${esc(error.message)}</p>`;
    }
  };

  window.resetCodeLabWorkspace = function () {
    confirmUser('Reset the current CODE LAB workspace?', () => {
      if (codeLabMode === 'daily') loadDailyCodeLabChallenge();
      else {
        codeLabPracticeFiles = { ...CODE_LAB_PRACTICE_STARTER };
        codeLabFiles = { ...codeLabPracticeFiles };
        localStorage.setItem('codeLabPracticeFiles', JSON.stringify(codeLabPracticeFiles));
        setCodeLabLanguage(codeLabEnvironment === 'java' ? 'java' : 'html', false);
      }
      codeLabSetConsole('Workspace reset.');
    });
  };

  window.uploadCodeLabAssets = async function (event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    codeLabSetConsole('Uploading practice assets...');
    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      form.append('username', user()?.username || 'guest');
      try {
        const res = await fetch('/api/code-lab/assets', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        codeLabAssets.unshift(data);
      } catch (error) {
        toast(error.message, 'error');
      }
    }
    localStorage.setItem('codeLabAssets', JSON.stringify(codeLabAssets.slice(0, 30)));
    renderCodeLabAssets();
    codeLabSetConsole('Practice asset upload complete.', 'success');
    event.target.value = '';
  };

  window.copyCodeLabAssetSrc = function (index) {
    const asset = codeLabAssets[index];
    if (!asset) return;
    navigator.clipboard?.writeText(asset.url);
    toast('Asset src copied.');
  };

  window.insertCodeLabAssetSrc = function (index) {
    const asset = codeLabAssets[index];
    if (!asset) return;
    if (codeLabEnvironment !== 'web') {
      toast('Assets can be inserted into the HTML/CSS/JS environment only.', 'error');
      return;
    }
    if (codeLabLanguage !== 'html') setCodeLabLanguage('html');
    const snippet = asset.type?.startsWith('video/')
      ? `<video controls src="${asset.url}"></video>`
      : `<img src="${asset.url}" alt="${esc(asset.name)}">`;
    const current = getCodeLabEditorValue();
    setCodeLabEditorValue(`${current}\n${snippet}`, codeLabLanguage);
    saveActiveCodeLabFile();
  };

  function bindCodeLabEvents() {
    if (codeLabInitialized) return;
    codeLabInitialized = true;
    document.querySelectorAll('[data-code-lab-env]').forEach((button) => {
      button.addEventListener('click', () => window.openCodeLabEnvironment(button.dataset.codeLabEnv));
    });
    document.querySelectorAll('[data-code-lab-mode]').forEach((button) => {
      button.addEventListener('click', () => window.switchCodeLabMode(button.dataset.codeLabMode));
    });
    document.querySelectorAll('.code-lab-file-tab').forEach((button) => {
      button.addEventListener('click', () => window.setCodeLabLanguage(button.dataset.lang));
    });
    document.getElementById('code-lab-return-btn')?.addEventListener('click', window.returnCodeLabHome);
    document.getElementById('code-lab-run-btn')?.addEventListener('click', window.runCodeLab);
    document.getElementById('code-lab-submit-btn')?.addEventListener('click', window.submitCodeLabChallenge);
    document.getElementById('code-lab-reset-btn')?.addEventListener('click', window.resetCodeLabWorkspace);
    document.getElementById('code-lab-leaderboard-btn')?.addEventListener('click', window.openCodeLabLeaderboard);
    document.getElementById('code-lab-asset-input')?.addEventListener('change', window.uploadCodeLabAssets);
    document.getElementById('code-lab-assets')?.addEventListener('click', (event) => {
      const copy = event.target.closest('[data-code-lab-copy-asset]');
      const insert = event.target.closest('[data-code-lab-insert-asset]');
      if (copy) window.copyCodeLabAssetSrc(Number(copy.dataset.codeLabCopyAsset));
      if (insert) window.insertCodeLabAssetSrc(Number(insert.dataset.codeLabInsertAsset));
    });
    window.addEventListener('message', (event) => {
      if (event.data?.type !== 'code-lab-console') return;
      codeLabAppendConsole(event.data.message, event.data.level || 'log');
    });
    document.getElementById('code-lab-editor-fallback')?.addEventListener('input', () => saveActiveCodeLabFile());
  }

  function initCodeLabRealtime() {
    const db = client();
    if (codeLabRealtimeReady || !db) return;
    codeLabRealtimeReady = true;
    db.channel('public:code_lab_scores')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'code_lab_completions' }, () => {
        const board = document.getElementById('code-lab-leaderboard-list');
        if (board) window.openCodeLabLeaderboard?.();
        window.refreshCodeLabStatus?.();
      })
      .subscribe();
  }

  document.addEventListener('DOMContentLoaded', bindCodeLabEvents);
})();
