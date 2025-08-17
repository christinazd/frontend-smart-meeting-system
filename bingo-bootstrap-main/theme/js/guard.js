// File: js/guard.js (fixed)
(function () {
  const isLogin = /login\.html$/.test(window.location.pathname);
  const token = localStorage.getItem('token');
  if (!token && !isLogin) {
    window.location.replace('login.html');
  }
})();
