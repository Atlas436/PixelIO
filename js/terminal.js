import { apps } from "./app-catalog.js";
import { commands, projectVersion } from "./project-info.js";
import { parsePixel, isPendingApp } from "./pixel-language.js";
import { iconButton } from "./assets.js";

export function createTerminal() {
  const root = document.createElement("div");
  root.className = "terminal-app";
  root.innerHTML = `<header class="terminal-heading"><span>PIXEL.OI / TERMINAL</span><span class="terminal-version"></span></header><div class="terminal-output" role="log" aria-label="Saída do Terminal" aria-live="polite" tabindex="0"></div><form class="terminal-form"><label for="pixel-command">pixel:~ &gt;</label><input id="pixel-command" aria-label="Comando Pixel" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="300" placeholder="pixel ajuda"></form><p class="terminal-hint">Enter executa · ↑ ↓ histórico · pixel ajuda mostra os códigos</p>`;
  const output = root.querySelector(".terminal-output"),
    input = root.querySelector("input"),
    form = root.querySelector("form");
  root.querySelector(".terminal-version").textContent = `v${projectVersion}`;
  const submit = iconButton("seta", "Executar comando");
  submit.type = "submit";
  form.append(submit);
  const history = [];
  let cursor = 0,
    draft = "";
  function line(text, kind = "response") {
    const p = document.createElement("p");
    p.className = `terminal-${kind}`;
    p.textContent = text;
    output.append(p);
    while (output.children.length > 150) output.firstElementChild.remove();
    output.scrollTop = output.scrollHeight;
  }
  function help() {
    line(
      commands
        .map(
          (c) =>
            `${c.syntax}${c.example ? ` (ex.: ${c.example})` : ""}\n  ${c.description}`,
        )
        .join("\n\n"),
    );
  }
  function open(id) {
    const app = apps.find((app) => app.id === id);
    line(
      `Abrindo ${app.name}${isPendingApp(app) ? " — em desenvolvimento" : ""}…`,
    );
    root.dispatchEvent(
      new CustomEvent("pixel:open-app", { bubbles: true, detail: { id } }),
    );
  }
  line(
    `Bem-vinda(o) ao Terminal Pixel.OI v${projectVersion}.\nDigite pixel ajuda para começar. Os comandos controlam os apps desta interface.`,
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const raw = input.value.trim();
    if (!raw) return;
    if (history.at(-1) !== raw) history.push(raw);
    if (history.length > 100) history.shift();
    cursor = history.length;
    draft = "";
    input.value = "";
    const command = parsePixel(raw);
    if (command.type === "clear") {
      output.replaceChildren();
      input.focus();
      return;
    }
    line(`pixel:~ > ${raw}`, "command");
    switch (command.type) {
      case "help":
        help();
        break;
      case "list":
        line(
          apps
            .map(
              (app) =>
                `${app.name}${isPendingApp(app) ? " — em desenvolvimento" : ""}`,
            )
            .join("\n"),
        );
        break;
      case "version":
        line(`Pixel.OI — versão ${projectVersion}`);
        break;
      case "about":
        open("about");
        break;
      case "open":
        open(command.id);
        break;
      case "error":
        line(command.message, "error");
        break;
    }
    // Abrir outro app deve manter o foco nessa nova janela.
    if (!["open", "about"].includes(command.type)) input.focus();
  });
  input.addEventListener("keydown", (event) => {
    if (!["ArrowUp", "ArrowDown"].includes(event.key) || !history.length)
      return;
    event.preventDefault();
    if (cursor === history.length) draft = input.value;
    cursor = Math.max(
      0,
      Math.min(history.length, cursor + (event.key === "ArrowUp" ? -1 : 1)),
    );
    input.value = cursor === history.length ? draft : history[cursor];
    input.setSelectionRange(input.value.length, input.value.length);
  });
  let disposed = false;
  queueMicrotask(() => {
    if (!disposed && root.isConnected) input.focus();
  });
  root.dispose = () => {
    disposed = true;
  };
  return root;
}
