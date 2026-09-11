(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('change-password-form');
    const currentInput = document.getElementById('currentPassword');
    const newInput = document.getElementById('newPassword');
    const confirmInput = document.getElementById('confirmPassword');
    const errorEl = document.getElementById('change-password-error');
    const successEl = document.getElementById('change-password-success');
    const submitBtn = document.getElementById('change-password-submit');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.textContent = '';
      successEl.textContent = '';
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
          errorEl.textContent = data.error || 'Something went wrong.';
          return;
        }

        successEl.textContent = 'Password updated. Other logged-in sessions have been signed out.';
        form.reset();
      } catch {
        errorEl.textContent = 'Network error. Please try again.';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update password';
      }
    });
  });
})();
