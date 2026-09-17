/**
 * Global keyboard shortcuts + quick-jump command palette.
 *
 * - Cmd/Ctrl+K  → open the palette (fuzzy jump to any section)
 * - g then 1-9  → jump straight to a section by position
 * - ?           → show the shortcuts cheatsheet
 * - Esc         → close whatever overlay is open
 *
 * Shortcuts are ignored while typing in a field, so they never fight
 * with the editor. Ctrl/Cmd+S is handled inside doc.js instead, since
 * it's specific to the page being edited.
 */
(function () {
  const SECTIONS = [
    { href: '/', label: 'Dashboard', key: 'dashboard' },
    { href: '/twitch.html', label: 'Twitch', key: 'twitch' },
    { href: '/nightbot.html', label: 'Nightbot', key: 'nightbot' },
    { href: '/commands.html', label: 'Custom Commands', key: 'commands' },
    { href: '/predictions.html', label: 'Predictions', key: 'predictions' },
    { href: '/channels.html', label: 'Channels', key: 'channels' },
    { href: '/notes.html', label: 'Stream Notes', key: 'notes' },
    { href: '/backlog.html', label: 'Backlog', key: 'backlog' },
    { href: '/veto.html', label: 'Veto Power', key: 'veto' },
    { href: '/links.html', label: 'Quick Links', key: 'links' },
    { href: '/cv.html', label: 'CV', key: 'cv' },
    { href: '/settings.html', label: 'Settings', key: 'settings' },
  ];

  const SHORTCUT_HELP = [
    ['Cmd/Ctrl + K', 'Quick jump to any section'],
    ['g then 1–9', 'Jump to section by number'],
    ['Cmd/Ctrl + S', 'Save (while editing)'],
    ['e', 'Toggle edit mode'],
    ['/', 'Focus search (on Dashboard)'],
    ['?', 'Show this cheatsheet'],
    ['Esc', 'Close overlay / exit edit'],
  ];

  let overlay = null;
  let gPressedAt = 0;

  function isTypingTarget(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  function closeOverlay() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  function buildOverlay(innerNode, labelledBy) {
    closeOverlay();
    overlay = document.createElement('div');
    overlay.className = 'overlay-backdrop';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    if (labelledBy) overlay.setAttribute('aria-label', labelledBy);
    overlay.appendChild(innerNode);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeOverlay();
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  // ---- Quick jump palette ------------------------------------------

  function openPalette() {
    const panel = document.createElement('div');
    panel.className = 'palette';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'palette-input';
    input.placeholder = 'Jump to…';
    input.setAttribute('aria-label', 'Jump to section');

    const list = document.createElement('div');
    list.className = 'palette-list';

    panel.append(input, list);
    buildOverlay(panel, 'Quick jump');

    let filtered = SECTIONS.slice();
    let activeIdx = 0;

    function renderList() {
      const icons = window.SECTION_ICONS || {};
      list.innerHTML = filtered
        .map(
          (s, i) => `
          <div class="palette-item${i === activeIdx ? ' active' : ''}" data-href="${s.href}">
            <span class="nav-icon-badge section-${s.key}">${icons[s.key] || ''}</span>
            <span>${s.label}</span>
          </div>`
        )
        .join('');

      list.querySelectorAll('.palette-item').forEach((el) => {
        el.addEventListener('click', () => {
          window.location.href = el.dataset.href;
        });
      });
    }

    function applyFilter(q) {
      const query = q.trim().toLowerCase();
      filtered = query
        ? SECTIONS.filter((s) => s.label.toLowerCase().includes(query))
        : SECTIONS.slice();
      activeIdx = 0;
      renderList();
    }

    input.addEventListener('input', () => applyFilter(input.value));

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIdx = Math.min(activeIdx + 1, filtered.length - 1);
        renderList();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIdx = Math.max(activeIdx - 1, 0);
        renderList();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[activeIdx]) window.location.href = filtered[activeIdx].href;
      } else if (e.key === 'Escape') {
        closeOverlay();
      }
    });

    renderList();
    input.focus();
  }

  // ---- Shortcut cheatsheet -----------------------------------------

  function openCheatsheet() {
    const panel = document.createElement('div');
    panel.className = 'cheatsheet';
    panel.innerHTML = `
      <div class="cheatsheet-title">Keyboard shortcuts</div>
      <div class="cheatsheet-list">
        ${SHORTCUT_HELP.map(
          ([keys, desc]) => `
          <div class="cheatsheet-row">
            <kbd class="cheatsheet-key">${keys}</kbd>
            <span class="cheatsheet-desc">${desc}</span>
          </div>`
        ).join('')}
      </div>
      <button class="secondary cheatsheet-close" type="button">Close</button>
    `;
    buildOverlay(panel, 'Keyboard shortcuts');
    panel.querySelector('.cheatsheet-close').addEventListener('click', closeOverlay);
    panel.querySelector('.cheatsheet-close').focus();
  }

  // ---- Global key handling -----------------------------------------

  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl+K works even from a field, since it's an explicit combo.
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openPalette();
      return;
    }

    if (e.key === 'Escape') {
      closeOverlay();
      return;
    }

    if (isTypingTarget(e.target)) return;

    if (e.key === '?') {
      e.preventDefault();
      openCheatsheet();
      return;
    }

    if (e.key === '/') {
      const search = document.getElementById('overview-search');
      if (search) {
        e.preventDefault();
        search.focus();
      }
      return;
    }

    if (e.key.toLowerCase() === 'g') {
      gPressedAt = Date.now();
      return;
    }

    // "g" followed by a digit within 1.2s jumps by position.
    if (/^[1-9]$/.test(e.key) && Date.now() - gPressedAt < 1200) {
      const target = SECTIONS[Number(e.key) - 1];
      if (target) {
        e.preventDefault();
        window.location.href = target.href;
      }
      gPressedAt = 0;
      return;
    }

    if (e.key.toLowerCase() === 'e') {
      const editBtn = document.querySelector('.doc-edit-btn');
      if (editBtn) {
        e.preventDefault();
        editBtn.click();
      }
    }
  });
})();
