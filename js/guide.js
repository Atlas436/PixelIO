import { apps } from "./app-catalog.js";
import { iconButton } from "./assets.js";
import {
  getGuideAnswer,
  guideForApp,
  welcomeQuestions,
} from "./guide-knowledge.js";
export function createGuide() {
  const root = document.createElement("div");
  root.className = "guide-app";
  root.innerHTML = `<header class="guide-heading"><p class="eyebrow">PIXEL.OI / GUIA</p><h3>Um atalho para descobrir.</h3><p>Ajuda sobre a interface e o projeto, com respostas preparadas.</p><div class="guide-tools"></div></header><div class="guide-log" role="log" aria-label="Conversa com o guia" aria-live="polite" tabindex="0"></div><div class="guide-suggestions" aria-label="Perguntas sugeridas"></div><form class="guide-form"><label for="guide-question">Sua dúvida sobre o Pixel.OI</label><div><input id="guide-question" maxlength="500" autocomplete="off" placeholder="Como importo uma imagem?"></div></form><p class="guide-footnote">Conversa só nesta janela · sem API · sem ler suas notas ou arquivos</p>`;
  const log = root.querySelector(".guide-log"),
    suggestions = root.querySelector(".guide-suggestions"),
    tools = root.querySelector(".guide-tools"),
    form = root.querySelector("form"),
    input = root.querySelector("input");
  let lastUsed =
      document.querySelector("#workspace")?.dataset.guideContext || null,
    disposed = false;
  if (lastUsed === "assistant" || !apps.some((app) => app.id === lastUsed))
    lastUsed = null;
  const context = iconButton("arquivo", "Dica do último app", () => {
    const reply = guideForApp(lastUsed);
    if (reply)
      respond(`Como uso ${apps.find((a) => a.id === lastUsed)?.name}?`, reply);
  });
  context.classList.add("guide-context");
  tools.append(context);
  const clear = iconButton("excluir", "Limpar conversa", () => {
    log.replaceChildren();
    welcome();
  });
  clear.append(document.createTextNode("Limpar conversa"));
  tools.append(clear);
  function updateContext() {
    context.disabled = !lastUsed;
    context.querySelector(".guide-context-label")?.remove();
    const label = document.createElement("span");
    label.className = "guide-context-label";
    label.textContent = lastUsed
      ? `Dicas: ${apps.find((a) => a.id === lastUsed)?.name}`
      : "Abra um app para ver dicas";
    context.append(label);
  }
  function usedApp(event) {
    if (
      event.detail?.id !== "assistant" &&
      apps.some((a) => a.id === event.detail?.id)
    ) {
      lastUsed = event.detail.id;
      updateContext();
    }
  }
  document.addEventListener("pixel:app-focus", usedApp);
  updateContext();
  function choices(questions) {
    suggestions.replaceChildren();
    for (const question of questions) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = question;
      button.onclick = () => respond(question);
      suggestions.append(button);
    }
  }
  function add(text, kind, title = null, appIds = []) {
    const card = document.createElement("section");
    card.className = `guide-message guide-${kind}`;
    const heading = document.createElement("h4");
    heading.textContent =
      title || (kind === "question" ? "Você" : "Guia Pixel.OI");
    const p = document.createElement("p");
    p.textContent = text;
    card.append(heading, p);
    if (appIds.length) {
      const actions = document.createElement("div");
      actions.className = "guide-actions";
      for (const id of appIds) {
        const app = apps.find((a) => a.id === id);
        if (!app) continue;
        const b = iconButton("seta", `Abrir ${app.name}`, () =>
          root.dispatchEvent(
            new CustomEvent("pixel:open-app", {
              bubbles: true,
              detail: { id },
            }),
          ),
        );
        b.append(document.createTextNode(`Abrir ${app.name}`));
        actions.append(b);
      }
      card.append(actions);
    }
    log.append(card);
    while (log.children.length > 60) log.firstElementChild.remove();
    log.scrollTop = log.scrollHeight;
  }
  function welcome() {
    add(
      "Sou seu guia do Pixel.OI. Posso explicar os aplicativos, ensinar os comandos Pixel e apresentar o projeto. Escolha uma pergunta ou conte sua dúvida.",
      "answer",
    );
    choices(welcomeQuestions);
  }
  function respond(question, provided) {
    if (disposed) return;
    const text = question.trim().slice(0, 500);
    if (!text) return;
    input.value = "";
    const reply = provided || getGuideAnswer(text, lastUsed);
    add(text, "question");
    add(reply.text, "answer", reply.title, reply.appIds);
    choices(reply.suggestions?.length ? reply.suggestions : welcomeQuestions);
  }
  const submit = iconButton("seta", "Enviar pergunta");
  submit.type = "submit";
  form.querySelector("div").append(submit);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    respond(input.value);
    input.focus();
  });
  root.dispose = () => {
    disposed = true;
    document.removeEventListener("pixel:app-focus", usedApp);
  };
  welcome();
  return root;
}
