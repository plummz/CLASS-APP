window.codingEducationalModule = (function () {
  'use strict';

  const fallbackImage = 'coding-educational/assets/fallback-card.jpg';
  const PAGE_SIZE = 5;
  const completedKey = 'codingEducational.completedLessons';
  const bookmarksKey = 'codingEducational.bookmarks';
  const lastKey = 'codingEducational.lastLesson';
  let initialized = false;
  let route = { categoryId: null, subfolderId: null, chapterId: null, lessonId: null, quiz: false, page: 0 };
  let completed = loadSet(completedKey);
  let bookmarks = loadSet(bookmarksKey);

  function init() {
    const root = document.getElementById('coding-edu-view');
    if (!root) return;
    if (!initialized) {
      initialized = true;
      document.getElementById('coding-edu-search')?.addEventListener('input', () => {
        route.quiz = false;
        render();
      });
      document.getElementById('coding-edu-back')?.addEventListener('click', goBack);
      root.addEventListener('click', handleClick);
      root.addEventListener('input', handleInput);
      document.getElementById('coding-edu-breadcrumbs')?.addEventListener('click', handleBreadcrumbClick);
    }
    render();
  }

  function data() {
    return Array.isArray(window.codingEducationalData) ? window.codingEducationalData : [];
  }

  function loadSet(key) {
    try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); }
    catch (_) { return new Set(); }
  }

  function saveSet(key, set) {
    localStorage.setItem(key, JSON.stringify([...set]));
  }

  function getCategory() {
    return data().find((item) => item.id === route.categoryId);
  }

  function getSubfolder() {
    return getCategory()?.subfolders?.find((item) => item.id === route.subfolderId);
  }

  function getChapter() {
    return getSubfolder()?.chapters?.find((item) => item.id === route.chapterId);
  }

  function getLesson() {
    return getChapter()?.lessons?.find((item) => item.id === route.lessonId);
  }

  function allLessons() {
    const items = [];
    data().forEach((category) => {
      (category.subfolders || []).forEach((subfolder) => {
        (subfolder.chapters || []).forEach((chapter) => {
          (chapter.lessons || []).forEach((lesson) => {
            items.push({ category, subfolder, chapter, lesson });
          });
        });
      });
    });
    return items;
  }

  function escapeHTML(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function asArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  function renderTerms(terms) {
    const items = asArray(terms);
    if (!items.length) return '';
    return `
      <section class="coding-edu-lesson-section">
        <h3>Terms to Know</h3>
        <dl class="coding-edu-terms">
          ${items.map((term) => `
            <div>
              <dt>${escapeHTML(term.term || term.name || '')}</dt>
              <dd>${escapeHTML(term.definition || term.meaning || '')}</dd>
            </div>
          `).join('')}
        </dl>
      </section>
    `;
  }

  function renderParagraphSection(title, paragraphs) {
    const items = asArray(paragraphs).filter(Boolean);
    if (!items.length) return '';
    return `
      <section class="coding-edu-lesson-section">
        <h3>${escapeHTML(title)}</h3>
        ${items.map((text) => `<p>${escapeHTML(text)}</p>`).join('')}
      </section>
    `;
  }

  function renderBreakdown(items) {
    const parts = asArray(items);
    if (!parts.length) return '';
    return `
      <section class="coding-edu-lesson-section">
        <h3>Item-by-Item Breakdown</h3>
        <div class="coding-edu-breakdown">
          ${parts.map((item) => `
            <div class="coding-edu-breakdown-item">
              <h4>${escapeHTML(item.item || item.title || '')}</h4>
              <p>${escapeHTML(item.explanation || '')}</p>
              ${item.syntax ? `<pre class="coding-edu-code small"><code>${escapeHTML(item.syntax)}</code></pre>` : ''}
              ${item.example ? `<pre class="coding-edu-code small"><code>${escapeHTML(item.example)}</code></pre>` : ''}
              ${item.output ? `<p class="coding-edu-output"><strong>Output/result:</strong> ${escapeHTML(item.output)}</p>` : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderExamples(examples) {
    const items = asArray(examples);
    if (!items.length) return '';
    return `
      <section class="coding-edu-lesson-section">
        <div class="coding-edu-code-title">
          <h3>Examples</h3>
          <button class="coding-edu-action compact" data-action="copy-code" type="button">Copy First Example</button>
        </div>
        ${items.map((example, index) => `
          <div class="coding-edu-example" data-example-index="${index}">
            <h4>${escapeHTML(example.title || `Example ${index + 1}`)}</h4>
            ${example.before || example.after ? `
              <div class="coding-edu-before-after">
                <div>
                  <span>Before</span>
                  <iframe sandbox="" loading="lazy" srcdoc="${escapeHTML(example.before || buildPreviewDoc(example.code || '', example))}"></iframe>
                </div>
                <div>
                  <span>After</span>
                  <iframe sandbox="allow-scripts" loading="lazy" srcdoc="${escapeHTML(example.after || example.preview || buildPreviewDoc(example.code || '', example))}"></iframe>
                </div>
              </div>
            ` : ''}
            <textarea class="coding-edu-live-code" data-example-index="${index}" spellcheck="false" aria-label="Editable code for ${escapeHTML(example.title || `Example ${index + 1}`)}">${escapeHTML(example.code || '')}</textarea>
            <div class="coding-edu-action-row coding-edu-example-actions">
              <button class="coding-edu-action compact" data-action="copy-example" type="button">Copy Example</button>
              <button class="coding-edu-action compact" data-action="reset-example" type="button">Reset Code</button>
              <button class="coding-edu-action compact" data-action="run-example" type="button">Run Again</button>
            </div>
            <div class="coding-edu-preview-shell">
              <div class="coding-edu-preview-label">Live Preview</div>
              <iframe class="coding-edu-live-preview" data-example-index="${index}" sandbox="allow-scripts" loading="lazy" srcdoc="${escapeHTML(example.preview || buildPreviewDoc(example.code || '', example))}"></iframe>
            </div>
            ${example.output ? `<p class="coding-edu-output"><strong>Output/result:</strong> ${escapeHTML(example.output)}</p>` : ''}
            ${example.explanation ? `<p>${escapeHTML(example.explanation)}</p>` : ''}
          </div>
        `).join('')}
      </section>
    `;
  }

  function buildPreviewDoc(code, example = {}) {
    if (example.preview && !example.forceLive) return example.preview;
    return renderLivePreview(code, example);
  }

  function renderLivePreview(code, example = {}) {
    const kind = (example.kind || '').toLowerCase();
    const safeCode = String(code || '');
    const markup = example.markup || defaultPreviewMarkup(example.demoModel);
    const baseCss = example.baseCss || '';
    if (kind === 'html') return previewFrame(safeCode);
    if (kind === 'css') return previewFrame(`<style>${baseCss}\n${safeCode}</style>${markup}`);
    if (kind === 'javascript') return previewFrame(`<style>${baseCss}</style>${markup}<script>
      const logs = [];
      const originalLog = console.log;
      console.log = (...args) => { logs.push(args.join(' ')); originalLog(...args); };
      try { ${safeCode} } catch (error) { logs.push('Error: ' + error.message); }
      document.body.insertAdjacentHTML('beforeend', '<pre class="console">' + logs.join('\\n') + '</pre>');
    <\/script>`);
    return previewFrame(`<pre class="console">${escapeHTML(example.output || safeCode || '[No output]')}</pre>`);
  }

  function defaultPreviewMarkup(model = 'card') {
    if (model === 'navbar') return '<nav class="demo-nav"><a>Home</a><a>Lessons</a><a>Profile</a></nav>';
    if (model === 'form') return '<form class="demo-form"><label>Name <input value="Mika"></label><button type="button">Save</button></form>';
    if (model === 'alert') return '<div class="demo-alert"><strong>Notice</strong><span> Review your entry before sending.</span></div>';
    if (model === 'gallery') return '<section class="demo-gallery"><figure>Image 1</figure><figure>Image 2</figure><figure>Image 3</figure></section>';
    if (model === 'table') return '<table class="demo-table"><tr><th>Name</th><th>Score</th></tr><tr><td>Ana</td><td>95</td></tr></table>';
    if (model === 'hero') return '<section class="demo-hero"><h2>Build Better Pages</h2><p>Practice one change at a time.</p><button>Start</button></section>';
    if (model === 'profile') return '<article class="demo-profile"><div class="avatar">A</div><h3>Ana Cruz</h3><p>Frontend student</p></article>';
    if (model === 'menu') return '<aside class="demo-menu"><button>Dashboard</button><button>Files</button><button>Settings</button></aside>';
    if (model === 'dashboard') return '<section class="demo-dashboard"><div>Tasks<br><b>12</b></div><div>Done<br><b>8</b></div><div>Score<br><b>92</b></div></section>';
    if (model === 'banner') return '<section class="demo-banner">Enrollment reminder: submit requirements this week.</section>';
    return '<article class="demo-card"><h3>Lesson Card</h3><p>This card shows the current code result.</p><button>Open</button></article>';
  }

  function previewFrame(body) {
    return `<!doctype html><html><head><meta charset="utf-8"><style>
      body{margin:0;font-family:Inter,Arial,sans-serif;background:#f8fafc;color:#0f172a;padding:14px}
      *{box-sizing:border-box}.demo-card,.demo-form,.demo-alert,.demo-profile,.demo-banner,.demo-hero{border:2px solid #38bdf8;border-radius:14px;padding:14px;background:white}
      .demo-nav,.demo-gallery,.demo-dashboard,.demo-menu{border:2px dashed #38bdf8;border-radius:14px;padding:12px;background:white}
      .demo-nav a,.demo-menu button,.demo-hero button,.demo-card button,.demo-form button{display:inline-flex;margin:4px;padding:8px 10px;border:1px solid #0ea5e9;border-radius:9px;background:#e0f2fe;color:#075985;font-weight:800}
      .demo-gallery figure,.demo-dashboard div{display:inline-flex;align-items:center;justify-content:center;min-width:74px;min-height:58px;margin:6px;border:2px solid #0ea5e9;border-radius:12px;background:#dff6ff;font-weight:800}
      .demo-table{width:100%;border-collapse:collapse;background:white}.demo-table th,.demo-table td{border:1px solid #38bdf8;padding:8px;text-align:left}
      .avatar{display:inline-flex;align-items:center;justify-content:center;width:54px;height:54px;border-radius:50%;background:#bae6fd;font-weight:900}
      .console{white-space:pre-wrap;background:#0f172a;color:#bbf7d0;border-radius:12px;padding:12px;margin:8px 0 0}
      .lesson,.card,.button,.item,.box{border:2px solid #38bdf8;border-radius:12px;padding:12px;margin:8px;background:#fff}
    </style></head><body>${body}</body></html>`;
  }
  function lessonKey(categoryId, subfolderId, chapterId, lessonId) {
    return `${categoryId}/${subfolderId}/${chapterId}/${lessonId}`;
  }

  function currentLessonKey() {
    return lessonKey(route.categoryId, route.subfolderId, route.chapterId, route.lessonId);
  }

  function cardImageStyle(image) {
    return `--card-bg: url('${escapeHTML(image || fallbackImage)}')`;
  }

  function percent(done, total) {
    if (!total) return 0;
    return Math.round((done / total) * 100);
  }

  function chapterProgress(categoryId, subfolderId, chapter) {
    const done = (chapter.lessons || []).filter((lesson) => completed.has(lessonKey(categoryId, subfolderId, chapter.id, lesson.id))).length;
    return { done, total: chapter.lessons?.length || 0, pct: percent(done, chapter.lessons?.length || 0) };
  }

  function subfolderProgress(categoryId, subfolder) {
    const lessons = (subfolder.chapters || []).flatMap((chapter) => chapter.lessons || []);
    const done = (subfolder.chapters || []).reduce((sum, chapter) =>
      sum + (chapter.lessons || []).filter((lesson) => completed.has(lessonKey(categoryId, subfolder.id, chapter.id, lesson.id))).length, 0);
    return { done, total: lessons.length, pct: percent(done, lessons.length) };
  }

  function card(kind, item, extra = {}) {
    const count = extra.count ? `<span class="coding-edu-pill">${escapeHTML(extra.count)}</span>` : '';
    const progress = typeof extra.progress === 'number' ? `
      <div class="coding-edu-progress" aria-label="Progress ${extra.progress}%">
        <span style="width:${extra.progress}%"></span>
      </div>
      <div class="coding-edu-progress-label">${extra.progress}% complete</div>
    ` : '';
    const tags = item.tags || (item.level ? [item.level] : ['Beginner']);
    return `
      <button class="coding-edu-card" style="${cardImageStyle(item.image || extra.image)}" data-kind="${kind}" data-id="${escapeHTML(item.id)}" type="button" aria-label="Open ${escapeHTML(item.title)}">
        <div class="coding-edu-card-meta">
          ${tags.map((tag) => `<span class="coding-edu-pill">${escapeHTML(tag)}</span>`).join('')}
          ${count}
        </div>
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.description || item.summary || '')}</p>
        ${progress}
      </button>
    `;
  }

  function render() {
    const query = document.getElementById('coding-edu-search')?.value.trim().toLowerCase() || '';
    renderBreadcrumbs();
    updateBackButton();
    if (query) {
      renderSearch(query);
      return;
    }
    if (route.quiz) renderQuiz();
    else if (route.lessonId) renderLesson();
    else if (route.chapterId) renderLessonPage();
    else if (route.subfolderId) renderChapters();
    else if (route.categoryId) renderSubfolders();
    else renderCategories();
  }

  function renderCategories() {
    const view = document.getElementById('coding-edu-view');
    const last = readLastLesson();
    const bookmarkCards = allLessons()
      .filter(({ category, subfolder, chapter, lesson }) => bookmarks.has(lessonKey(category.id, subfolder.id, chapter.id, lesson.id)))
      .slice(0, 4);
    view.innerHTML = `
      <div class="coding-edu-learn-panel">
        <button class="coding-edu-action primary" data-action="continue" type="button" ${last ? '' : 'disabled'}>Continue Learning</button>
        <span>${last ? 'Jump back to your last opened lesson.' : 'Open a lesson and it will appear here next time.'}</span>
      </div>
      ${bookmarkCards.length ? `
        <section class="coding-edu-bookmarks">
          <div class="coding-edu-section-title">Bookmarked Lessons</div>
          <div class="coding-edu-mini-list">
            ${bookmarkCards.map(({ category, subfolder, chapter, lesson }) => `
              <button class="coding-edu-mini-card" data-action="open-bookmark" data-category-id="${category.id}" data-subfolder-id="${subfolder.id}" data-chapter-id="${chapter.id}" data-lesson-id="${lesson.id}" type="button">
                <strong>${escapeHTML(lesson.title)}</strong>
                <span>${escapeHTML(category.title)} / ${escapeHTML(subfolder.title)}</span>
              </button>
            `).join('')}
          </div>
        </section>
      ` : ''}
      <div class="coding-edu-grid">${data().map((category) => card('category', category, { count: `${category.subfolders?.length || 0} books` })).join('')}</div>
    `;
    preloadCardImages();
  }

  function renderSubfolders() {
    const category = getCategory();
    const view = document.getElementById('coding-edu-view');
    if (!category) { resetRoute(); return; }
    view.innerHTML = `<div class="coding-edu-grid">${(category.subfolders || []).map((sub) => {
      const prog = subfolderProgress(category.id, sub);
      return card('subfolder', sub, { count: `${sub.chapters?.length || 0} chapters`, progress: prog.pct });
    }).join('')}</div>`;
    preloadCardImages();
  }

  function renderChapters() {
    const category = getCategory();
    const subfolder = getSubfolder();
    const view = document.getElementById('coding-edu-view');
    if (!subfolder) { route.subfolderId = null; render(); return; }
    view.innerHTML = `<div class="coding-edu-grid">${(subfolder.chapters || []).map((chapter) => {
      const prog = chapterProgress(category.id, subfolder.id, chapter);
      return card('chapter', { ...chapter, image: subfolder.image }, { count: `${chapter.lessons?.length || 0} lessons`, progress: prog.pct });
    }).join('')}</div>`;
    preloadCardImages();
  }

  function renderLessonPage() {
    const category = getCategory();
    const subfolder = getSubfolder();
    const chapter = getChapter();
    const view = document.getElementById('coding-edu-view');
    if (!chapter) { route.chapterId = null; render(); return; }

    const lessons = chapter.lessons || [];
    const pageCount = Math.max(1, Math.ceil(lessons.length / PAGE_SIZE));
    route.page = Math.max(0, Math.min(route.page || 0, pageCount - 1));
    const start = route.page * PAGE_SIZE;
    const visible = lessons.slice(start, start + PAGE_SIZE);
    const prog = chapterProgress(category.id, subfolder.id, chapter);

    view.innerHTML = `
      <section class="coding-edu-chapter-head">
        <div>
          <div class="coding-edu-section-title">${escapeHTML(chapter.title)}</div>
          <p>${escapeHTML(chapter.description || '')}</p>
          <div class="coding-edu-progress wide"><span style="width:${prog.pct}%"></span></div>
          <small>${prog.done} of ${prog.total} completed · ${prog.pct}%</small>
        </div>
        <button class="coding-edu-action" data-action="quiz" type="button" ${prog.pct < 100 ? 'disabled title="Finish all lessons first"' : ''}>Take Quiz</button>
      </section>
      <div class="coding-edu-grid">${visible.map((lesson) => card('lesson', {
        ...lesson,
        description: lesson.summary,
        image: subfolder.image,
        level: completed.has(lessonKey(category.id, subfolder.id, chapter.id, lesson.id)) ? 'Completed' : lesson.readingTime,
      }, { count: lesson.readingTime })).join('')}</div>
      <div class="coding-edu-pager">
        <button class="coding-edu-action" data-action="prev-page" type="button" ${route.page <= 0 ? 'disabled' : ''}>Previous 5</button>
        <span>Page ${route.page + 1} of ${pageCount}</span>
        <button class="coding-edu-action" data-action="next-page" type="button" ${route.page >= pageCount - 1 ? 'disabled' : ''}>Next 5</button>
      </div>
    `;
    preloadCardImages();
  }

  function renderLesson() {
    const lesson = getLesson();
    const view = document.getElementById('coding-edu-view');
    if (!lesson) { route.lessonId = null; render(); return; }
    const key = currentLessonKey();
    localStorage.setItem(lastKey, JSON.stringify(route));
    view.innerHTML = `
      <article class="coding-edu-lesson">
        <div class="coding-edu-lesson-actions">
          <div class="coding-edu-tags">
            ${(lesson.tags || []).map((tag) => `<span class="coding-edu-pill">${escapeHTML(tag)}</span>`).join('')}
            <span class="coding-edu-pill">${escapeHTML(lesson.readingTime)}</span>
            ${completed.has(key) ? '<span class="coding-edu-pill success">Completed</span>' : ''}
          </div>
          <div class="coding-edu-action-row">
            <button class="coding-edu-action" data-action="bookmark" type="button">${bookmarks.has(key) ? 'Remove Bookmark' : 'Bookmark'}</button>
            <button class="coding-edu-action primary" data-action="complete" type="button">${completed.has(key) ? 'Completed' : 'Mark as Completed'}</button>
          </div>
        </div>
        <h2>${escapeHTML(lesson.title)}</h2>
        <p>${escapeHTML(lesson.summary || lesson.overview)}</p>
        ${renderParagraphSection('Overview', lesson.overview)}
        ${renderTerms(lesson.termsToKnow)}
        ${renderParagraphSection('Detailed Explanation', lesson.detailedExplanation)}
        ${renderBreakdown(lesson.breakdown)}
        ${renderParagraphSection('Syntax', lesson.syntax)}
        <section class="coding-edu-lesson-section">
          <h3>Key Points</h3>
          <ul>${(lesson.keyPoints || []).map((point) => `<li>${escapeHTML(point)}</li>`).join('')}</ul>
        </section>
        ${lesson.examples ? renderExamples(lesson.examples) : `<section class="coding-edu-lesson-section">
          <div class="coding-edu-code-title">
            <h3>${escapeHTML(lesson.example?.title || 'Example')}</h3>
            <button class="coding-edu-action compact" data-action="copy-code" type="button">Copy</button>
          </div>
          <pre class="coding-edu-code"><code>${escapeHTML(lesson.example?.code || '')}</code></pre>
        </section>`}
        ${renderParagraphSection('Explanation of Output / Result', lesson.outputExplanation)}
        <details class="coding-edu-why">
          <summary>Why this works</summary>
          ${asArray(lesson.whyThisWorks).map((text) => `<p>${escapeHTML(text)}</p>`).join('') || '<p>This works because each line follows the syntax rules and produces a result the browser, language, command, or database can understand.</p>'}
        </details>
        ${lesson.exercise ? `
          <section class="coding-edu-lesson-section coding-edu-exercise">
            <h3>Guided Mini Task</h3>
            <p>${escapeHTML(lesson.exercise.prompt)}</p>
            <textarea class="coding-edu-exercise-input" spellcheck="false" aria-label="Exercise answer">${escapeHTML(lesson.exercise.starter || '')}</textarea>
            <div class="coding-edu-action-row">
              <button class="coding-edu-action primary" data-action="check-exercise" type="button">Check Answer</button>
              <span class="coding-edu-exercise-result" aria-live="polite"></span>
            </div>
          </section>
        ` : ''}
        <section class="coding-edu-lesson-section">
          <h3>Common Mistakes</h3>
          <ul>${(lesson.commonMistakes || []).map((point) => `<li>${escapeHTML(point)}</li>`).join('')}</ul>
        </section>
        <section class="coding-edu-lesson-section">
          <h3>Recap</h3>
          <p>${escapeHTML(lesson.recap)}</p>
        </section>
        <section class="coding-edu-lesson-section">
          <h3>Sources / Based On</h3>
          <div class="coding-edu-sources">
            ${(lesson.sources || []).map((src) => `<a class="coding-edu-source" href="${escapeHTML(src.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(src.name)}</a>`).join('')}
          </div>
        </section>
      </article>
    `;
  }

  function renderQuiz() {
    const chapter = getChapter();
    const view = document.getElementById('coding-edu-view');
    if (!chapter) { route.quiz = false; render(); return; }
    view.innerHTML = `
      <form class="coding-edu-quiz" id="coding-edu-quiz-form">
        <h2>${escapeHTML(chapter.title)} Quiz</h2>
        <p>Choose the best answer for each question.</p>
        ${(chapter.quiz || []).map((q, qi) => `
          <fieldset class="coding-edu-question">
            <legend>${escapeHTML(q.question)}</legend>
            ${q.choices.map((choice, ci) => `
              <label>
                <input type="radio" name="${escapeHTML(q.id)}" value="${ci}">
                <span>${escapeHTML(choice)}</span>
              </label>
            `).join('')}
          </fieldset>
        `).join('')}
        <div class="coding-edu-action-row">
          <button class="coding-edu-action primary" data-action="submit-quiz" type="button">Submit Quiz</button>
          <button class="coding-edu-action" data-action="close-quiz" type="button">Back to Lessons</button>
        </div>
        <div id="coding-edu-quiz-result" class="coding-edu-quiz-result"></div>
      </form>
    `;
  }

  function renderSearch(query) {
    const results = [];
    data().forEach((category) => {
      if (matches(category, query)) results.push({ kind: 'category', item: category, categoryId: category.id, path: category.title });
      (category.subfolders || []).forEach((subfolder) => {
        if (matches(subfolder, query)) results.push({ kind: 'subfolder', item: subfolder, categoryId: category.id, subfolderId: subfolder.id, path: `${category.title} / ${subfolder.title}` });
        (subfolder.chapters || []).forEach((chapter) => {
          if (matches(chapter, query)) results.push({ kind: 'chapter', item: chapter, categoryId: category.id, subfolderId: subfolder.id, chapterId: chapter.id, image: subfolder.image, path: `${category.title} / ${subfolder.title} / ${chapter.title}` });
          (chapter.lessons || []).forEach((lesson) => {
            if (matches(lesson, query)) results.push({ kind: 'lesson', item: lesson, categoryId: category.id, subfolderId: subfolder.id, chapterId: chapter.id, image: subfolder.image, path: `${category.title} / ${subfolder.title} / ${chapter.title} / ${lesson.title}` });
          });
        });
      });
    });
    const view = document.getElementById('coding-edu-view');
    if (!results.length) {
      view.innerHTML = '<div class="coding-edu-empty">No lessons matched your search yet.</div>';
      return;
    }
    view.innerHTML = `<div class="coding-edu-grid">${results.slice(0, 40).map((result) => card(result.kind, {
      ...result.item,
      image: result.item.image || result.image,
      description: result.path,
      level: result.item.readingTime || result.item.level || 'Beginner',
    }, { count: result.kind })).join('')}</div>`;
    view.querySelectorAll('.coding-edu-card').forEach((el, index) => {
      Object.entries(results[index]).forEach(([key, value]) => {
        if (key.endsWith('Id')) el.dataset[key] = value;
      });
    });
    preloadCardImages();
  }

  function searchableText(item) {
    const chunks = [
      item.title,
      item.description,
      item.summary,
      item.overview,
      item.syntax,
      item.recap,
      ...(item.tags || []),
      ...(item.keywords || []),
      ...(item.keyPoints || []),
      ...asArray(item.detailedExplanation),
      ...asArray(item.outputExplanation),
      ...(item.commonMistakes || []),
      ...(item.termsToKnow || []).flatMap((term) => [term.term, term.definition]),
      ...(item.breakdown || []).flatMap((part) => [part.item, part.explanation, part.syntax, part.example, part.output]),
      ...(item.examples || []).flatMap((example) => [example.title, example.code, example.preview, example.output, example.explanation]),
      item.exercise?.prompt,
      item.exercise?.expected,
      ...asArray(item.whyThisWorks),
    ];
    return chunks.filter(Boolean).join(' ').toLowerCase();
  }

  function matches(item, query) {
    return searchableText(item).includes(query);
  }

  function handleClick(event) {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action) {
      handleAction(action, event);
      return;
    }

    const cardEl = event.target.closest('.coding-edu-card');
    if (!cardEl) return;
    const kind = cardEl.dataset.kind;
    if (kind === 'category') route = { categoryId: cardEl.dataset.id, subfolderId: null, chapterId: null, lessonId: null, quiz: false, page: 0 };
    if (kind === 'subfolder') route = { categoryId: cardEl.dataset.categoryId || route.categoryId, subfolderId: cardEl.dataset.id, chapterId: null, lessonId: null, quiz: false, page: 0 };
    if (kind === 'chapter') route = { categoryId: cardEl.dataset.categoryId || route.categoryId, subfolderId: cardEl.dataset.subfolderId || route.subfolderId, chapterId: cardEl.dataset.id, lessonId: null, quiz: false, page: 0 };
    if (kind === 'lesson') route = { categoryId: cardEl.dataset.categoryId || route.categoryId, subfolderId: cardEl.dataset.subfolderId || route.subfolderId, chapterId: cardEl.dataset.chapterId || route.chapterId, lessonId: cardEl.dataset.id, quiz: false, page: route.page || 0 };
    document.getElementById('coding-edu-search').value = '';
    render();
  }

  function handleAction(action, event) {
    if (action === 'next-page') route.page = (route.page || 0) + 1;
    if (action === 'prev-page') route.page = Math.max(0, (route.page || 0) - 1);
    if (action === 'quiz') route.quiz = true;
    if (action === 'close-quiz') route.quiz = false;
    if (action === 'complete') {
      completed.add(currentLessonKey());
      saveSet(completedKey, completed);
    }
    if (action === 'bookmark') {
      const key = currentLessonKey();
      if (bookmarks.has(key)) bookmarks.delete(key); else bookmarks.add(key);
      saveSet(bookmarksKey, bookmarks);
    }
    if (action === 'continue') {
      const last = readLastLesson();
      if (last) route = { ...last, quiz: false };
    }
    if (action === 'open-bookmark') {
      const el = event.target.closest('[data-action]');
      route = { categoryId: el.dataset.categoryId, subfolderId: el.dataset.subfolderId, chapterId: el.dataset.chapterId, lessonId: el.dataset.lessonId, quiz: false, page: 0 };
    }
    if (action === 'copy-code') {
      const code = event.target.closest('.coding-edu-lesson-section')?.querySelector('.coding-edu-code code')?.textContent
        || event.target.closest('.coding-edu-lesson-section')?.querySelector('.coding-edu-live-code')?.value
        || getLesson()?.examples?.[0]?.code
        || getLesson()?.example?.code
        || '';
      navigator.clipboard?.writeText(code).catch(() => {});
    }
    if (action === 'copy-example') {
      const code = event.target.closest('.coding-edu-example')?.querySelector('.coding-edu-live-code')?.value || '';
      navigator.clipboard?.writeText(code).catch(() => {});
      return;
    }
    if (action === 'reset-example') {
      const exampleEl = event.target.closest('.coding-edu-example');
      const editor = exampleEl?.querySelector('.coding-edu-live-code');
      const lesson = getLesson();
      const index = Number(exampleEl?.dataset.exampleIndex || 0);
      const example = lesson?.examples?.[index] || {};
      if (editor) editor.value = example.code || '';
      updateExamplePreview(exampleEl, editor, example);
      return;
    }
    if (action === 'run-example') {
      const exampleEl = event.target.closest('.coding-edu-example');
      const editor = exampleEl?.querySelector('.coding-edu-live-code');
      const lesson = getLesson();
      const index = Number(exampleEl?.dataset.exampleIndex || 0);
      updateExamplePreview(exampleEl, editor, lesson?.examples?.[index] || {});
      return;
    }
    if (action === 'check-exercise') {
      checkExercise(event);
      return;
    }
    if (action === 'submit-quiz') {
      scoreQuiz();
      return;
    }
    render();
  }

  function handleInput(event) {
    const editor = event.target.closest('.coding-edu-live-code');
    if (!editor) return;
    const lesson = getLesson();
    const index = Number(editor.dataset.exampleIndex || 0);
    const example = lesson?.examples?.[index] || {};
    updateExamplePreview(editor.closest('.coding-edu-example'), editor, example);
  }

  function updateExamplePreview(exampleEl, editor, example = {}) {
    const frame = exampleEl?.querySelector('.coding-edu-live-preview');
    if (frame && editor) frame.srcdoc = renderLivePreview(editor.value, { ...example, preview: '', forceLive: true });
  }

  function checkExercise(event) {
    const lesson = getLesson();
    const box = event.target.closest('.coding-edu-exercise');
    const input = box?.querySelector('.coding-edu-exercise-input');
    const result = box?.querySelector('.coding-edu-exercise-result');
    if (!lesson?.exercise || !input || !result) return;
    const answer = input.value.toLowerCase();
    const expected = asArray(lesson.exercise.expected).map((value) => String(value).toLowerCase());
    const ok = expected.every((value) => answer.includes(value));
    result.textContent = ok ? 'Correct. Your answer includes the required idea.' : `Not yet. Include: ${expected.join(', ')}`;
    result.classList.toggle('success', ok);
  }

  function scoreQuiz() {
    const chapter = getChapter();
    const form = document.getElementById('coding-edu-quiz-form');
    const result = document.getElementById('coding-edu-quiz-result');
    if (!chapter || !form || !result) return;
    let score = 0;
    (chapter.quiz || []).forEach((q) => {
      const selected = form.querySelector(`input[name="${CSS.escape(q.id)}"]:checked`);
      if (Number(selected?.value) === q.answerIndex) score++;
    });
    result.textContent = `Score: ${score} of ${chapter.quiz.length}`;
    result.classList.add('show');
  }

  function readLastLesson() {
    try { return JSON.parse(localStorage.getItem(lastKey) || 'null'); }
    catch (_) { return null; }
  }

  function renderBreadcrumbs() {
    const category = getCategory();
    const subfolder = getSubfolder();
    const chapter = getChapter();
    const lesson = getLesson();
    const crumbs = [
      { label: 'Coding Lessons', level: 'home' },
      category && { label: category.title, level: 'category' },
      subfolder && { label: subfolder.title, level: 'subfolder' },
      chapter && { label: chapter.title, level: 'chapter' },
      lesson && { label: lesson.title, level: 'lesson' },
      route.quiz && { label: 'Quiz', level: 'quiz' },
    ].filter(Boolean);
    document.getElementById('coding-edu-breadcrumbs').innerHTML = crumbs.map((crumb, index) =>
      `<button class="coding-edu-crumb" data-level="${crumb.level}" type="button">${escapeHTML(crumb.label)}</button>${index < crumbs.length - 1 ? '<span>/</span>' : ''}`
    ).join('');
  }

  function handleBreadcrumbClick(event) {
    const crumb = event.target.closest('.coding-edu-crumb');
    if (!crumb) return;
    const level = crumb.dataset.level;
    if (level === 'home') route = { categoryId: null, subfolderId: null, chapterId: null, lessonId: null, quiz: false, page: 0 };
    if (level === 'category') route = { categoryId: route.categoryId, subfolderId: null, chapterId: null, lessonId: null, quiz: false, page: 0 };
    if (level === 'subfolder') route = { categoryId: route.categoryId, subfolderId: route.subfolderId, chapterId: null, lessonId: null, quiz: false, page: 0 };
    if (level === 'chapter') route = { categoryId: route.categoryId, subfolderId: route.subfolderId, chapterId: route.chapterId, lessonId: null, quiz: false, page: route.page || 0 };
    render();
  }

  function goBack() {
    if (route.quiz) route.quiz = false;
    else if (route.lessonId) route.lessonId = null;
    else if (route.chapterId) route.chapterId = null;
    else if (route.subfolderId) route.subfolderId = null;
    else if (route.categoryId) route.categoryId = null;
    render();
  }

  function updateBackButton() {
    const button = document.getElementById('coding-edu-back');
    if (!button) return;
    button.hidden = !(route.categoryId || route.subfolderId || route.chapterId || route.lessonId || route.quiz);
  }

  function resetRoute() {
    route = { categoryId: null, subfolderId: null, chapterId: null, lessonId: null, quiz: false, page: 0 };
    render();
  }

  function preloadCardImages() {
    document.querySelectorAll('.coding-edu-card').forEach((cardEl) => {
      const raw = cardEl.style.getPropertyValue('--card-bg').replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
      if (!raw || raw === fallbackImage) return;
      const test = new Image();
      test.onerror = () => cardEl.style.setProperty('--card-bg', `url('${fallbackImage}')`);
      test.src = raw;
    });
  }

  return { init };
})();

window.initCodingEducational = window.codingEducationalModule.init;
