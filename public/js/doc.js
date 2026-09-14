/**
 * Generic document editor, shared by every content page (Twitch,
 * Nightbot, Commands, Predictions, Channels, Notes, Backlog, Veto,
 * Links, CV). Each page is just a big textarea backed by one row in
 * Supabase per section. Auto-saves 1.5s after typing stops, plus an
 * explicit Save button for anyone who doesn't trust autosave.
 */
document.addEventListener('DOMContentLoaded', () => {
  const mount = document.querySelector('[data-doc-editor]');
  if (!mount) return;

  const section = mount.dataset.section;
  const textarea = mount.querySelector('.doc-textarea');
  const statusEl = mount.querySelector('.doc-status');
  const saveBtn = mount.querySelector('.doc-save-btn');

  let lastSavedContent = '';
  let saveTimer = null;
  let saving = false;

  function setStatus(text, isError) {
    statusEl.textContent = text;
    statusEl.classList.toggle('doc-status-error', !!isError);
  }

  function formatTime(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  async function load() {
    textarea.disabled = true;
    setStatus('Loading…');
    try {
      const res = await fetch(`/api/docs/${encodeURIComponent(section)}`, { headers: csrfHeaders() });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || 'Failed to load.', true);
        return;
      }
      textarea.value = data.doc.content || '';
      lastSavedContent = textarea.value;
      const savedAt = formatTime(data.doc.updated_at);
      setStatus(savedAt ? `Saved · last edited ${savedAt}` : 'Nothing saved yet');
    } catch {
      setStatus('Network error loading document.', true);
    } finally {
      textarea.disabled = false;
    }
  }

  async function save() {
    if (saving) return;
    const content = textarea.value;
    if (content === lastSavedContent) return;

    saving = true;
    setStatus('Saving…');
    try {
      const res = await fetch(`/api/docs/${encodeURIComponent(section)}`, {
        method: 'PUT',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || 'Failed to save.', true);
        return;
      }
      lastSavedContent = content;
      setStatus('Saved just now');
    } catch {
      setStatus('Network error — changes not saved.', true);
    } finally {
      saving = false;
    }
  }

  textarea.addEventListener('input', () => {
    setStatus('Unsaved changes…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 1500);
  });

  // Save on blur too, so switching tabs/pages doesn't lose anything
  // waiting on the debounce timer.
  textarea.addEventListener('blur', () => {
    clearTimeout(saveTimer);
    save();
  });

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      clearTimeout(saveTimer);
      save();
    });
  }

  load();
});
