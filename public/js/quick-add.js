/**
 * A small "quick add" form that appends one structured line to a doc
 * and saves it — without needing the page's doc.js state at all. After
 * a successful add, it reloads the page so doc.js re-initializes with
 * the fresh content (and the item counter picks it up automatically).
 *
 * Config is read from data-* attributes on a [data-quick-add] element:
 *   data-section       — which doc to append to
 *   data-template       — line template, e.g. "• {name}" or
 *                         "{name} ({platform}) → {url}"
 *   data-fields         — JSON array of { key, label, placeholder?, type? }
 */
document.addEventListener('DOMContentLoaded', () => {
  const mount = document.querySelector('[data-quick-add]');
  if (!mount) return;

  const section = mount.dataset.section;
  const template = mount.dataset.template;
  let fields;
  try {
    fields = JSON.parse(mount.dataset.fields || '[]');
  } catch {
    fields = [];
  }
  if (!section || !template || fields.length === 0) return;

  const form = document.createElement('form');
  form.className = 'quick-add-form';

  const fieldsRow = document.createElement('div');
  fieldsRow.className = 'quick-add-fields';

  const inputs = {};
  fields.forEach((f) => {
    const field = document.createElement('div');
    field.className = 'field quick-add-field';
    const label = document.createElement('label');
    label.textContent = f.label;
    label.htmlFor = `qa-${f.key}`;

    let input;
    if (f.type === 'select' && Array.isArray(f.options)) {
      input = document.createElement('select');
      f.options.forEach((opt) => {
        const optEl = document.createElement('option');
        optEl.value = opt;
        optEl.textContent = opt;
        input.appendChild(optEl);
      });
    } else {
      input = document.createElement('input');
      input.type = f.type || 'text';
      input.placeholder = f.placeholder || '';
    }
    input.id = `qa-${f.key}`;
    if (f.required) input.required = true;
    inputs[f.key] = input;
    field.append(label, input);
    fieldsRow.appendChild(field);
  });

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'primary quick-add-submit';
  submitBtn.textContent = mount.dataset.buttonText || 'Add';

  const errorEl = document.createElement('p');
  errorEl.className = 'error-text hidden quick-add-error';

  form.append(fieldsRow, submitBtn, errorEl);
  mount.appendChild(form);

  function buildLine() {
    let line = template;
    for (const [key, input] of Object.entries(inputs)) {
      line = line.split(`{${key}}`).join(input.value.trim());
    }
    // Clean up a dangling " — " or " ()" if an optional field was left blank.
    return line
      .replace(/\s+—\s*$/, '')
      .replace(/\(\s*\)/, '')
      .replace(/→\s*$/, '')
      .trim();
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.toggle('hidden', !msg);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');

    const requiredMissing = fields.some((f) => f.required && !inputs[f.key].value.trim());
    if (requiredMissing) {
      showError('Please fill in the required field(s).');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding…';

    try {
      const currentRes = await fetch(`/api/docs/${encodeURIComponent(section)}`, {
        headers: csrfHeaders(),
      });
      const currentData = await currentRes.json();
      if (!currentRes.ok) throw new Error(currentData.error || 'Failed to load current content.');

      const existing = (currentData.doc.content || '').replace(/\s+$/, '');
      const newLine = buildLine();
      const updated = existing ? `${existing}\n${newLine}` : newLine;

      const saveRes = await fetch(`/api/docs/${encodeURIComponent(section)}`, {
        method: 'PUT',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ content: updated }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || 'Failed to save.');

      window.location.reload();
    } catch (err) {
      showError(err.message || 'Something went wrong.');
      submitBtn.disabled = false;
      submitBtn.textContent = mount.dataset.buttonText || 'Add';
    }
  });
});
