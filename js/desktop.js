import { apps, placeholder } from "./apps.js";

export function setupDesktop(open) {
  const desktop = document.querySelector("#desktop");
  function select(button) {
    desktop.querySelectorAll("button").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
  }
  for (const app of apps) {
    const button = document.createElement("button");
    button.className = "desktop-app";
    button.dataset.app = app.id;
    button.title = `${app.name} — clique para abrir`;
    button.setAttribute("aria-pressed", "false");
    const name = document.createElement("span");
    name.className = "app-name";
    name.textContent = app.name;
    button.append(placeholder(app), name);
    // O click nativo atende mouse, toque, Enter e Espaço sem abrir duas vezes.
    button.addEventListener("click", () => {
      select(button);
      open(app);
    });
    desktop.append(button);
  }
  document.querySelector("#workspace").addEventListener("click", (event) => {
    if (event.target.id === "workspace" || event.target === desktop)
      select(null);
  });
  return () => select(null);
}
