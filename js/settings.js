/* Account settings. */
(function () {
  'use strict';
  const { setFieldError, showAlert, validators } = AuthUtils;

  authReady.then((user) => {
    document.getElementById('acct-email').textContent = (user && user.email) || 'Not set';
    document.getElementById('acct-discord').textContent = (user && user.discordUsername) || 'Not linked';

    document.getElementById('link-discord').addEventListener('click', () => redirectToOAuth(ENDPOINTS.discordLink));

    const form = document.getElementById('password-form');
    const alertEl = document.getElementById('form-alert');
    const current = document.getElementById('current-password');
    const next = document.getElementById('new-password');
    const confirm = document.getElementById('confirm-password');
    const submit = document.getElementById('password-submit');

    const checkCurrent = () => setFieldError(current, validators.password(current.value).replace('a password', 'your current password'));
    const checkNext = () => setFieldError(next, validators.newPassword(next.value));
    const checkConfirm = () => setFieldError(confirm, validators.confirm(confirm.value, next.value));
    next.addEventListener('input', () => { if (next.value) checkNext(); if (confirm.value) checkConfirm(); });
    confirm.addEventListener('input', checkConfirm);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertEl.hidden = true;
      if ([checkCurrent(), checkNext(), checkConfirm()].indexOf(false) !== -1) return;
      setLoading(submit, true, 'Updating…');
      try {
        await apiPost(ENDPOINTS.changePassword, { currentPassword: current.value, newPassword: next.value });
        form.reset();
        showAlert(alertEl, 'Password updated.', 'success');
      } catch (err) {
        showAlert(alertEl, err.message);
      } finally {
        setLoading(submit, false);
      }
    });

    document.getElementById('logout-all').addEventListener('click', async (e) => {
      if (!window.confirm('Log out of every device, including this one?')) return;
      const btn = e.currentTarget;
      setLoading(btn, true, 'Logging out…');
      try {
        await apiPost(ENDPOINTS.logoutAll);
        location.href = 'login.html';
      } catch (err) {
        setLoading(btn, false);
        toast(err.message, 'error');
      }
    });
  });
})();
