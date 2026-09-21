document.addEventListener("DOMContentLoaded", function () {
  const navbarRight = document.querySelector(".navbar-nav.ms-auto, .navbar-collapse, .navbar-nav");
  if (navbarRight && !document.getElementById("theme-toggle-switch")) {
    const toggleContainer = document.createElement("div");
    toggleContainer.id = "theme-toggle-switch";
    toggleContainer.className = "theme-switch-wrapper ms-auto me-2";
    toggleContainer.innerHTML = `
      <button id="theme-toggle-btn" class="theme-toggle-pill" aria-label="Cambiar Tema Dark/Light" title="Toggle Dark / Light Theme">
        <span class="theme-icon-dark">🌙</span>
        <span class="theme-toggle-slider"></span>
        <span class="theme-icon-light">☀️</span>
      </button>
    `;
    navbarRight.appendChild(toggleContainer);

    const savedTheme = localStorage.getItem("sopq-theme") || "dark";
    applyTheme(savedTheme);

    document.getElementById("theme-toggle-btn").addEventListener("click", function () {
      const current = document.documentElement.getAttribute("data-theme") || "dark";
      const nextTheme = current === "dark" ? "light" : "dark";
      applyTheme(nextTheme);
    });
  }
});

function applyTheme(theme) {
  // Enforce binary dark/light theme choice
  const targetTheme = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", targetTheme);
  localStorage.setItem("sopq-theme", targetTheme);

  const btn = document.getElementById("theme-toggle-btn");
  if (btn) {
    if (targetTheme === "light") {
      btn.classList.add("is-light");
    } else {
      btn.classList.remove("is-light");
    }
  }
}
