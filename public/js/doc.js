/**
 * Generic document editor, shared by every content page (Twitch,
 * Nightbot, Commands, Predictions, Channels, Notes, Backlog, Veto,
 * Links, CV). Each page is just a big textarea backed by one row in
 * Supabase per section. Auto-saves 1.5s after typing stops, plus an
 * explicit Save button, Ctrl/Cmd+S, save-on-blur, a warning before
 * leaving with unsaved changes, one-level undo, and a per-page
 * download button.
 */
document.addEventListener('DOMContentLoaded', () => {
  const mount = document.querySelector('[data-doc-editor]');
  if (!mount) return;

  const section = mount.dataset.section;
  const textarea = mount.querySelector('.doc-textarea');
  const statusEl = mount.querySelector('.doc-status');
  const saveBtn = mount.querySelector('.doc-save-btn');
  const revertBtn = mount.querySelector('.doc-revert-btn');
  const downloadBtn = mount.querySelector('.doc-download-btn');

  let lastSavedContent = '';
  let hasPreviousVersion = false;
  let saveTimer = null;
  let saving = false;

  function countWords(text) {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }

  function statusWithCounts(base) {
    const words = countWords(textarea.value);
    const chars = textarea.value.length;
    return `${base} · ${words} word${words === 1 ? '' : 's'} · ${chars} char${chars === 1 ? '' : 's'}`;
  }

  function setStatus(text, isError) {
    statusEl.textContent = statusWithCounts(text);
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

  function updateRevertVisibility() {
    if (!revertBtn) return;
    revertBtn.classList.toggle('hidden', !hasPreviousVersion);
  }

  function hasUnsavedChanges() {
    return textarea.value !== lastSavedContent;
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
      hasPreviousVersion =
        data.doc.previous_content !== null && data.doc.previous_content !== undefined;
      updateRevertVisibility();
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
      hasPreviousVersion = true; // saveDoc always shifts the prior content into previous_content
      updateRevertVisibility();
      setStatus('Saved just now');
    } catch {
      setStatus('Network error — changes not saved.', true);
    } finally {
      saving = false;
    }
  }

  async function revert() {
    if (!window.confirm('Restore the previous saved version? This replaces what\u2019s currently on the page.')) {
      return;
    }
    setStatus('Restoring…');
    try {
      const res = await fetch(`/api/docs/${encodeURIComponent(section)}/revert`, {
        method: 'POST',
        headers: csrfHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || 'Nothing to revert to.', true);
        return;
      }
      textarea.value = data.doc.content || '';
      lastSavedContent = textarea.value;
      hasPreviousVersion = false;
      updateRevertVisibility();
      setStatus('Restored previous version');
    } catch {
      setStatus('Network error — could not revert.', true);
    }
  }

  function download() {
    const blob = new Blob([textarea.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${section}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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

  // Ctrl/Cmd+S saves immediately instead of triggering the browser's
  // "save page" dialog.
  textarea.addEventListener('keydown', (e) => {
    const isSaveShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's';
    if (isSaveShortcut) {
      e.preventDefault();
      clearTimeout(saveTimer);
      save();
    }
  });

  // Warn before closing/navigating away with unsaved changes.
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      clearTimeout(saveTimer);
      save();
    });
  }

  if (revertBtn) {
    revertBtn.addEventListener('click', revert);
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', download);
  }

  load();
});
