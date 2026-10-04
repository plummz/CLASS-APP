(function () {
  window.classAppFeatures = window.classAppFeatures || {};

  let socialEmbedTimer = null;

  // Pages whose owners block the Facebook embed (it loads blank): show an "Open on Facebook" card instead
  const NO_EMBED = ['facebook.com/wititdepartment'];

  function buildFacebookEmbedUrl(url, width, height) {
    const encoded = encodeURIComponent(decodeURI(url));
    return `https://www.facebook.com/plugins/page.php?href=${encoded}&tabs=timeline&width=${width || 500}&height=${height || 720}&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=false`;
  }

  function openPage(title, url) {
    const pageUrl = url || title;
    const pageTitle = url ? title : 'Social Media Page';
    const home = document.getElementById('social-home-view');
    const embed = document.getElementById('social-embed-view');
    const frame = document.getElementById('social-embed-frame');
    const titleEl = document.getElementById('social-embed-title');
    const status = document.getElementById('social-embed-status');
    const statusText = document.getElementById('social-embed-status-text');
    const externalLink = document.getElementById('social-open-external');
    if (!home || !embed || !frame) return;

    if (socialEmbedTimer) clearTimeout(socialEmbedTimer);

    if (titleEl) {
      const decoder = document.createElement('textarea');
      decoder.innerHTML = pageTitle;
      titleEl.textContent = decoder.value;
    }
    if (externalLink) externalLink.href = pageUrl;
    const blocked = document.getElementById('social-embed-blocked');
    const blockedLink = document.getElementById('social-blocked-link');
    home.classList.add('hidden');
    embed.classList.remove('hidden');
    embed.scrollIntoView({ block: 'start', behavior: 'smooth' });

    if (NO_EMBED.some((u) => pageUrl.includes(u))) {
      frame.src = 'about:blank';
      frame.classList.add('hidden');
      if (status) status.classList.add('hidden');
      if (blockedLink) blockedLink.href = pageUrl;
      if (blocked) blocked.classList.remove('hidden');
      return;
    }
    if (blocked) blocked.classList.add('hidden');
    frame.classList.remove('hidden');
    if (status) {
      status.classList.remove('is-warning');
      status.classList.remove('hidden');
    }
    if (statusText) statusText.textContent = 'Loading the Facebook page…';
    frame.onload = () => {
      if (statusText) statusText.textContent = 'Not loading? Facebook may be blocking it here.';
    };
    // Size the Facebook plugin to the space we really have (it can't be wider than 500 px)
    const width = Math.max(180, Math.min(500, Math.floor(frame.clientWidth || embed.clientWidth || 360)));
    const height = Math.max(480, Math.min(900, Math.floor(window.innerHeight - 200)));
    frame.style.height = height + 'px';
    frame.src = buildFacebookEmbedUrl(pageUrl, width, height);

    socialEmbedTimer = setTimeout(() => {
      if (!document.getElementById('social-embed-view')?.classList.contains('hidden')) {
        if (status) status.classList.add('is-warning');
        if (statusText) {
          statusText.textContent = 'Taking long? Facebook may be blocking it (privacy settings or tracking protection).';
        }
      }
    }, 8000);
  }

  function closePage() {
    const home = document.getElementById('social-home-view');
    const embed = document.getElementById('social-embed-view');
    const frame = document.getElementById('social-embed-frame');
    const status = document.getElementById('social-embed-status');
    if (socialEmbedTimer) clearTimeout(socialEmbedTimer);
    if (frame) frame.src = 'about:blank';
    if (status) status.classList.add('hidden');
    if (embed) embed.classList.add('hidden');
    if (home) home.classList.remove('hidden');
  }

  const feature = {
    name: 'social',
    buildFacebookEmbedUrl,
    openPage,
    closePage,
  };

  window.classAppFeatures.social = feature;
  window.openSocialPage = openPage;
  window.closeSocialPage = closePage;
})();
