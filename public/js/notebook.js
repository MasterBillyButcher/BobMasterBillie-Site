/**
 * "New entry" button for Stream Notes — prepends a dated heading block
 * to the top of the doc (most recent first, journal-style), then
 * reloads so doc.js picks up the fresh content.
 */
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('new-entry-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Adding…';

    try {
      const res = await fetch('/api/docs/notes', { headers: csrfHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load notes.');

      const stamp = new Date().toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      const existing = (data.doc.content || '').replace(/^\s+/, '');
      const entry = `${stamp}\n\nStart typing…`;
      const updated = existing ? `${entry}\n\n${existing}` : entry;

      const saveRes = await fetch('/api/docs/notes', {
        method: 'PUT',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ content: updated }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || 'Failed to save.');

      window.location.reload();
    } catch {
      btn.disabled = false;
      btn.textContent = 'New entry';
    }
  });
});
