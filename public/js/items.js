/**
 * Generic add/edit/delete list UI, shared by Commands, Predictions,
 * Channels, Stream Notes, Backlog, Veto Power, Quick Links, and CV.
 * Each page calls initItemList() with its own section name + labels;
 * all data goes through /api/items, gated server-side by requireAuthApi.
 */
function initItemList(config) {
  const {
    section,
    mountId,
    titleLabel = 'Title',
    bodyLabel = 'Notes',
    showBody = true,
    showUrl = false,
    urlLabel = 'URL',
    bodyMultiline = true,
    emptyText = 'Nothing here yet. Add your first item below.',
    addButtonText = 'Add',
  } = config;

  const mount = document.getElementById(mountId);
  if (!mount) return;

  let items = [];
  let editingId = null;
  let loadError = null;

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  function render() {
    const listHtml = items.length
      ? items.map(renderItem).join('')
      : `<p class="text-dim item-empty">${escapeHtml(emptyText)}</p>`;

    mount.innerHTML = `
      ${loadError ? `<p class="error-text">${escapeHtml(loadError)}</p>` : ''}
      <div class="item-list">${listHtml}</div>
      <form class="item-add-form" id="item-add-form">
        <div class="field">
          <label for="item-add-title">${escapeHtml(titleLabel)}</label>
          <input id="item-add-title" type="text" maxlength="200" required />
        </div>
        ${showUrl ? `
        <div class="field">
          <label for="item-add-url">${escapeHtml(urlLabel)}</label>
          <input id="item-add-url" type="url" placeholder="https://" maxlength="2000" />
        </div>` : ''}
        ${showBody ? `
        <div class="field">
          <label for="item-add-body">${escapeHtml(bodyLabel)}</label>
          ${bodyMultiline
            ? `<textarea id="item-add-body" rows="3" maxlength="5000"></textarea>`
            : `<input id="item-add-body" type="text" maxlength="5000" />`}
        </div>` : ''}
        <button class="primary item-add-submit" type="submit">${escapeHtml(addButtonText)}</button>
        <p class="error-text hidden" id="item-add-error"></p>
      </form>
    `;

    wireUp();
  }

  function renderItem(item) {
    if (editingId === item.id) {
      return `
        <div class="item-card item-card-editing" data-id="${item.id}">
          <div class="field">
            <label>${escapeHtml(titleLabel)}</label>
            <input type="text" class="edit-title" value="${escapeHtml(item.title)}" maxlength="200" />
          </div>
          ${showUrl ? `
          <div class="field">
            <label>${escapeHtml(urlLabel)}</label>
            <input type="url" class="edit-url" value="${escapeHtml(item.url || '')}" maxlength="2000" />
          </div>` : ''}
          ${showBody ? `
          <div class="field">
            <label>${escapeHtml(bodyLabel)}</label>
            ${bodyMultiline
              ? `<textarea class="edit-body" rows="3" maxlength="5000">${escapeHtml(item.body || '')}</textarea>`
              : `<input type="text" class="edit-body" value="${escapeHtml(item.body || '')}" maxlength="5000" />`}
          </div>` : ''}
          <div class="item-card-actions">
            <button class="primary item-save-btn" type="button" data-id="${item.id}">Save</button>
            <button class="secondary item-cancel-btn" type="button" data-id="${item.id}">Cancel</button>
          </div>
          <p class="error-text hidden item-edit-error"></p>
        </div>
      `;
    }

    return `
      <div class="item-card" data-id="${item.id}">
        <div class="item-card-main">
          <div class="item-card-title">${escapeHtml(item.title)}</div>
          ${showUrl && item.url ? `<a class="item-card-url" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.url)}</a>` : ''}
          ${showBody && item.body ? `<div class="item-card-body">${escapeHtml(item.body)}</div>` : ''}
        </div>
        <div class="item-card-actions">
          <button class="secondary item-edit-btn" type="button" data-id="${item.id}">Edit</button>
          <button class="secondary item-delete-btn" type="button" data-id="${item.id}">Delete</button>
        </div>
      </div>
    `;
  }

  function wireUp() {
    const addForm = document.getElementById('item-add-form');
    if (addForm) {
      addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titleInput = document.getElementById('item-add-title');
        const urlInput = document.getElementById('item-add-url');
        const bodyInput = document.getElementById('item-add-body');
        const errorEl = document.getElementById('item-add-error');
        const submitBtn = addForm.querySelector('.item-add-submit');

        errorEl.classList.add('hidden');
        submitBtn.disabled = true;

        try {
          const res = await fetch('/api/items', {
            method: 'POST',
            headers: csrfHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
              section,
              title: titleInput.value,
              url: urlInput ? urlInput.value : undefined,
              body: bodyInput ? bodyInput.value : undefined,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            errorEl.textContent = data.error || 'Failed to add item.';
            errorEl.classList.remove('hidden');
            return;
          }
          items.push(data.item);
          render();
        } catch {
          errorEl.textContent = 'Network error. Please try again.';
          errorEl.classList.remove('hidden');
        } finally {
          submitBtn.disabled = false;
        }
      });
    }

    mount.querySelectorAll('.item-edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        editingId = btn.dataset.id;
        render();
      });
    });

    mount.querySelectorAll('.item-cancel-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        editingId = null;
        render();
      });
    });

    mount.querySelectorAll('.item-delete-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('Delete this item?')) return;
        const id = btn.dataset.id;
        btn.disabled = true;
        try {
          const res = await fetch(`/api/items/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: csrfHeaders(),
          });
          if (res.ok) {
            items = items.filter((i) => i.id !== id);
            render();
          }
        } finally {
          btn.disabled = false;
        }
      });
    });

    mount.querySelectorAll('.item-save-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const card = mount.querySelector(`.item-card[data-id="${CSS.escape(id)}"]`);
        const titleInput = card.querySelector('.edit-title');
        const urlInput = card.querySelector('.edit-url');
        const bodyInput = card.querySelector('.edit-body');
        const errorEl = card.querySelector('.item-edit-error');

        btn.disabled = true;
        errorEl.classList.add('hidden');

        try {
          const res = await fetch(`/api/items/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: csrfHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
              title: titleInput.value,
              url: urlInput ? urlInput.value : undefined,
              body: bodyInput ? bodyInput.value : undefined,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            errorEl.textContent = data.error || 'Failed to save.';
            errorEl.classList.remove('hidden');
            return;
          }
          items = items.map((i) => (i.id === id ? data.item : i));
          editingId = null;
          render();
        } catch {
          errorEl.textContent = 'Network error. Please try again.';
          errorEl.classList.remove('hidden');
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  mount.innerHTML = '<p class="text-dim">Loading…</p>';

  fetch(`/api/items?section=${encodeURIComponent(section)}`, { headers: csrfHeaders() })
    .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (!ok) {
        loadError = data.error || 'Failed to load items.';
        items = [];
      } else {
        items = data.items || [];
      }
      render();
    })
    .catch(() => {
      loadError = 'Network error loading items.';
      render();
    });
}

// Auto-initialize any element with data-item-list on the page, reading
// its configuration from data-* attributes. This keeps every page free
// of inline <script> config blocks, which the strict CSP disallows.
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-item-list]').forEach((el) => {
    const toBool = (v, fallback) => (v === undefined ? fallback : v === 'true');
    initItemList({
      section: el.dataset.section,
      mountId: el.id,
      titleLabel: el.dataset.titleLabel || 'Title',
      bodyLabel: el.dataset.bodyLabel || 'Notes',
      showBody: toBool(el.dataset.showBody, true),
      showUrl: toBool(el.dataset.showUrl, false),
      urlLabel: el.dataset.urlLabel || 'URL',
      bodyMultiline: toBool(el.dataset.bodyMultiline, true),
      emptyText: el.dataset.emptyText || 'Nothing here yet. Add your first item below.',
      addButtonText: el.dataset.addButtonText || 'Add',
    });
  });
});
