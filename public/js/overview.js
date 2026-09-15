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
  const SECTION_ORDER = Object.keys(LABELS);

  let allDocs = []; // [{ section, content, updated_at }]

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

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

  function renderGrid() {
    const grid = document.getElementById('overview-grid');
    if (!grid) return;
    grid.innerHTML = SECTION_ORDER.map((section) => {
      const doc = allDocs.find((d) => d.section === section);
      return `
        <a class="stat-card" href="/${section}.html">
          <div class="stat-label">${LABELS[section]}</div>
          <div class="stat-status"><span class="dot"></span> ${formatTime(doc ? doc.updated_at : null)}</div>
        </a>
      `;
    }).join('');
  }

  function buildSnippet(content, query) {
    const idx = content.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escapeHtml(content.slice(0, 120));
    const start = Math.max(0, idx - 40);
    const end = Math.min(content.length, idx + query.length + 60);
    const before = escapeHtml(content.slice(start, idx));
    const match = escapeHtml(content.slice(idx, idx + query.length));
    const after = escapeHtml(content.slice(idx + query.length, end));
    return `${start > 0 ? '…' : ''}${before}<mark>${match}</mark>${after}${end < content.length ? '…' : ''}`;
  }

  function renderSearch(query) {
    const resultsEl = document.getElementById('search-results');
    const grid = document.getElementById('overview-grid');
    if (!resultsEl || !grid) return;

    if (!query) {
      resultsEl.innerHTML = '';
      resultsEl.classList.remove('search-results');
      grid.classList.remove('hidden');
      return;
    }

    const matches = allDocs.filter(
      (d) =>
        (d.content || '').toLowerCase().includes(query.toLowerCase()) ||
        (LABELS[d.section] || d.section).toLowerCase().includes(query.toLowerCase())
    );

    grid.classList.add('hidden');
    resultsEl.classList.add('search-results');

    if (matches.length === 0) {
      resultsEl.innerHTML = '<p class="text-dim">No matches.</p>';
      return;
    }

    resultsEl.innerHTML = matches
      .map(
        (d) => `
        <a class="search-result-card" href="/${d.section}.html">
          <div class="search-result-title">${escapeHtml(LABELS[d.section] || d.section)}</div>
          <div class="search-result-snippet">${buildSnippet(d.content || '', query)}</div>
        </a>
      `
      )
      .join('');
  }

  function exportAll() {
    const stamp = new Date().toISOString().slice(0, 10);
    const parts = SECTION_ORDER.map((section) => {
      const doc = allDocs.find((d) => d.section === section);
      const content = (doc && doc.content) || '(empty)';
      return `${'='.repeat(60)}\n${LABELS[section].toUpperCase()}\n${'='.repeat(60)}\n\n${content}\n`;
    });
    const blob = new Blob([parts.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bobmasterbillie-export-${stamp}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('overview-grid');
    if (!grid) return;

    fetch('/api/docs?full=1', { headers: csrfHeaders() })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        allDocs = data.docs || [];
        renderGrid();
      })
      .catch(() => {
        grid.innerHTML = '<p class="text-dim">Couldn\'t load overview.</p>';
      });

    const searchInput = document.getElementById('overview-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        renderSearch(searchInput.value.trim());
      });
    }

    const exportBtn = document.getElementById('export-all-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportAll);
    }
  });
})();
