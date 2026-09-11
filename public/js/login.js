(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const passwordInput = document.getElementById('password');
    const errorEl = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit');

    const params = new URLSearchParams(window.location.search);
    const next = params.get('next') || '/';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.textContent = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in…';

      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: csrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ password: passwordInput.value }),
        });
        const data = await res.json();

        if (!res.ok) {
          errorEl.textContent = data.error || 'Login failed.';
          return;
        }

        window.location.href = next;
      } catch {
        errorEl.textContent = 'Network error. Please try again.';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign in';
      }
    });
  });
})();
