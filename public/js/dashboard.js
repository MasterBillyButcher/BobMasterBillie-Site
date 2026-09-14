(function () {
  const COUNTERS = [
    { section: 'predictions', elId: 'stat-predictions', suffix: ' active' },
    { section: 'backlog', elId: 'stat-backlog', suffix: ' items' },
    { section: 'commands', elId: 'stat-commands', suffix: ' set up' },
    { section: 'links', elId: 'stat-links', suffix: ' saved' },
  ];

  document.addEventListener('DOMContentLoaded', () => {
    COUNTERS.forEach(({ section, elId, suffix }) => {
      const el = document.getElementById(elId);
      if (!el) return;
      fetch(`/api/items?section=${encodeURIComponent(section)}`, { headers: csrfHeaders() })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => {
          const count = Array.isArray(data.items) ? data.items.length : 0;
          el.textContent = `${count}${suffix}`;
        })
        .catch(() => {
          el.textContent = '—';
        });
    });
  });
})();
