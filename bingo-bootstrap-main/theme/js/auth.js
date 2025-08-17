document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const userInput = document.getElementById("user");
  const passInput = document.getElementById("password");
  const loginAlert = document.getElementById("loginAlert");
  const loginBtn = document.getElementById("loginBtn");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Disable button while logging in
    loginBtn.disabled = true;
    loginBtn.innerHTML = "Authenticating…";

    try {
      const response = await fetch("http://127.0.0.1:8000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          email: userInput.value,
          password: passInput.value
        })
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // ✅ Save session token
        localStorage.setItem("token", data.token);

        // Redirect to index.html
        window.location.href = "index.html";
      } else {
        // Show error message
        loginAlert.textContent = data.message || "Failed to login.";
        loginAlert.classList.remove("d-none");
      }
    } catch (error) {
      console.error("Login error:", error);
      loginAlert.textContent = "Server not reachable.";
      loginAlert.classList.remove("d-none");
    } finally {
      loginBtn.disabled = false;
      loginBtn.innerHTML = "Login";
    }
  });
});
