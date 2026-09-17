/**
 * Pinned sections — stored server-side in Supabase (dashboard_prefs),
 * not in the browser, so they follow you across devices/browsers
 * instead of being stuck on one machine.
 *
 * Since this needs a network round trip, the API is deliberately
 * async-first: load() fetches once and caches in memory for the rest
 * of the page's life; isPinned()/toggle() work off that cache. nav.js
 * renders once immediately (so the sidebar never blocks on network),
 * then re-renders after load() resolves if pins turned out to exist.
 */
window.Pins = (function () {
  let cache = [];
  let loaded = false;

  async function load() {
    try {
      const res = await fetch('/api/prefs', { headers: csrfHeaders() });
      if (!res.ok) return [];
      const data = await res.json();
      cache = Array.isArray(data.prefs && data.prefs.pinned_sections)
        ? data.prefs.pinned_sections
        : [];
    } catch {
      cache = [];
    }
    loaded = true;
    return cache.slice();
  }

  function read() {
    return cache.slice();
  }

  function isPinned(section) {
    return cache.includes(section);
  }

  async function toggle(section) {
    const next = cache.includes(section)
      ? cache.filter((s) => s !== section)
      : [...cache, section];

    // Optimistic update — reflect immediately, reconcile with the
    // server's response (or roll back on failure).
    const previous = cache;
    cache = next;

    try {
      const res = await fetch('/api/prefs', {
        method: 'PUT',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ pinned_sections: next }),
      });
      if (!res.ok) throw new Error('save failed');
      const data = await res.json();
      cache = (data.prefs && data.prefs.pinned_sections) || next;
    } catch {
      cache = previous; // roll back
    }
    return cache.includes(section);
  }

  return { load, read, isPinned, toggle, get isLoaded() { return loaded; } };
})();
