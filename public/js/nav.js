(function () {
  const ICONS = window.SECTION_ICONS || {};

  const NAV_ITEMS = [
    { href: '/', label: 'Dashboard', icon: 'dashboard' },
    { href: '/twitch.html', label: 'Twitch', icon: 'twitch' },
    { href: '/nightbot.html', label: 'Nightbot', icon: 'nightbot' },
    { href: '/commands.html', label: 'Custom Commands', icon: 'commands' },
    { href: '/predictions.html', label: 'Predictions', icon: 'predictions' },
    { href: '/channels.html', label: 'Channels', icon: 'channels' },
    { href: '/notes.html', label: 'Stream Notes', icon: 'notes' },
    { href: '/backlog.html', label: 'Backlog', icon: 'backlog' },
    { href: '/veto.html', label: 'Veto Power', icon: 'veto' },
    { href: '/links.html', label: 'Quick Links', icon: 'links' },
    { href: '/cv.html', label: 'CV', icon: 'cv' },
    { href: '/settings.html', label: 'Settings', icon: 'settings' },
  ];

  const PIN_ICON =
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12.5 3.5 16.5 7.5M11 5l4 4-1.5 1.5-1-.4-3.6 3.6.4 1L8 16 4 12l1.3-1.3 1 .4 3.6-3.6-.4-1L11 5Z" stroke-linejoin="round"/><path d="M6.5 13.5 3.5 16.5" stroke-linecap="round"/></svg>';

  function isActiveHref(href, currentPath) {
    return currentPath === href || (href === '/' && currentPath === '/dashboard.html');
  }

  function orderedItems() {
    const pinned = window.Pins ? window.Pins.read() : [];
    if (pinned.length === 0) return { pinnedItems: [], restItems: NAV_ITEMS };

    const pinnedItems = [];
    const restItems = [];
    NAV_ITEMS.forEach((item) => {
      if (pinned.includes(item.icon)) pinnedItems.push(item);
      else restItems.push(item);
    });
    return { pinnedItems, restItems };
  }

  function linkHtml(item, currentPath) {
    const active = isActiveHref(item.href, currentPath) ? ' class="active"' : '';
    return `<a href="${item.href}"${active}><span class="nav-icon-badge section-${item.icon}">${ICONS[item.icon] || ''}</span><span class="nav-label">${item.label}</span></a>`;
  }

  function renderSidebar() {
    const mount = document.getElementById('sidebar');
    if (!mount) return;

    const currentPath = window.location.pathname;
    const { pinnedItems, restItems } = orderedItems();

    const pinnedBlock = pinnedItems.length
      ? `<div class="nav-group-label">Pinned</div>${pinnedItems
          .map((i) => linkHtml(i, currentPath))
          .join('')}<div class="nav-divider"></div>`
      : '';

    mount.innerHTML = `
      <div class="sidebar-head">
        <div class="brand">BOBMASTERBILLIE</div>
        <button class="sidebar-close" id="sidebar-close" type="button" aria-label="Close menu">&times;</button>
      </div>
      <div class="status-pill">
        <span class="dot"></span>
        <span class="label">Session active</span>
      </div>
      <nav>${pinnedBlock}${restItems.map((i) => linkHtml(i, currentPath)).join('')}</nav>
      <div class="sidebar-footer">
        <button class="secondary sidebar-help-btn" id="sidebar-help" type="button">Shortcuts <kbd>?</kbd></button>
        <button class="secondary" id="logout-btn">Log out</button>
      </div>
    `;

    document.getElementById('logout-btn').addEventListener('click', async () => {
      const btn = document.getElementById('logout-btn');
      btn.disabled = true;
      btn.textContent = 'Logging out…';
      try {
        await fetch('/api/logout', { method: 'POST', headers: csrfHeaders() });
      } finally {
        window.location.href = '/login.html';
      }
    });

    document.getElementById('sidebar-help').addEventListener('click', () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
    });

    const closeBtn = document.getElementById('sidebar-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.body.classList.remove('sidebar-open');
      });
    }
  }

  let currentPinBtn = null;
  let currentPinSection = null;

  function syncCurrentPinButton() {
    if (!currentPinBtn || !currentPinSection || !window.Pins) return;
    const pinned = window.Pins.isPinned(currentPinSection);
    currentPinBtn.classList.toggle('pinned', pinned);
    currentPinBtn.title = pinned ? 'Unpin from top of sidebar' : 'Pin to top of sidebar';
    currentPinBtn.setAttribute('aria-pressed', String(pinned));
  }

  function renderPageHeaderIcon() {
    const h1 = document.querySelector('h1[data-section]');
    if (!h1) return;
    const section = h1.dataset.section;
    const icon = ICONS[section];
    if (icon) {
      const badge = document.createElement('span');
      badge.className = `nav-icon-badge page-header-icon section-${section}`;
      badge.innerHTML = icon;
      h1.prepend(badge);
    }

    // Pin toggle — not meaningful for the Dashboard itself.
    if (section !== 'dashboard' && window.Pins) {
      const pinBtn = document.createElement('button');
      pinBtn.type = 'button';
      pinBtn.className = 'page-pin-btn';
      pinBtn.innerHTML = PIN_ICON;

      pinBtn.addEventListener('click', async () => {
        await window.Pins.toggle(section);
        syncCurrentPinButton();
        renderSidebar();
      });

      currentPinBtn = pinBtn;
      currentPinSection = section;
      syncCurrentPinButton();
      h1.appendChild(pinBtn);
    }
  }

  function wireMobileMenu() {
    const toggle = document.getElementById('menu-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-open');
      });
    }
    const scrim = document.getElementById('sidebar-scrim');
    if (scrim) {
      scrim.addEventListener('click', () => {
        document.body.classList.remove('sidebar-open');
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Paint immediately with whatever's known (no pins yet) so the
    // sidebar never blocks on a network round trip.
    renderSidebar();
    renderPageHeaderIcon();
    wireMobileMenu();

    if (window.Pins) {
      window.Pins.load().then(() => {
        renderSidebar();
        syncCurrentPinButton();
      });
    }
  });
})();
