// File: theme/js/auth.js
// Handles login POST -> stores token, user and role in localStorage
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  const userInput = document.getElementById("user"); // email input (id="user" in your login.html)
  const passInput = document.getElementById("password"); // password input (id="password")
  const loginAlert = document.getElementById("loginAlert");
  const loginBtn = document.getElementById("loginBtn");
  const API_BASE = "http://127.0.0.1:8000/api";
<<<<<<< HEAD


  // --- Minimal Forgot Password UX (non-invasive) ---
// Uses prompt() to avoid changing UI; you can later replace with modal/form.
(function () {
  const API_BASE = "http://127.0.0.1:8000/api"; // adjust if your API runs on another host/port

  const forgotLink = document.getElementById('forgotLink');
  if (!forgotLink) return;

  forgotLink.addEventListener('click', async function (e) {
    e.preventDefault();
    const email = prompt("Enter the email for your account to receive the reset link:");
    if (!email) return;
    try {
      const res = await fetch(API_BASE + '/forgot-password', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to request reset link.');
      alert(data.message || 'Reset link sent. Check your email.');
    } catch (err) {
      console.error('Forgot password error', err);
      alert(err.message || 'Could not send reset link. Check console for details.');
    }
  });
})();
=======
>>>>>>> 3bc2bcadb802b28d94263bd487b335f4a2276a1c

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.innerHTML = "Authenticating…";
    }
    if (loginAlert) loginAlert.classList.add("d-none");

    try {
      const email = userInput ? userInput.value.trim() : "";
      const password = passInput ? passInput.value : "";

      const res = await fetch(API_BASE + "/login", {
        method: "POST",
        headers: {
<<<<<<< HEAD
          "Accept": "application/json",
          "Content-Type": "application/json"
=======
          Accept: "application/json",
          "Content-Type": "application/json",
>>>>>>> 3bc2bcadb802b28d94263bd487b335f4a2276a1c
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.token) {
        // Save token and user info (role) so other pages can check it
        localStorage.setItem("token", data.token);
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
          if (data.user.role) {
            localStorage.setItem("role", data.user.role);
          }
        }
<<<<<<< HEAD

        // Also set a session cookie mirror for compatibility & mark loggedIn
try {
  document.cookie = 'sms_token=' + encodeURIComponent(data.token) + '; path=/;';
  document.cookie = 'sms_user=' + encodeURIComponent(JSON.stringify(data.user || {})) + '; path=/;';
} catch (e) { /* ignore cookie failures on restrictive browsers */ }
localStorage.setItem('loggedIn', 'true');

=======
        if (data.user.id) {
          localStorage.setItem("user_id", data.user.id);
        }

        // Also set a session cookie mirror for compatibility & mark loggedIn
        try {
          document.cookie =
            "sms_token=" + encodeURIComponent(data.token) + "; path=/;";
          document.cookie =
            "sms_user=" +
            encodeURIComponent(JSON.stringify(data.user || {})) +
            "; path=/;";
        } catch (e) {
          /* ignore cookie failures on restrictive browsers */
        }
        localStorage.setItem("loggedIn", "true");
>>>>>>> 3bc2bcadb802b28d94263bd487b335f4a2276a1c

        // If role was not present in response for some reason, try to fetch /api/user
        if (!localStorage.getItem("role")) {
          try {
            const r2 = await fetch(API_BASE + "/user", {
<<<<<<< HEAD
              headers: { "Authorization": "Bearer " + data.token, "Accept": "application/json" }
=======
              headers: {
                Authorization: "Bearer " + data.token,
                Accept: "application/json",
              },
>>>>>>> 3bc2bcadb802b28d94263bd487b335f4a2276a1c
            });
            if (r2.ok) {
              const me = await r2.json();
              if (me && me.role) localStorage.setItem("role", me.role);
<<<<<<< HEAD
              if (!localStorage.getItem("user")) localStorage.setItem("user", JSON.stringify(me));
=======
              if (!localStorage.getItem("user"))
                localStorage.setItem("user", JSON.stringify(me));
>>>>>>> 3bc2bcadb802b28d94263bd487b335f4a2276a1c
            }
          } catch (err) {
            // ignore - we'll still redirect to index or admin depending on saved role
          }
        }

        // Redirect based on role (admin -> admin.html, else -> index.html)
        if (localStorage.getItem("role") === "admin") {
          window.location.href = "admin.html";
        } else {
          window.location.href = "index.html";
        }
        return;
      }

      // Show server error or message
      if (loginAlert) {
<<<<<<< HEAD
        loginAlert.textContent = data.message || data.error || "Failed to login.";
=======
        loginAlert.textContent =
          data.message || data.error || "Failed to login.";
>>>>>>> 3bc2bcadb802b28d94263bd487b335f4a2276a1c
        loginAlert.classList.remove("d-none");
      }
    } catch (err) {
      console.error("Login error", err);
      if (loginAlert) {
        loginAlert.textContent = "Server not reachable.";
        loginAlert.classList.remove("d-none");
      }
    } finally {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerHTML = "Login";
      }
    }
  });
});
