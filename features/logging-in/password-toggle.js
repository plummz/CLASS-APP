/* Sign-in form: an eye button inside the password field that shows or hides what you typed.
 * It appears once there is something typed, and the field goes back to hidden when emptied. */
(function () {
  function setup() {
    const input = document.getElementById('password');
    const btn = document.getElementById('password-toggle');
    if (!input || !btn || btn.dataset.ready) return;
    btn.dataset.ready = '1';

    const setShown = (shown) => {
      input.type = shown ? 'text' : 'password';
      btn.classList.toggle('shown', shown);
      btn.setAttribute('aria-pressed', String(shown));
      btn.setAttribute('aria-label', shown ? 'Hide password' : 'Show password');
    };
    const sync = () => {
      const hasText = input.value.length > 0;
      btn.hidden = !hasText;
      if (!hasText) setShown(false);
    };

    // Keep the keyboard open on phones: don't let the tap take focus from the field
    btn.addEventListener('pointerdown', (e) => e.preventDefault());
    btn.addEventListener('click', () => {
      setShown(input.type === 'password');
      input.focus({ preventScroll: true });
      const end = input.value.length;
      try { input.setSelectionRange(end, end); } catch (_) {}
    });
    input.addEventListener('input', sync);
    // Autofill and the app clearing the field after sign-in don't fire 'input'
    input.addEventListener('change', sync);
    new MutationObserver(sync).observe(document.getElementById('auth-modal') || document.body, { attributes: true, attributeFilter: ['style'] });
    sync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
