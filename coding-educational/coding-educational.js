window.codingEducationalModule = (function () {
  'use strict';

  const fallbackImage = 'coding-educational/assets/fallback-card.jpg';
  let initialized = false;
  let route = { categoryId: null, subfolderId: null, lessonId: null };

  function init() {
    const root = document.getElementById('coding-edu-view');
    if (!root) return;
    if (!initialized) {
      initialized = true;
      document.getElementById('coding-edu-search')?.addEventListener('input', render);
      document.getElementById('coding-edu-back')?.addEventListener('click', goBack);
      root.addEventListener('click', handleClick);
      document.getElementById('coding-edu-breadcrumbs')?.addEventListener('click', handleBreadcrumbClick);
    }
    render();
  }

  function data() {
    return Array.isArray(window.codingEducationalData) ? window.codingEducationalData : [];
  }

  function getCategory() {
    return data().find((item) => item.id === route.categoryId);
  }

  function getSubfolder() {
    return getCategory()?.subfolders?.find((item) => item.id === route.subfolderId);
  }

  function getLesson() {
    return getSubfolder()?.lessons?.find((item) => item.id === route.lessonId);
  }

  function escapeHTML(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function cardImageStyle(image) {
    return `--card-bg: url('${escapeHTML(image || fallbackImage)}')`;
  }

  function card(kind, item, extra = {}) {
    const count = extra.count ? `<span class="coding-edu-pill">${escapeHTML(extra.count)}</span>` : '';
    const tags = item.tags || (item.level ? [item.level] : ['Beginner']);
    return `
      <button class="coding-edu-card" style="${cardImageStyle(item.image)}" data-kind="${kind}" data-id="${escapeHTML(item.id)}" type="button" aria-label="Open ${escapeHTML(item.title)}">
        <div class="coding-edu-card-meta">
          ${tags.map((tag) => `<span class="coding-edu-pill">${escapeHTML(tag)}</span>`).join('')}
          ${count}
        </div>
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.description || item.summary || '')}</p>
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
    if (route.lessonId) renderLesson();
    else if (route.subfolderId) renderLessons();
    else if (route.categoryId) renderSubfolders();
    else renderCategories();
  }

  function renderCategories() {
    const view = document.getElementById('coding-edu-view');
    view.innerHTML = `<div class="coding-edu-grid">${data().map((category) => card('category', category, { count: `${category.subfolders?.length || 0} folders` })).join('')}</div>`;
    preloadCardImages();
  }

  function renderSubfolders() {
    const category = getCategory();
    const view = document.getElementById('coding-edu-view');
    if (!category) { resetRoute(); return; }
    view.innerHTML = `<div class="coding-edu-grid">${(category.subfolders || []).map((sub) => card('subfolder', sub, { count: `${sub.lessons?.length || 0} lessons` })).join('')}</div>`;
    preloadCardImages();
  }

  function renderLessons() {
    const subfolder = getSubfolder();
    const view = document.getElementById('coding-edu-view');
    if (!subfolder) { route.subfolderId = null; render(); return; }
    view.innerHTML = `<div class="coding-edu-grid">${(subfolder.lessons || []).map((lesson) => card('lesson', {
      ...lesson,
      description: lesson.summary,
      image: subfolder.image,
      level: lesson.readingTime,
    }, { count: lesson.readingTime })).join('')}</div>`;
    preloadCardImages();
  }

  function renderLesson() {
    const lesson = getLesson();
    const view = document.getElementById('coding-edu-view');
    if (!lesson) { route.lessonId = null; render(); return; }
    view.innerHTML = `
      <article class="coding-edu-lesson">
        <div class="coding-edu-tags">
          ${(lesson.tags || []).map((tag) => `<span class="coding-edu-pill">${escapeHTML(tag)}</span>`).join('')}
          <span class="coding-edu-pill">${escapeHTML(lesson.readingTime)}</span>
        </div>
        <h2>${escapeHTML(lesson.title)}</h2>
        <p>${escapeHTML(lesson.summary)}</p>
        <section class="coding-edu-lesson-section">
          <h3>Key Points</h3>
          <ul>${(lesson.keyPoints || []).map((point) => `<li>${escapeHTML(point)}</li>`).join('')}</ul>
        </section>
        <section class="coding-edu-lesson-section">
          <h3>${escapeHTML(lesson.example?.title || 'Example')}</h3>
          <pre class="coding-edu-code"><code>${escapeHTML(lesson.example?.code || '')}</code></pre>
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

  function renderSearch(query) {
    const results = [];
    data().forEach((category) => {
      if (matches(category, query)) results.push({ kind: 'category', item: category, path: category.title });
      (category.subfolders || []).forEach((subfolder) => {
        if (matches(subfolder, query)) results.push({ kind: 'subfolder', item: subfolder, categoryId: category.id, path: `${category.title} / ${subfolder.title}` });
        (subfolder.lessons || []).forEach((lesson) => {
          if (matches(lesson, query)) results.push({ kind: 'lesson', item: lesson, categoryId: category.id, subfolderId: subfolder.id, image: subfolder.image, path: `${category.title} / ${subfolder.title} / ${lesson.title}` });
        });
      });
    });
    const view = document.getElementById('coding-edu-view');
    if (!results.length) {
      view.innerHTML = '<div class="coding-edu-empty">No lessons matched your search yet.</div>';
      return;
    }
    view.innerHTML = `<div class="coding-edu-grid">${results.map((result) => card(result.kind, {
      ...result.item,
      image: result.item.image || result.image,
      description: result.path,
      level: result.item.readingTime || result.item.level || 'Beginner',
    }, { count: result.kind })).join('')}</div>`;
    view.querySelectorAll('.coding-edu-card').forEach((el, index) => {
      const result = results[index];
      el.dataset.categoryId = result.categoryId || result.item.id;
      el.dataset.subfolderId = result.subfolderId || result.item.id;
    });
    preloadCardImages();
  }

  function matches(item, query) {
    return [item.title, item.description, item.summary, ...(item.tags || [])].join(' ').toLowerCase().includes(query);
  }

  function handleClick(event) {
    const cardEl = event.target.closest('.coding-edu-card');
    if (!cardEl) return;
    const kind = cardEl.dataset.kind;
    if (kind === 'category') {
      route = { categoryId: cardEl.dataset.id, subfolderId: null, lessonId: null };
    } else if (kind === 'subfolder') {
      route = { categoryId: cardEl.dataset.categoryId || route.categoryId, subfolderId: cardEl.dataset.id, lessonId: null };
    } else if (kind === 'lesson') {
      route = { categoryId: cardEl.dataset.categoryId || route.categoryId, subfolderId: cardEl.dataset.subfolderId || route.subfolderId, lessonId: cardEl.dataset.id };
    }
    document.getElementById('coding-edu-search').value = '';
    render();
  }

  function renderBreadcrumbs() {
    const category = getCategory();
    const subfolder = getSubfolder();
    const lesson = getLesson();
    const crumbs = [
      { label: 'Coding Lessons', level: 'home' },
      category && { label: category.title, level: 'category' },
      subfolder && { label: subfolder.title, level: 'subfolder' },
      lesson && { label: lesson.title, level: 'lesson' },
    ].filter(Boolean);
    document.getElementById('coding-edu-breadcrumbs').innerHTML = crumbs.map((crumb, index) =>
      `<button class="coding-edu-crumb" data-level="${crumb.level}" type="button">${escapeHTML(crumb.label)}</button>${index < crumbs.length - 1 ? '<span>/</span>' : ''}`
    ).join('');
  }

  function handleBreadcrumbClick(event) {
    const crumb = event.target.closest('.coding-edu-crumb');
    if (!crumb) return;
    const level = crumb.dataset.level;
    if (level === 'home') route = { categoryId: null, subfolderId: null, lessonId: null };
    if (level === 'category') route = { categoryId: route.categoryId, subfolderId: null, lessonId: null };
    if (level === 'subfolder') route = { categoryId: route.categoryId, subfolderId: route.subfolderId, lessonId: null };
    render();
  }

  function goBack() {
    if (route.lessonId) route.lessonId = null;
    else if (route.subfolderId) route.subfolderId = null;
    else if (route.categoryId) route.categoryId = null;
    render();
  }

  function updateBackButton() {
    const button = document.getElementById('coding-edu-back');
    if (!button) return;
    button.hidden = !(route.categoryId || route.subfolderId || route.lessonId);
  }

  function resetRoute() {
    route = { categoryId: null, subfolderId: null, lessonId: null };
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
