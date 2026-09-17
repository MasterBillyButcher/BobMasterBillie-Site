(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const passwordInput = document.getElementById('password');
    const errorEl = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit');

    const params = new URLSearchParams(window.location.search);
    const next = params.get('next') || '/';

    function showError(message) {
      errorEl.textContent = message;
      errorEl.classList.toggle('hidden', !message);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showError('');
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
          showError(data.error || 'Login failed.');
          return;
        }

        window.location.href = next;
      } catch {
        showError('Network error. Please try again.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign in';
      }
    });
  });
})();
