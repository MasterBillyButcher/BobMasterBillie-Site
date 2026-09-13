(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('logout-btn-settings');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Logging out…';
      try {
        await fetch('/api/logout', { method: 'POST', headers: csrfHeaders() });
      } finally {
        window.location.href = '/login.html';
      }
    });
  });
})();
