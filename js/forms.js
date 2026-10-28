/* Connected Google Forms. */
(function () {
  'use strict';
  const COLS = 5;
  const tbody = document.getElementById('forms-body');
  const form = document.getElementById('connect-form');
  const input = document.getElementById('form-input');
  const submit = document.getElementById('connect-submit');
  const alertEl = document.getElementById('form-alert');
  let forms = [];

  // Accepts a full Google Form link or a bare Form ID. Returns the ID or null.
  function parseFormId(value) {
    const v = value.trim();
    const m = v.match(/\/forms\/(?:u\/\d+\/)?d\/(?:e\/)?([A-Za-z0-9_-]{10,})/);
    if (m) return m[1];
    if (/^https?:\/\//i.test(v)) return null;
    return /^[A-Za-z0-9_-]{10,}$/.test(v) ? v : null;
  }

  function openUrl(id) {
    const safe = encodeURIComponent(id);
    return id.indexOf('1FAIpQLS') === 0 ? 'https://docs.google.com/forms/d/e/' + safe + '/viewform' : 'https://docs.google.com/forms/d/' + safe + '/edit';
  }

  function render() {
    if (!forms.length) {
      tbody.innerHTML = messageRow(COLS, 'No forms connected', 'Paste a Google Form link above to start receiving applications.');
      return;
    }
    tbody.innerHTML = forms.map((f) =>
      '<tr><td class="strong">' + esc(f.name) + '</td>' +
      '<td class="num">' + esc(f.formId) + '</td>' +
      '<td>' + statusBadge(f.status) + '</td>' +
      '<td class="num">' + esc(formatDate(f.connectedAt)) + '</td>' +
      '<td class="actions"><a class="btn btn-sm" href="' + esc(openUrl(f.formId)) + '" target="_blank" rel="noopener noreferrer">Open</a>' +
      '<button type="button" class="btn btn-sm btn-danger" data-disconnect="' + esc(f.id) + '">Disconnect</button></td></tr>'
    ).join('');
  }

  async function load() {
    tbody.innerHTML = skeletonRows(COLS, 3);
    try {
      forms = asList(await apiGet(ENDPOINTS.forms), 'forms');
      render();
    } catch (err) {
      tbody.innerHTML = messageRow(COLS, 'Could not load forms', err.message, '<br><button type="button" class="btn btn-sm" data-retry>Try again</button>');
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertEl.hidden = true;
    const formId = parseFormId(input.value);
    if (!AuthUtils.setFieldError(input, formId ? '' : 'Paste the full Google Form link or the Form ID (at least 10 letters, numbers, - or _).')) return;
    setLoading(submit, true, 'Connecting…');
    try {
      const created = await apiPost(ENDPOINTS.formsConnect, { formId });
      forms.unshift(created);
      render();
      input.value = '';
      toast('Form connected', 'success');
    } catch (err) {
      AuthUtils.showAlert(alertEl, err.message);
    } finally {
      setLoading(submit, false);
    }
  });

  tbody.addEventListener('click', (e) => {
    if (e.target.closest('[data-retry]')) return load();
    if (e.target.closest('[data-disconnect]')) toast('Placeholder: add a disconnect endpoint (e.g. DELETE /api/forms/:id) to enable this.', 'info');
  });
  authReady.then(load);
})();
