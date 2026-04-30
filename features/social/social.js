(function () {
  window.classAppFeatures = window.classAppFeatures || {};

  let socialEmbedTimer = null;

  function buildFacebookEmbedUrl(url) {
    const encoded = encodeURIComponent(url);
    return `https://www.facebook.com/plugins/page.php?href=${encoded}&tabs=timeline&width=500&height=720&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=false`;
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
    if (status) {
      status.classList.remove('is-warning');
      status.classList.remove('hidden');
    }
    if (statusText) statusText.textContent = 'Loading Facebook embed inside the app...';
    frame.onload = () => {
      if (statusText) statusText.textContent = 'If the page keeps loading, Facebook may be blocking the embedded view. Use the browser link below.';
    };
    frame.src = buildFacebookEmbedUrl(pageUrl);
    home.classList.add('hidden');
    embed.classList.remove('hidden');
    embed.scrollIntoView({ block: 'start', behavior: 'smooth' });

    socialEmbedTimer = setTimeout(() => {
      if (!document.getElementById('social-embed-view')?.classList.contains('hidden')) {
        if (status) status.classList.add('is-warning');
        if (statusText) {
          statusText.textContent = 'Facebook did not finish loading here. This is usually Facebook blocking the embedded view, privacy cookies, or a page restriction.';
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
