(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('change-password-form');
    const currentInput = document.getElementById('currentPassword');
    const newInput = document.getElementById('newPassword');
    const confirmInput = document.getElementById('confirmPassword');
    const errorEl = document.getElementById('change-password-error');
    const successEl = document.getElementById('change-password-success');
    const submitBtn = document.getElementById('change-password-submit');

    function showError(message) {
      errorEl.textContent = message;
      errorEl.classList.toggle('hidden', !message);
    }
    function showSuccess(message) {
      successEl.textContent = message;
      successEl.classList.toggle('hidden', !message);
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        showError('');
        showSuccess('');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating…';

        try {
          const res = await fetch('/api/change-password', {
            method: 'POST',
            headers: csrfHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
              currentPassword: currentInput.value,
              newPassword: newInput.value,
              confirmPassword: confirmInput.value,
            }),
          });
          const data = await res.json();

          if (!res.ok) {
            showError(data.error || 'Something went wrong.');
            return;
          }

          showSuccess('Password updated. Other logged-in sessions have been signed out.');
          form.reset();
        } catch {
          showError('Network error. Please try again.');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Update password';
        }
      });
    }

    const logoutBtn = document.getElementById('logout-btn-settings');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        logoutBtn.disabled = true;
        logoutBtn.textContent = 'Logging out…';
        try {
          await fetch('/api/logout', { method: 'POST', headers: csrfHeaders() });
        } finally {
          window.location.href = '/login.html';
        }
      });
    }
  });
})();
