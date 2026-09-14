(function () {
  const LABELS = {
    twitch: 'Twitch',
    nightbot: 'Nightbot',
    commands: 'Custom Commands',
    predictions: 'Predictions',
    channels: 'Channels',
    notes: 'Stream Notes',
    backlog: 'Backlog',
    veto: 'Veto Power',
    links: 'Quick Links',
    cv: 'CV',
  };

  function formatTime(iso) {
    if (!iso) return 'Not started';
    const d = new Date(iso);
    return 'Edited ' + d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('overview-grid');
    if (!grid) return;

    fetch('/api/docs', { headers: csrfHeaders() })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const docs = data.docs || [];
        grid.innerHTML = docs
          .map((doc) => {
            const label = LABELS[doc.section] || doc.section;
            return `
              <a class="stat-card" href="/${doc.section}.html">
                <div class="stat-label">${label}</div>
                <div class="stat-status"><span class="dot"></span> ${formatTime(doc.updated_at)}</div>
              </a>
            `;
          })
          .join('');
      })
      .catch(() => {
        grid.innerHTML = '<p class="text-dim">Couldn\'t load overview.</p>';
      });
  });
})();
