document.addEventListener("DOMContentLoaded", function () {
  // Inject theme picker button into navbar right if not already present
  const navbarRight = document.querySelector(".navbar-nav.ms-auto, .navbar-collapse");
  if (navbarRight && !document.getElementById("theme-picker")) {
    const picker = document.createElement("div");
    picker.id = "theme-picker";
    picker.className = "theme-picker-widget ms-3";
    picker.innerHTML = `
      <button class="theme-btn" data-theme="dark" title="Modo Escuro Azul Slate">🌙 Escuro</button>
      <button class="theme-btn" data-theme="light" title="Modo Claro Perla">☀️ Claro</button>
      <button class="theme-btn" data-theme="nude" title="Modo Cálido Arena">🎨 Cálido</button>
    `;
    navbarRight.appendChild(picker);

    const savedTheme = localStorage.getItem("sopq-theme") || "dark";
    setTheme(savedTheme);

    picker.querySelectorAll(".theme-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const theme = this.getAttribute("data-theme");
        setTheme(theme);
      });
    });
  }
});

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("sopq-theme", theme);

  document.querySelectorAll(".theme-btn").forEach((btn) => {
    if (btn.getAttribute("data-theme") === theme) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}
