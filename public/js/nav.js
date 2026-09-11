(function () {
  const NAV_ITEMS = [
    { href: '/', label: 'Dashboard' },
    { href: '/twitch.html', label: 'Twitch' },
    { href: '/nightbot.html', label: 'Nightbot' },
    { href: '/commands.html', label: 'Custom Commands' },
    { href: '/predictions.html', label: 'Predictions' },
    { href: '/channels.html', label: 'Channels' },
    { href: '/notes.html', label: 'Stream Notes' },
    { href: '/backlog.html', label: 'Backlog' },
    { href: '/veto.html', label: 'Veto Power' },
    { href: '/links.html', label: 'Quick Links' },
    { href: '/cv.html', label: 'CV' },
    { href: '/settings.html', label: 'Settings' },
  ];

  function renderSidebar() {
    const mount = document.getElementById('sidebar');
    if (!mount) return;

    const currentPath = window.location.pathname;
    const links = NAV_ITEMS.map((item) => {
      const isActive =
        currentPath === item.href || (item.href === '/' && currentPath === '/dashboard.html');
      return `<a href="${item.href}"${isActive ? ' class="active"' : ''}>${item.label}</a>`;
    }).join('');

    mount.innerHTML = `
      <div class="brand">BobMasterBillie</div>
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
