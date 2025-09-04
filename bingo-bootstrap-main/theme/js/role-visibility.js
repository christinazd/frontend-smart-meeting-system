// File: theme/js/role-visibility.js
(function () {
  const ADMIN_HREF = "admin.html";
  const token = localStorage.getItem("token");
  let role = localStorage.getItem("role");

  function hideAdminLink(currentRole) {
    const adminAnchor = document.querySelector('a[href="' + ADMIN_HREF + '"]');
    if (!adminAnchor) return;
    const li = adminAnchor.closest("li") || adminAnchor;
    if (currentRole === "admin") {
      li.style.display = ""; // keep visible
    } else {
      li.style.display = "none"; // hide for non-admins
    }
  }

  async function fetchRoleFromApi(bearer) {
    try {
      const r = await fetch(window.location.origin + "/api/user", {
        headers: { "Authorization": "Bearer " + bearer, "Accept": "application/json" }
      });
      if (!r.ok) return null;
      const j = await r.json();
      return j && j.role ? j.role : null;
    } catch (e) {
      return null;
    }
  }

  (async function init() {
    // If role is not known but token present, try to get it from /api/user
    if (!role && token) {
      const fetched = await fetchRoleFromApi(token);
      if (fetched) {
        role = fetched;
        localStorage.setItem("role", role);
      }
    }

    // Apply visibility on navbar
    hideAdminLink(role);

    // If the current file is admin.html, enforce server-side + local check
    const page = window.location.pathname.split("/").pop();
    if (page === ADMIN_HREF) {
      if (!token) {
        // not logged in -> go to login
        window.location.href = "login.html";
        return;
      }
      if (role !== "admin") {
        // logged-in but not admin -> redirect to homepage (admin cannot view)
        window.location.href = "index.html";
        return;
      }
      // If role === 'admin' we allow the admin page to load (server middleware will still protect /api endpoints)
    }
  })();
})();
