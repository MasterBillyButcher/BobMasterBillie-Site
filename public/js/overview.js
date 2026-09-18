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

  function relativeTime(iso) {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function summaryOf(content) {
    if (!content || !content.trim()) return null;
    const firstLine = content
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0);
    if (!firstLine) return null;
    const clean = firstLine.length > 70 ? firstLine.slice(0, 70) + '…' : firstLine;
    const wordCount = countWords(content);
    return { clean, wordCount };
  }

  function countWords(text) {
    const trimmed = (text || '').trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }

  // ---- Hero / clock -------------------------------------------------

  function startClock() {
    const timeEl = document.getElementById('dash-clock-time');
    const dateEl = document.getElementById('dash-clock-date');
    if (!timeEl || !dateEl) return;

    function tick() {
      const now = new Date();
      timeEl.textContent = now.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });
      dateEl.textContent = now.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
    tick();
    setInterval(tick, 15000);
  }

  // ---- Stats ----------------------------------------------------------

  function renderStats() {
    const el = document.getElementById('dash-stats');
    const subtitleEl = document.getElementById('dash-subtitle');
    if (!el) return;

    const filled = allDocs.filter((d) => d.content && d.content.trim()).length;
    const totalWords = allDocs.reduce((sum, d) => sum + countWords(d.content), 0);
    const mostRecent = allDocs
      .filter((d) => d.updated_at)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];

    const stats = [
      { value: `${filled}/${SECTION_ORDER.length}`, label: 'Sections filled' },
      { value: totalWords.toLocaleString(), label: 'Total words' },
      { value: mostRecent ? relativeTime(mostRecent.updated_at) : '—', label: 'Last edit' },
      { value: `${SECTION_ORDER.length - filled}`, label: 'Still empty' },
    ];

    el.innerHTML = stats
      .map(
        (s) => `
        <div class="dash-stat-card">
          <div class="dash-stat-value">${escapeHtml(s.value)}</div>
          <div class="dash-stat-label">${escapeHtml(s.label)}</div>
        </div>`
      )
      .join('');

    if (subtitleEl) {
      subtitleEl.textContent =
        filled === 0
          ? "Nothing filled in yet — pick a section from the sidebar to get started."
          : filled === SECTION_ORDER.length
          ? 'Every section has something in it. Nice.'
          : `${filled} of ${SECTION_ORDER.length} sections have content — ${SECTION_ORDER.length - filled} still empty.`;
    }
  }

  // ---- Pinned quick row ----------------------------------------------

  function renderPinnedRow() {
    const el = document.getElementById('dash-pinned-row');
    if (!el || !window.Pins) return;
    const icons = window.SECTION_ICONS || {};
    const pinned = window.Pins.read();

    el.innerHTML = pinned
      .map(
        (section) => `
        <a class="dash-pin-chip section-${section}" href="/${section}.html">
          <span class="nav-icon-badge section-${section}">${icons[section] || ''}</span>
          ${escapeHtml(LABELS[section] || section)}
        </a>`
      )
      .join('');
  }

  // ---- Recent activity -------------------------------------------------

  function renderActivity() {
    const el = document.getElementById('recent-activity');
    if (!el) return;

    const recent = allDocs
      .filter((d) => d.updated_at)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 6);

    if (recent.length === 0) {
      el.innerHTML = '<p class="activity-empty">Nothing edited yet.</p>';
      return;
    }

    el.innerHTML = recent
      .map(
        (d) => `
        <a class="activity-item section-${d.section}" href="/${d.section}.html">
          <span class="activity-dot"></span>
          <span class="activity-body">
            <div class="activity-label">${escapeHtml(LABELS[d.section] || d.section)}</div>
            <div class="activity-time">${relativeTime(d.updated_at)}</div>
          </span>
        </a>`
      )
      .join('');
  }

  // ---- Section grid ----------------------------------------------------

  function renderGrid() {
    const grid = document.getElementById('overview-grid');
    if (!grid) return;
    const icons = window.SECTION_ICONS || {};
    grid.innerHTML = SECTION_ORDER.map((section) => {
      const doc = allDocs.find((d) => d.section === section);
      const summary = doc ? summaryOf(doc.content) : null;
      return `
        <a class="stat-card section-${section}" href="/${section}.html">
          <div class="stat-label">
            <span class="nav-icon-badge section-${section}">${icons[section] || ''}</span>
            ${LABELS[section]}
          </div>
          <div class="stat-status"><span class="dot"></span> ${formatTime(doc ? doc.updated_at : null)}</div>
          ${summary ? `<div class="stat-preview">${escapeHtml(summary.clean)}<span class="stat-preview-count">${summary.wordCount} word${summary.wordCount === 1 ? '' : 's'}</span></div>` : ''}
        </a>
      `;
    }).join('');
  }

  // ---- Search ------------------------------------------------------------

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

  // ---- Export / print ------------------------------------------------

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

  // ---- Init --------------------------------------------------------------

  function renderAll() {
    renderStats();
    renderGrid();
    renderActivity();
    renderPinnedRow();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('overview-grid');
    if (!grid) return; // not the dashboard page

    startClock();

    fetch('/api/docs?full=1', { headers: csrfHeaders() })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        allDocs = data.docs || [];
        renderAll();
      })
      .catch(() => {
        grid.innerHTML = '<p class="text-dim">Couldn\'t load overview.</p>';
      });

    if (window.Pins) {
      window.Pins.load().then(renderPinnedRow);
    }

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

    const printBtn = document.getElementById('print-all-btn');
    if (printBtn) {
      printBtn.addEventListener('click', () => window.print());
    }
  });
})();
