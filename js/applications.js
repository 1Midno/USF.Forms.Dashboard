/* Applications list: search, filters, sorting and pagination. */
(function () {
  'use strict';
  const COLS = 7;
  const PAGE_SIZE = 10;
  const tbody = document.getElementById('apps-body');
  const pager = document.getElementById('pager');
  const searchEl = document.getElementById('search');
  const factionEl = document.getElementById('filter-faction');
  const statusEl = document.getElementById('filter-status');
  const sortEl = document.getElementById('sort');
  const state = { all: [], page: 1 };

  function filtered() {
    const q = searchEl.value.trim().toLowerCase();
    const list = state.all.filter((a) =>
      (factionEl.value === 'All' || a.faction === factionEl.value) &&
      (statusEl.value === 'All' || a.status === statusEl.value) &&
      (!q || [a.id, a.discordUsername, a.discordId, a.faction, a.status].join(' ').toLowerCase().indexOf(q) !== -1));
    const dir = sortEl.value === 'oldest' ? 1 : -1;
    return list.sort((a, b) => dir * (new Date(a.submittedAt) - new Date(b.submittedAt)));
  }

  function pageButtons(current, total) {
    const pages = [];
    for (let p = 1; p <= total; p++) if (p === 1 || p === total || Math.abs(p - current) <= 1) pages.push(p);
    let html = '';
    pages.forEach((p, i) => {
      if (i && p - pages[i - 1] > 1) html += '<span class="muted" aria-hidden="true">…</span>';
      html += '<button type="button" class="btn btn-sm" data-page="' + p + '"' + (p === current ? ' aria-current="page"' : '') + ' aria-label="Page ' + p + '">' + p + '</button>';
    });
    return html;
  }

  function render() {
    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * PAGE_SIZE;
    const rows = list.slice(start, start + PAGE_SIZE);

    if (!rows.length) {
      const hasFilters = state.all.length > 0;
      tbody.innerHTML = messageRow(COLS, 'No applications found', hasFilters ? 'Try a different search or clear the filters.' : 'Applications from your connected forms will appear here.');
      pager.hidden = true;
      return;
    }
    tbody.innerHTML = rows.map((a) =>
      '<tr><td class="num">#' + esc(a.id) + '</td>' +
      '<td class="strong">' + esc(a.discordUsername) + '</td>' +
      '<td class="num">' + esc(a.discordId) + '</td>' +
      '<td>' + factionChip(a.faction) + '</td>' +
      '<td>' + statusBadge(a.status) + '</td>' +
      '<td class="num">' + esc(formatDate(a.submittedAt)) + '</td>' +
      '<td class="actions"><a class="btn btn-sm" href="application.html?id=' + encodeURIComponent(a.id) + '">View</a></td></tr>'
    ).join('');

    pager.hidden = false;
    document.getElementById('pager-info').textContent = 'Showing ' + (start + 1) + '–' + (start + rows.length) + ' of ' + list.length;
    document.getElementById('pager-btns').innerHTML =
      '<button type="button" class="btn btn-sm" data-page="' + (state.page - 1) + '"' + (state.page === 1 ? ' disabled' : '') + '>Previous</button>' +
      pageButtons(state.page, pages) +
      '<button type="button" class="btn btn-sm" data-page="' + (state.page + 1) + '"' + (state.page === pages ? ' disabled' : '') + '>Next</button>';
  }

  async function load() {
    pager.hidden = true;
    tbody.innerHTML = skeletonRows(COLS, 8);
    try {
      // Later: GET /api/applications (add ?page=, ?q=, ?faction=, ?status= for server-side paging).
      state.all = asList(await apiGet(ENDPOINTS.applications), 'applications');
      render();
    } catch (err) {
      tbody.innerHTML = messageRow(COLS, 'Could not load applications', err.message, '<br><button type="button" class="btn btn-sm" data-retry>Try again</button>');
    }
  }

  const reset = () => { state.page = 1; render(); };
  searchEl.addEventListener('input', debounce(reset, 200));
  [factionEl, statusEl, sortEl].forEach((el) => el.addEventListener('change', reset));
  pager.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    state.page = Number(btn.dataset.page);
    render();
    document.getElementById('main').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  tbody.addEventListener('click', (e) => { if (e.target.closest('[data-retry]')) load(); });
  authReady.then(load);
})();
