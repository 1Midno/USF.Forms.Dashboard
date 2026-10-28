/* Application Dashboard — authentication, validation, and the shared navigation shell. */
(function () {
  'use strict';

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const MIN_PASSWORD = 12;
  const page = document.body.dataset.page;

  /* ---------- Shared form helpers (also used by settings.js) ---------- */

  function setFieldError(input, message) {
    const errorEl = document.getElementById(input.id + '-error');
    if (errorEl) errorEl.textContent = message || '';
    if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    return !message;
  }

  function showAlert(el, message, type) {
    if (!el) return;
    el.className = 'alert alert-' + (type || 'error');
    el.textContent = message;
    el.hidden = false;
  }

  const validators = {
    email: (v) => !v ? 'Enter your email address.' : (!EMAIL_RE.test(v) ? 'Enter a valid email address, like name@example.com.' : ''),
    password: (v) => !v ? 'Enter a password.' : '',
    newPassword: (v) => v.length < MIN_PASSWORD ? 'Use at least ' + MIN_PASSWORD + ' characters (' + v.length + ' so far).' : '',
    confirm: (v, other) => !v ? 'Re-enter your password.' : (v !== other ? 'The passwords do not match.' : '')
  };

  window.AuthUtils = { setFieldError, showAlert, validators, MIN_PASSWORD };

  /* ---------- Login ---------- */

  function initLogin() {
    const form = document.getElementById('login-form');
    const alertEl = document.getElementById('form-alert');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const submit = document.getElementById('login-submit');
    const params = new URLSearchParams(location.search);

    if (params.get('registered') === '1') showAlert(alertEl, 'Account created. Log in to continue.', 'success');
    if (CONFIG.MOCK_MODE) {
      const demo = document.getElementById('demo-note');
      demo.hidden = false;
    }

    email.addEventListener('blur', () => setFieldError(email, validators.email(email.value.trim())));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertEl.hidden = true;
      const okEmail = setFieldError(email, validators.email(email.value.trim()));
      const okPass = setFieldError(password, validators.password(password.value));
      if (!okEmail || !okPass) return;

      setLoading(submit, true, 'Logging in…');
      try {
        await apiPost(ENDPOINTS.login, { email: email.value.trim(), password: password.value });
        location.href = 'dashboard.html';
      } catch (err) {
        setLoading(submit, false);
        showAlert(alertEl, err.status === 401 ? 'Incorrect email or password.' : err.message);
      }
    });
    document.getElementById('discord-login').addEventListener('click', () => redirectToOAuth(ENDPOINTS.discordLogin));
  }

  /* ---------- Register ---------- */

  function initRegister() {
    const form = document.getElementById('register-form');
    const alertEl = document.getElementById('form-alert');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const confirm = document.getElementById('confirm');
    const submit = document.getElementById('register-submit');

    const checkEmail = () => setFieldError(email, validators.email(email.value.trim()));
    const checkPassword = () => setFieldError(password, validators.newPassword(password.value));
    const checkConfirm = () => setFieldError(confirm, validators.confirm(confirm.value, password.value));

    email.addEventListener('blur', checkEmail);
    password.addEventListener('input', () => { if (password.value) checkPassword(); if (confirm.value) checkConfirm(); });
    confirm.addEventListener('input', checkConfirm);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertEl.hidden = true;
      const results = [checkEmail(), checkPassword(), checkConfirm()];
      if (results.indexOf(false) !== -1) return;

      setLoading(submit, true, 'Creating account…');
      try {
        await apiPost(ENDPOINTS.register, { email: email.value.trim(), password: password.value });
        location.href = 'login.html?registered=1';
      } catch (err) {
        setLoading(submit, false);
        showAlert(alertEl, err.message);
      }
    });
  }

  /* ---------- Protected pages: session check + navigation shell ---------- */

  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    applications: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    forms: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    logout: '<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>'
  };
  const NAV = [
    { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html' },
    { id: 'applications', label: 'Applications', href: 'applications.html' },
    { id: 'forms', label: 'Connected Forms', href: 'forms.html' },
    { id: 'settings', label: 'Settings', href: 'settings.html' }
  ];
  const BRAND = '<span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>Application Dashboard';
  const icon = (name) => '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';

  function renderShell(user) {
    const active = document.body.dataset.nav || page;
    const who = (user && (user.email || user.discordUsername)) || 'your account';
    document.getElementById('sidebar').innerHTML =
      '<a class="brand" href="dashboard.html">' + BRAND + '</a>' +
      '<nav class="nav" aria-label="Main">' +
      NAV.map((i) => '<a href="' + i.href + '"' + (i.id === active ? ' aria-current="page"' : '') + '>' + icon(i.id) + '<span>' + i.label + '</span></a>').join('') +
      '</nav>' +
      '<div class="sidebar-foot"><div class="user-chip"><span class="muted">Signed in as</span><strong title="' + esc(who) + '">' + esc(who) + '</strong></div>' +
      '<div class="nav"><button type="button" id="logout-btn">' + icon('logout') + '<span>Logout</span></button></div></div>';
    document.getElementById('topbar').innerHTML =
      '<button type="button" class="icon-btn" id="menu-btn" aria-label="Open navigation" aria-expanded="false" aria-controls="sidebar">' + icon('menu') + '</button>' +
      '<a class="brand" href="dashboard.html">' + BRAND + '</a>';

    const menuBtn = document.getElementById('menu-btn');
    const setNav = (open) => {
      document.body.classList.toggle('nav-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    };
    menuBtn.addEventListener('click', () => setNav(!document.body.classList.contains('nav-open')));
    document.getElementById('backdrop').addEventListener('click', () => setNav(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setNav(false); });
    document.querySelectorAll('#sidebar a').forEach((a) => a.addEventListener('click', () => setNav(false)));

    document.getElementById('logout-btn').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        await apiPost(ENDPOINTS.logout);
        location.href = 'login.html';
      } catch (err) {
        btn.disabled = false;
        toast(err.message, 'error');
      }
    });
  }

  function showSessionError(err) {
    const main = document.getElementById('main');
    main.innerHTML = '<div class="card"><div class="empty"><strong>Could not check your session</strong>' + esc(err.message) +
      '<br><button type="button" class="btn" id="retry-session">Try again</button></div></div>';
    document.getElementById('retry-session').addEventListener('click', () => location.reload());
  }

  // Placeholder session check: GET /api/me. A 401 sends the visitor to the login page.
  async function requireAuth() {
    try {
      const user = await apiGet(ENDPOINTS.me);
      renderShell(user);
      return user;
    } catch (err) {
      if (err.status === 401) {
        location.replace('login.html');
      } else {
        showSessionError(err);
      }
      return new Promise(() => {}); // never resolves: page scripts do not run
    }
  }

  if (document.body.hasAttribute('data-protected')) {
    window.authReady = requireAuth();
  } else if (page === 'login') {
    initLogin();
  } else if (page === 'register') {
    initRegister();
  }
})();
