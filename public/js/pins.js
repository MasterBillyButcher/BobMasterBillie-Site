/**
 * Pinned sections. Stored in localStorage (per-browser, no server round
 * trip needed — pinning is a viewing preference, not content). The
 * sidebar reads this to float pinned sections to the top, and each page
 * gets a pin toggle in its header.
 */
window.Pins = (function () {
  const KEY = 'bmb_pinned_sections';

  function read() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
    } catch {
      return [];
    }
  }

  function write(list) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* storage unavailable (private mode, quota) — pinning just won't persist */
    }
  }

  function isPinned(section) {
    return read().includes(section);
  }

  function toggle(section) {
    const list = read();
    const idx = list.indexOf(section);
    if (idx === -1) {
      list.push(section);
    } else {
      list.splice(idx, 1);
    }
    write(list);
    return list.includes(section);
  }

  return { read, isPinned, toggle };
})();
