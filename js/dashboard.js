/* Dashboard overview: summary cards and recent applications. */
(function () {
  'use strict';
  const tbody = document.getElementById('recent-body');
  const COLS = 5;

  function render(apps) {
    const count = (s) => apps.filter((a) => a.status === s).length;
    document.getElementById('stat-total').textContent = apps.length;
    document.getElementById('stat-pending').textContent = count('Pending');
    document.getElementById('stat-interview').textContent = count('Interview');
    document.getElementById('stat-accepted').textContent = count('Accepted');
    document.getElementById('stat-denied').textContent = count('Denied');

    const recent = apps.slice().sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).slice(0, 6);
    if (!recent.length) {
      tbody.innerHTML = messageRow(COLS, 'No applications found', 'New applications from your connected forms will show up here.');
      return;
    }
    tbody.innerHTML = recent.map((a) =>
      '<tr><td class="strong">' + esc(a.discordUsername) + '</td>' +
      '<td>' + factionChip(a.faction) + '</td>' +
      '<td>' + statusBadge(a.status) + '</td>' +
      '<td class="num">' + esc(formatDate(a.submittedAt)) + '</td>' +
      '<td class="actions"><a class="btn btn-sm" href="application.html?id=' + encodeURIComponent(a.id) + '">View</a></td></tr>'
    ).join('');
  }

  async function load() {
    tbody.innerHTML = skeletonRows(COLS, 5);
    try {
      render(asList(await apiGet(ENDPOINTS.applications), 'applications'));
    } catch (err) {
      tbody.innerHTML = messageRow(COLS, 'Could not load applications', err.message, '<br><button type="button" class="btn btn-sm" data-retry>Try again</button>');
    }
  }

  tbody.addEventListener('click', (e) => { if (e.target.closest('[data-retry]')) load(); });
  authReady.then(load);
})();
