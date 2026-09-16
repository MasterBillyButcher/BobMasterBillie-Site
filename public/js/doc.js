/**
 * Generic document editor, shared by every content page (Twitch,
 * Nightbot, Commands, Predictions, Channels, Notes, Backlog, Veto,
 * Links, CV). Each page is one row in Supabase per section.
 *
 * Two modes:
 * - View (default): a structured read-only render. Content is split
 *   into blank-line-separated blocks; a block's first line becomes a
 *   heading if the block has more than one line and that line is short
 *   and doesn't look like a bullet or a "term → description" line.
 *   Lines with "→" render as a term chip + description. Lines starting
 *   with "•", "-", or "1." render as list items. Everything else is a
 *   plain paragraph line. This is a light heuristic, not a markdown
 *   parser — content that doesn't fit the pattern just falls back to
 *   plain paragraphs, so nothing breaks either way.
 * - Edit: the textarea, with autosave 1.5s after typing stops, an
 *   explicit Save button, Ctrl/Cmd+S, save-on-blur, a warning before
 *   leaving with unsaved changes, one-level undo, and download.
 */
document.addEventListener('DOMContentLoaded', () => {
  const mount = document.querySelector('[data-doc-editor]');
  if (!mount) return;

  const section = mount.dataset.section;
  const textarea = mount.querySelector('.doc-textarea');
  const viewEl = mount.querySelector('.doc-view');
  const statusEl = mount.querySelector('.doc-status');
  const countersEl = mount.querySelector('.doc-counters');
  const editBtn = mount.querySelector('.doc-edit-btn');
  const saveBtn = mount.querySelector('.doc-save-btn');
  const revertBtn = mount.querySelector('.doc-revert-btn');
  const copyBtn = mount.querySelector('.doc-copy-btn');
  const downloadBtn = mount.querySelector('.doc-download-btn');

  let lastSavedContent = '';
  let hasPreviousVersion = false;
  let saveTimer = null;
  let saving = false;
  let editing = false;

  function countWords(text) {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }

  function badge(text) {
    const el = document.createElement('span');
    el.className = 'doc-counter-badge';
    el.textContent = text;
    return el;
  }

  function updateCounters() {
    if (!countersEl) return;
    const words = countWords(textarea.value);
    const chars = textarea.value.length;
    const readMins = words === 0 ? 0 : Math.max(1, Math.round(words / 200));

    countersEl.innerHTML = '';
    countersEl.appendChild(badge(`${words} word${words === 1 ? '' : 's'}`));
    countersEl.appendChild(badge(`${chars} char${chars === 1 ? '' : 's'}`));
    if (readMins > 0) {
      countersEl.appendChild(badge(`~${readMins} min read`));
    }
  }

  function setStatus(text, isError) {
    statusEl.textContent = text;
    statusEl.classList.toggle('doc-status-error', !!isError);
    updateCounters();
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

  async function copyToClipboard(text, flashMessage) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(flashMessage || 'Copied to clipboard');
    } catch {
      setStatus('Could not copy — try selecting the text manually.', true);
    }
  }

  // ---- Structured view renderer ------------------------------------

  function looksLikeHeadingText(line) {
    const t = line.trim();
    if (t.length === 0 || t.length > 60) return false;
    if (t.includes('→')) return false;
    if (/^[•\-]\s/.test(t)) return false;
    if (/^\d+\.\s/.test(t)) return false;
    return true;
  }

  function renderArrowRow(line) {
    const idx = line.indexOf('→');
    const term = line.slice(0, idx).trim();
    const desc = line.slice(idx + 1).trim();
    const row = document.createElement('div');
    row.className = 'doc-row';
    const chip = document.createElement('span');
    chip.className = 'doc-chip';
    chip.textContent = term;
    const descEl = document.createElement('span');
    descEl.className = 'doc-row-desc';
    descEl.textContent = desc;
    const copyIcon = document.createElement('button');
    copyIcon.type = 'button';
    copyIcon.className = 'doc-row-copy';
    copyIcon.title = `Copy "${term}"`;
    copyIcon.innerHTML =
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M13 7V4.5A1.5 1.5 0 0 0 11.5 3h-6A1.5 1.5 0 0 0 4 4.5v6A1.5 1.5 0 0 0 5.5 12H7"/></svg>';
    copyIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      copyToClipboard(term, `Copied "${term}"`);
    });
    row.append(chip, descEl, copyIcon);
    return row;
  }

  function renderBullet(line, numbered) {
    const el = document.createElement('div');
    el.className = numbered ? 'doc-bullet doc-bullet-numbered' : 'doc-bullet';
    el.textContent = numbered ? line.trim() : line.trim().replace(/^[•\-]\s*/, '');
    return el;
  }

  function renderParagraph(line) {
    const el = document.createElement('div');
    el.className = 'doc-paragraph';
    el.textContent = line;
    return el;
  }

  function renderView() {
    const content = textarea.value;
    viewEl.innerHTML = '';

    if (content.trim().length === 0) {
      const empty = document.createElement('div');
      empty.className = 'doc-view-empty';
      empty.textContent = 'Nothing here yet — click Edit to add something.';
      viewEl.appendChild(empty);
      return;
    }

    const blocks = content.split(/\n\s*\n/);
    blocks.forEach((block) => {
      const lines = block.split('\n').filter((l) => l.trim() !== '');
      if (lines.length === 0) return;

      const blockEl = document.createElement('div');
      blockEl.className = 'doc-block';

      let startIdx = 0;
      if (lines.length === 1 && looksLikeHeadingText(lines[0])) {
        const heading = document.createElement('div');
        heading.className = 'doc-heading-main';
        heading.textContent = lines[0].trim();
        blockEl.appendChild(heading);
        startIdx = 1;
      } else if (lines.length > 1 && looksLikeHeadingText(lines[0])) {
        const heading = document.createElement('div');
        heading.className = 'doc-heading';
        heading.textContent = lines[0].trim();
        blockEl.appendChild(heading);
        startIdx = 1;
      }

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.includes('→')) {
          blockEl.appendChild(renderArrowRow(trimmed));
        } else if (/^[•\-]\s/.test(trimmed)) {
          blockEl.appendChild(renderBullet(trimmed, false));
        } else if (/^\d+\.\s/.test(trimmed)) {
          blockEl.appendChild(renderBullet(trimmed, true));
        } else {
          blockEl.appendChild(renderParagraph(line));
        }
      }

      viewEl.appendChild(blockEl);
    });
  }

  // ---- Edit/view mode + save/load/revert/download -------------------

  function updateRevertVisibility() {
    if (!revertBtn) return;
    revertBtn.classList.toggle('hidden', !hasPreviousVersion);
  }

  function hasUnsavedChanges() {
    return textarea.value !== lastSavedContent;
  }

  function enterEditMode() {
    editing = true;
    viewEl.classList.add('hidden');
    textarea.classList.remove('hidden');
    saveBtn.classList.remove('hidden');
    editBtn.textContent = 'Done';
    textarea.focus();
  }

  async function exitEditMode() {
    clearTimeout(saveTimer);
    await save();
    editing = false;
    textarea.classList.add('hidden');
    viewEl.classList.remove('hidden');
    saveBtn.classList.add('hidden');
    editBtn.textContent = 'Edit';
    renderView();
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
      renderView();
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
      lastSavedContent = data.doc.content;
      textarea.value = data.doc.content; // reflects server-side trim
      hasPreviousVersion = true;
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
      renderView();
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

  textarea.addEventListener('blur', () => {
    clearTimeout(saveTimer);
    save();
  });

  textarea.addEventListener('keydown', (e) => {
    const isSaveShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's';
    if (isSaveShortcut) {
      e.preventDefault();
      clearTimeout(saveTimer);
      save();
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  if (editBtn) {
    editBtn.addEventListener('click', () => {
      if (editing) {
        exitEditMode();
      } else {
        enterEditMode();
      }
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      clearTimeout(saveTimer);
      save();
    });
  }

  if (revertBtn) {
    revertBtn.addEventListener('click', revert);
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      copyToClipboard(textarea.value, 'Copied whole document');
    });
  }

  const printBtn = mount.querySelector('.doc-print-btn');
  if (printBtn) {
    printBtn.addEventListener('click', async () => {
      // Print the formatted view, not the raw textarea — so leave edit
      // mode (saving anything pending) before opening the print dialog.
      if (editing) await exitEditMode();
      window.print();
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', download);
  }

  load();
});
