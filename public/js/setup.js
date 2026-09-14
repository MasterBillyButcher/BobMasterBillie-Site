(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('setup-form');
    const secretInput = document.getElementById('setupSecret');
    const newInput = document.getElementById('newPassword');
    const confirmInput = document.getElementById('confirmPassword');
    const errorEl = document.getElementById('setup-error');
    const successEl = document.getElementById('setup-success');
    const submitBtn = document.getElementById('setup-submit');

    function showError(message) {
      errorEl.textContent = message;
      errorEl.classList.toggle('hidden', !message);
    }
    function showSuccess(message) {
      successEl.textContent = message;
      successEl.classList.toggle('hidden', !message);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showError('');
      showSuccess('');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Setting…';

      try {
        const res = await fetch('/api/setup', {
          method: 'POST',
          headers: csrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            setupSecret: secretInput.value,
            newPassword: newInput.value,
            confirmPassword: confirmInput.value,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          showError(data.error || 'Something went wrong.');
          return;
        }

        showSuccess('Password set. You can log in now.');
        form.reset();
      } catch {
        showError('Network error. Please try again.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Set password';
      }
    });
  });
})();
