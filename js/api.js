/* Application Dashboard — shared API helpers and UI utilities.
   To connect a real backend: set CONFIG.MOCK_MODE = false and CONFIG.API_BASE to your API origin.
   No passwords, tokens or secrets are stored here; authentication is expected to use an
   HttpOnly session cookie set by the backend. */
(function (global) {
  'use strict';

  const CONFIG = {
    API_BASE: '',          // PLACEHOLDER: e.g. 'https://api.your-domain.example' ('' = same origin)
    MOCK_MODE: true,       // PLACEHOLDER: true serves the in-browser placeholder data below
    MOCK_DELAY_MS: 450
  };

  // PLACEHOLDER endpoints — connect these to your backend later.
  const ENDPOINTS = {
    me: '/api/me',
    login: '/api/login',
    register: '/api/register',
    logout: '/api/logout',
    logoutAll: '/api/logout-all',
    changePassword: '/api/change-password',
    discordLogin: '/api/auth/discord',
    discordLink: '/api/auth/discord/link',
    applications: '/api/applications',            // GET list; GET /:id; POST /:id/status; POST /:id/note
    forms: '/api/forms',                          // GET list
    formsConnect: '/api/forms/connect'            // POST
  };

  const STATUSES = ['Pending', 'Interview', 'Accepted', 'Denied'];
  const FACTIONS = ['Stormguard', 'Ironclad', 'Emberfall', 'Voidborn'];

  /* ---------- Fetch helpers ---------- */

  class ApiError extends Error {
    constructor(status, message, data) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.data = data || null;
    }
  }

  const DEFAULT_MESSAGES = {
    400: 'The request was not valid. Check what you entered and try again.',
    401: 'You are not signed in.',
    403: 'You do not have permission to do that.',
    404: 'That item could not be found.',
    409: 'That conflicts with something that already exists.',
    429: 'Too many attempts. Wait a moment and try again.'
  };

  // Converts a failed Response into a thrown ApiError with a readable message.
  async function handleApiError(response) {
    let data = null;
    try { data = await response.clone().json(); } catch (e) { /* body was not JSON */ }
    const message = (data && (data.message || data.error)) ||
      DEFAULT_MESSAGES[response.status] ||
      (response.status >= 500 ? 'The server had a problem. Try again in a moment.' : 'Something went wrong. Try again.');
    throw new ApiError(response.status, String(message), data);
  }

  async function request(method, url, body) {
    let response;
    try {
      if (CONFIG.MOCK_MODE) {
        response = await mockFetch(method, url, body);
      } else {
        const options = {
          method,
          credentials: 'include',
          headers: { Accept: 'application/json' }
        };
        if (body !== undefined) {
          options.headers['Content-Type'] = 'application/json';
          options.body = JSON.stringify(body);
        }
        response = await fetch(CONFIG.API_BASE + url, options);
      }
    } catch (err) {
      throw new ApiError(0, 'Could not reach the server. Check your connection and try again.');
    }
    if (!response.ok) return handleApiError(response);
    if (response.status === 204) return null;
    try { return await response.json(); } catch (e) { return null; }
  }

  const apiGet = (url) => request('GET', url);
  const apiPost = (url, body) => request('POST', url, body === undefined ? {} : body);
  const apiPut = (url, body) => request('PUT', url, body === undefined ? {} : body);

  /* ---------- UI utilities ---------- */

  // Escapes text for safe insertion into HTML (element content and quoted attributes).
  function esc(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/`/g, '&#96;');
  }

  function formatDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
  }

  function formatDateTime(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d);
  }

  function statusBadge(status) {
    const known = STATUSES.concat(['Active', 'Syncing', 'Error']).find((s) => s.toLowerCase() === String(status).toLowerCase());
    return '<span class="badge badge-' + (known ? known.toLowerCase() : 'neutral') + '">' + esc(status) + '</span>';
  }

  function factionChip(faction) {
    const known = FACTIONS.find((f) => f.toLowerCase() === String(faction).toLowerCase());
    return '<span class="faction' + (known ? ' faction-' + known.toLowerCase() : '') + '">' + esc(faction) + '</span>';
  }

  function asList(data, key) {
    if (Array.isArray(data)) return data;
    return data && Array.isArray(data[key]) ? data[key] : [];
  }

  function setLoading(button, on, label) {
    if (!button) return;
    if (on) {
      button.dataset.label = button.textContent;
      button.disabled = true;
      button.classList.add('is-loading');
      if (label) button.textContent = label;
    } else {
      button.disabled = false;
      button.classList.remove('is-loading');
      if (button.dataset.label !== undefined) {
        button.textContent = button.dataset.label;
        delete button.dataset.label;
      }
    }
  }

  function toast(message, type) {
    let root = document.getElementById('toast-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'toast-root';
      root.className = 'toast-root';
      root.setAttribute('role', 'status');
      root.setAttribute('aria-live', 'polite');
      document.body.appendChild(root);
    }
    const el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'info');
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  function skeletonRows(cols, rows) {
    let html = '';
    for (let r = 0; r < rows; r++) {
      html += '<tr aria-hidden="true">';
      for (let c = 0; c < cols; c++) html += '<td><span class="skeleton" style="width:' + (45 + ((r * 7 + c * 13) % 40)) + '%"></span></td>';
      html += '</tr>';
    }
    return html;
  }

  // A full-width table row for empty and error states. `actionHtml` must already be safe HTML.
  function messageRow(cols, title, text, actionHtml) {
    return '<tr><td colspan="' + cols + '"><div class="empty"><strong>' + esc(title) + '</strong>' + esc(text || '') + (actionHtml || '') + '</div></td></tr>';
  }

  function redirectToOAuth(path) {
    if (CONFIG.MOCK_MODE) {
      toast('Placeholder: this would send you to ' + path, 'info');
      return;
    }
    location.href = CONFIG.API_BASE + path;
  }

  function debounce(fn, ms) {
    let t;
    return function () { const args = arguments; clearTimeout(t); t = setTimeout(() => fn.apply(null, args), ms); };
  }

  /* ---------- Placeholder backend (MOCK_MODE only) ---------- */

  const DB_KEY = 'mock_db_v1';
  const SESSION_KEY = 'mock_session';

  function buildMockDb() {
    const names = ['ashen_vale', 'kestrel.9', 'mirelle', 'thornwick', 'duskrunner', 'lumen_ka', 'orrin', 'sable.fox', 'vexa_01', 'hollowpine', 'brindle', 'quillon', 'nyx.harrow', 'tamsin', 'corvid_', 'ember.jo', 'galewind', 'ruskin', 'ivy_marrow', 'dray', 'solenne', 'pike', 'wren.t', 'oberon'];
    const cycle = ['Pending', 'Pending', 'Interview', 'Accepted', 'Denied', 'Pending', 'Interview', 'Denied', 'Accepted', 'Pending'];
    const experience = [
      'Three years leading a raid team in another community. Comfortable running voice comms and onboarding new members.',
      'Mostly solo play so far, but I have moderated a 400-person server for two years.',
      'Played competitively in a regional league. I can teach positioning and cooldown management.',
      'New to this game, but a long-time player of similar titles. I learn quickly and ask good questions.',
      'Ran a small crafting guild and managed its resource bank and weekly events.',
      'Officer in two previous factions. I handle disputes calmly and keep good records.'
    ];
    const motivation = [
      'I want a faction that values steady teamwork over drama, and the way yours runs events is what drew me in.',
      'My friends already play here. I want to contribute rather than just show up for the big nights.',
      'I like the lore around this faction and would like to help new players find their feet.',
      'I am looking for a long-term home and happy to commit to the weekly schedule.',
      'I want to help organize events. I have built schedules and signup sheets before.',
      'A friend recommended the community. I want to be part of something with clear goals.'
    ];
    const applications = [];
    for (let i = 0; i < 34; i++) {
      const submitted = new Date(Date.now() - (i * 29 + 5) * 3600000).toISOString();
      applications.push({
        id: 134 - i,
        discordUsername: names[i % names.length] + (i >= names.length ? '_' + i : ''),
        discordId: '41' + String(1000000000000000 + i * 48271913377),
        faction: FACTIONS[(i * 3 + (i >> 2)) % 4],
        status: cycle[i % 10],
        submittedAt: submitted,
        experience: experience[i % experience.length],
        motivation: motivation[i % motivation.length],
        notes: i % 4 === 1 ? [{ id: 1, author: 'Reviewer', text: 'Strong voice on the intro call. Worth a second look.', createdAt: new Date(Date.now() - i * 20 * 60000).toISOString() }] : []
      });
    }
    const day = 86400000;
    return {
      me: { email: 'you@example.com', discordUsername: null },
      applications,
      forms: [
        { id: 'f1', name: 'Faction Recruitment 2026', formId: '1FAIpQLSe_PLACEHOLDER_a1b2c3', status: 'Active', connectedAt: new Date(Date.now() - 62 * day).toISOString() },
        { id: 'f2', name: 'Officer Applications', formId: '1FAIpQLSd_PLACEHOLDER_d4e5f6', status: 'Syncing', connectedAt: new Date(Date.now() - 9 * day).toISOString() },
        { id: 'f3', name: 'Beta Tester Signup', formId: '1FAIpQLSf_PLACEHOLDER_g7h8i9', status: 'Error', connectedAt: new Date(Date.now() - 140 * day).toISOString() }
      ]
    };
  }

  function loadDb() {
    try {
      const raw = sessionStorage.getItem(DB_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* fall through */ }
    return buildMockDb();
  }

  function saveDb(db) {
    try { sessionStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { /* storage unavailable */ }
  }

  function reply(status, data) {
    return new Response(data === null ? null : JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  }

  function mockFetch(method, url, body) {
    return new Promise((resolve) => setTimeout(() => resolve(mockRoute(method, url.split('?')[0], body || {})), CONFIG.MOCK_DELAY_MS));
  }

  function mockRoute(method, path, body) {
    const db = loadDb();
    const authed = sessionStorage.getItem(SESSION_KEY) === '1';
    const isPublic = path === ENDPOINTS.login || path === ENDPOINTS.register;

    if (!authed && !isPublic) return reply(401, { message: 'You are not signed in.' });

    if (method === 'POST' && path === ENDPOINTS.login) {
      if (!body.email || !body.password) return reply(400, { message: 'Enter your email and password.' });
      if (body.password === 'wrongpassword') return reply(401, { message: 'Incorrect email or password.' });
      db.me.email = body.email;
      saveDb(db);
      sessionStorage.setItem(SESSION_KEY, '1');
      return reply(200, { ok: true });
    }
    if (method === 'POST' && path === ENDPOINTS.register) {
      if (body.email === 'taken@example.com') return reply(409, { message: 'An account with that email already exists.' });
      return reply(201, { ok: true });
    }
    if (method === 'GET' && path === ENDPOINTS.me) return reply(200, db.me);
    if (method === 'POST' && (path === ENDPOINTS.logout || path === ENDPOINTS.logoutAll)) {
      sessionStorage.removeItem(SESSION_KEY);
      return reply(204, null);
    }
    if (method === 'POST' && path === ENDPOINTS.changePassword) {
      if (body.currentPassword === 'wrongpassword') return reply(400, { message: 'Your current password is incorrect.' });
      return reply(200, { ok: true });
    }
    if (method === 'GET' && path === ENDPOINTS.applications) return reply(200, db.applications);

    const detail = path.match(/^\/api\/applications\/(\d+)(?:\/(status|note))?$/);
    if (detail) {
      const app = db.applications.find((a) => String(a.id) === detail[1]);
      if (!app) return reply(404, { message: 'Application not found.' });
      if (method === 'GET' && !detail[2]) return reply(200, app);
      if (method === 'POST' && detail[2] === 'status') {
        if (STATUSES.indexOf(body.status) === -1) return reply(400, { message: 'Choose a valid status.' });
        app.status = body.status;
        saveDb(db);
        return reply(200, app);
      }
      if (method === 'POST' && detail[2] === 'note') {
        const text = String(body.note || '').trim();
        if (!text) return reply(400, { message: 'Write a note before adding it.' });
        const note = { id: Date.now(), author: 'You', text, createdAt: new Date().toISOString() };
        app.notes.push(note);
        saveDb(db);
        return reply(201, { note });
      }
    }

    if (method === 'GET' && path === ENDPOINTS.forms) return reply(200, db.forms);
    if (method === 'POST' && path === ENDPOINTS.formsConnect) {
      if (!body.formId) return reply(400, { message: 'Enter a valid Google Form link or ID.' });
      if (db.forms.some((f) => f.formId === body.formId)) return reply(409, { message: 'That form is already connected.' });
      const form = { id: 'f' + Date.now(), name: 'Untitled form', formId: body.formId, status: 'Syncing', connectedAt: new Date().toISOString() };
      db.forms.unshift(form);
      saveDb(db);
      return reply(201, form);
    }
    return reply(404, { message: 'Not found.' });
  }

  global.AppApi = {
    CONFIG, ENDPOINTS, STATUSES, FACTIONS, ApiError,
    apiGet, apiPost, apiPut, handleApiError,
    esc, formatDate, formatDateTime, statusBadge, factionChip, asList,
    setLoading, toast, skeletonRows, messageRow, redirectToOAuth, debounce
  };
  // Expose the helpers as plain globals for the page scripts.
  Object.assign(global, global.AppApi);
})(window);
