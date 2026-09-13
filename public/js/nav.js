(function () {
  // Minimal 1.5px stroke line icons, 20x20, inherit color via currentColor.
  const ICONS = {
    dashboard: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 10.5 10 4l7 6.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 9v7h10V9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    twitch: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 3h11v9l-3.5 3.5H10l-2 2v-2H5V3Z" stroke-linejoin="round"/><path d="M10.5 6.5v3M14 6.5v3" stroke-linecap="round"/></svg>',
    nightbot: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="7" width="12" height="9" rx="2"/><path d="M10 7V4" stroke-linecap="round"/><circle cx="10" cy="3.2" r="0.9" fill="currentColor" stroke="none"/><path d="M7.3 11.2h.01M12.7 11.2h.01" stroke-linecap="round" stroke-width="2"/><path d="M2 10v3M18 10v3" stroke-linecap="round"/></svg>',
    commands: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="14" height="12" rx="2"/><path d="M6.5 8l2 2-2 2M10.5 12h3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    predictions: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 16.5V3M3 16.5h14" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 13v-3M9.5 13V6.5M13 13V9M16.5 13v-6" stroke-linecap="round"/></svg>',
    channels: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="1.6" fill="currentColor" stroke="none"/><path d="M6.5 6.5a5 5 0 0 0 0 7M13.5 6.5a5 5 0 0 1 0 7M4 4a8.5 8.5 0 0 0 0 12M16 4a8.5 8.5 0 0 1 0 12" stroke-linecap="round"/></svg>',
    notes: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 3h7l3 3v11H5V3Z" stroke-linejoin="round"/><path d="M12 3v3h3M7.5 10h5M7.5 13h5" stroke-linecap="round"/></svg>',
    backlog: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 6h12M4 10h12M4 14h8" stroke-linecap="round"/></svg>',
    veto: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 3.2 16 5.5v4.2c0 4-2.6 6.6-6 7.3-3.4-.7-6-3.3-6-7.3V5.5L10 3.2Z" stroke-linejoin="round"/><path d="M7.7 10 9.3 11.6 12.5 8.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    links: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8.5 11.5 11.5 8.5" stroke-linecap="round"/><path d="M9 6.2l1-1a3 3 0 0 1 4.3 4.2l-1 1M11 13.8l-1 1a3 3 0 0 1-4.3-4.2l1-1" stroke-linecap="round"/></svg>',
    cv: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="3" width="12" height="14" rx="1.5"/><circle cx="10" cy="8" r="1.8"/><path d="M6.5 14c.5-2 2-3 3.5-3s3 1 3.5 3" stroke-linecap="round"/></svg>',
    settings: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="2.4"/><path d="M10 3.5v1.6M10 14.9v1.6M16.5 10h-1.6M5.1 10H3.5M14.6 5.4l-1.1 1.1M6.5 13.5l-1.1 1.1M14.6 14.6l-1.1-1.1M6.5 6.5 5.4 5.4" stroke-linecap="round"/></svg>',
  };

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

  function renderSidebar() {
    const mount = document.getElementById('sidebar');
    if (!mount) return;

    const currentPath = window.location.pathname;
    const links = NAV_ITEMS.map((item) => {
      const isActive =
        currentPath === item.href || (item.href === '/' && currentPath === '/dashboard.html');
      return `<a href="${item.href}"${isActive ? ' class="active"' : ''}>${ICONS[item.icon]}<span>${item.label}</span></a>`;
    }).join('');

    mount.innerHTML = `
      <div class="brand">BOBMASTERBILLIE</div>
      <div class="status-pill">
        <span class="dot"></span>
        <span class="label">Session active</span>
      </div>
      <nav>${links}</nav>
      <div class="sidebar-footer">
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
  }

  document.addEventListener('DOMContentLoaded', renderSidebar);
})();
