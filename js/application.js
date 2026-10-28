/* Application detail: view, change status, add notes. */
(function () {
  'use strict';
  const root = document.getElementById('detail-root');
  const id = new URLSearchParams(location.search).get('id');
  const base = ENDPOINTS.applications + '/' + encodeURIComponent(id || '');
  let current = null;

  function stateMessage(title, text, withBack) {
    root.innerHTML = '<div class="card"><div class="empty"><strong>' + esc(title) + '</strong>' + esc(text) +
      (withBack ? '<br><a class="btn" href="applications.html">Back to applications</a>' : '') + '</div></div>';
  }

  function noteHtml(n) {
    return '<div class="note"><div class="note-meta">' + esc(n.author || 'Reviewer') + ' · ' + esc(formatDateTime(n.createdAt)) + '</div><div class="prose">' + esc(n.text) + '</div></div>';
  }

  function renderNotes() {
    const list = document.getElementById('notes-list');
    list.innerHTML = current.notes.length ? current.notes.map(noteHtml).join('') : '<p class="muted">No notes yet. Add the first one below.</p>';
  }

  function build(app) {
    current = app;
    current.notes = Array.isArray(app.notes) ? app.notes : [];
    document.title = 'Application #' + app.id + ' · Application Dashboard';
    root.innerHTML =
      '<a class="back" href="applications.html">← Back to applications</a>' +
      '<div class="page-head"><div><h1>Application #' + esc(app.id) + '</h1><p>Submitted ' + esc(formatDateTime(app.submittedAt)) + '</p></div><div id="head-status">' + statusBadge(app.status) + '</div></div>' +
      '<div class="detail"><div class="stack">' +
      '<section class="card card-pad" aria-labelledby="h-applicant"><h2 id="h-applicant">Applicant</h2><dl class="meta">' +
      '<div><dt>Application ID</dt><dd>#' + esc(app.id) + '</dd></div>' +
      '<div><dt>Status</dt><dd id="meta-status">' + statusBadge(app.status) + '</dd></div>' +
      '<div><dt>Discord username</dt><dd>' + esc(app.discordUsername) + '</dd></div>' +
      '<div><dt>Discord ID</dt><dd>' + esc(app.discordId) + '</dd></div>' +
      '<div><dt>Faction</dt><dd>' + factionChip(app.faction) + '</dd></div>' +
      '<div><dt>Submitted</dt><dd>' + esc(formatDate(app.submittedAt)) + '</dd></div></dl></section>' +
      '<section class="card card-pad" aria-labelledby="h-exp"><h2 id="h-exp">Experience</h2><p class="prose">' + esc(app.experience || 'Not provided.') + '</p></section>' +
      '<section class="card card-pad" aria-labelledby="h-mot"><h2 id="h-mot">Motivation</h2><p class="prose">' + esc(app.motivation || 'Not provided.') + '</p></section></div>' +
      '<div class="stack">' +
      '<section class="card card-pad" aria-labelledby="h-review"><h2 id="h-review">Review</h2>' +
      '<div class="field"><label for="status-select">Status</label><select class="input" id="status-select">' +
      STATUSES.map((s) => '<option' + (s === app.status ? ' selected' : '') + '>' + esc(s) + '</option>').join('') + '</select></div>' +
      '<button type="button" class="btn btn-primary btn-block" id="save-status">Save Status</button></section>' +
      '<section class="card card-pad" aria-labelledby="h-notes"><h2 id="h-notes">Notes</h2><div id="notes-list"></div>' +
      '<div class="field"><label for="note-text">Add a note</label><textarea class="input" id="note-text" maxlength="2000" placeholder="Write a note for other reviewers"></textarea><div class="field-error" id="note-text-error"></div></div>' +
      '<button type="button" class="btn btn-block" id="add-note">Add Note</button></section></div></div>';
    renderNotes();

    document.getElementById('save-status').addEventListener('click', saveStatus);
    document.getElementById('add-note').addEventListener('click', addNote);
  }

  async function saveStatus(e) {
    const btn = e.currentTarget;
    const status = document.getElementById('status-select').value;
    setLoading(btn, true, 'Saving…');
    try {
      await apiPost(base + '/status', { status });
      current.status = status;
      document.getElementById('head-status').innerHTML = statusBadge(status);
      document.getElementById('meta-status').innerHTML = statusBadge(status);
      toast('Status saved: ' + status, 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(btn, false);
    }
  }

  async function addNote(e) {
    const btn = e.currentTarget;
    const input = document.getElementById('note-text');
    const text = input.value.trim();
    if (!AuthUtils.setFieldError(input, text ? '' : 'Write a note before adding it.')) return;
    setLoading(btn, true, 'Adding…');
    try {
      const res = await apiPost(base + '/note', { note: text });
      current.notes.push(res && res.note ? res.note : { author: 'You', text, createdAt: new Date().toISOString() });
      renderNotes();
      input.value = '';
      toast('Note added', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(btn, false);
    }
  }

  async function load() {
    if (!/^\d+$/.test(id || '')) return stateMessage('Application not found', 'The link is missing a valid application ID.', true);
    root.innerHTML = '<div class="card card-pad" aria-busy="true"><span class="skeleton" style="width:30%;height:24px"></span><br><span class="skeleton" style="width:70%"></span><br><span class="skeleton" style="width:55%"></span></div>';
    try {
      build(await apiGet(base));
    } catch (err) {
      if (err.status === 404) stateMessage('Application not found', 'It may have been removed, or the ID is wrong.', true);
      else stateMessage('Could not load this application', err.message, true);
    }
  }

  authReady.then(load);
})();
