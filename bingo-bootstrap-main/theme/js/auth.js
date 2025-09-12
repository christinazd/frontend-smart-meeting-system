// File: theme/js/auth.js
// Handles login POST -> stores token, user and role in localStorage
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  const userInput = document.getElementById("user");       // email input (id="user" in your login.html)
  const passInput = document.getElementById("password");   // password input (id="password")
  const loginAlert = document.getElementById("loginAlert");
  const loginBtn = document.getElementById("loginBtn");
  const API_BASE = "http://127.0.0.1:8000/api";

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
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
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

        // Also set a session cookie mirror for compatibility & mark loggedIn
try {
  document.cookie = 'sms_token=' + encodeURIComponent(data.token) + '; path=/;';
  document.cookie = 'sms_user=' + encodeURIComponent(JSON.stringify(data.user || {})) + '; path=/;';
} catch (e) { /* ignore cookie failures on restrictive browsers */ }
localStorage.setItem('loggedIn', 'true');


        // If role was not present in response for some reason, try to fetch /api/user
        if (!localStorage.getItem("role")) {
          try {
            const r2 = await fetch(API_BASE + "/user", {
              headers: { "Authorization": "Bearer " + data.token, "Accept": "application/json" }
            });
            if (r2.ok) {
              const me = await r2.json();
              if (me && me.role) localStorage.setItem("role", me.role);
              if (!localStorage.getItem("user")) localStorage.setItem("user", JSON.stringify(me));
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
        loginAlert.textContent = data.message || data.error || "Failed to login.";
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
