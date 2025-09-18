// File: theme/js/auth.js
// Handles login POST -> stores token, user and role in localStorage
// localStorage.setItem('token', data.token);//update
// localStorage.setItem('user_id', data.user.id);
// localStorage.setItem('loggedIn', 'true');

// File: theme/js/auth.js
// Replaced with a working login flow that requests a JWT token from the Laravel API
// and stores it in localStorage so the rest of the frontend (guard.js / booking) works.
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  const userInput = document.getElementById("user");       // email input (id="user" in your login.html)
  const passInput = document.getElementById("password");   // password input (id="password")
  const loginAlert = document.getElementById("loginAlert");
  const loginBtn = document.getElementById("loginBtn");
  const API_BASE = "http://127.0.0.1:8000/api"; // change if your backend runs elsewhere

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!userInput || !passInput) return;

    const email = userInput.value.trim();
    const password = passInput.value;
    if (!email || !password) {
      if (loginAlert) {
        loginAlert.textContent = "Please enter email and password.";
        loginAlert.classList.remove("d-none");
      }
      return;
    }

    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.innerText = "Logging in...";
    }

    try {
      const res = await fetch(API_BASE + "/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data.error || data.message || "Login failed";
        if (loginAlert) {
          loginAlert.textContent = msg;
          loginAlert.classList.remove("d-none");
        } else {
          alert(msg);
        }
        return;
      }

      // Expecting response: { user: {...}, token: "..." }
      if (!data.token) {
        if (loginAlert) {
          loginAlert.textContent = "No token returned from server.";
          loginAlert.classList.remove("d-none");
        } else {
          alert("No token returned from server.");
        }
        return;
      }

      // Save token and user info to localStorage (frontend expects these keys)
      localStorage.setItem("token", data.token);
      try { localStorage.setItem("user_id", data.user?.id ?? ""); } catch(e){}
      try { localStorage.setItem("role", data.user?.role ?? ""); } catch(e){}

      // redirect to homepage (adjust target as your app expects)
      window.location.href = "index.html";
    } catch (err) {
      console.error("Login error", err);
      if (loginAlert) {
        loginAlert.textContent = "Server not reachable.";
        loginAlert.classList.remove("d-none");
      } else {
        alert("Server not reachable.");
      }
    } finally {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerText = "Login";
      }
    }
  });
});
