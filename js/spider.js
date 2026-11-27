import { SpiderGame, isSequence, suits, difficulties } from "./spider-rules.js";
import { iconButton } from "./assets.js";
import { setupSpiderDrag } from "./spider-drag.js";
import { notifyApp } from "./notifications.js";
import { cardImage, cardLabel, back } from "./spider-cards.js";

// A partida permanece na memória ao fechar/reabrir a janela, até recarregar a página.
let game;
function createTable(onHome) {
  let selection = null;
  let hintTarget = null;
  let wasWon = game.won;
  const root = document.createElement("div");
  root.className = "spider-app";
  root.innerHTML = `
    <header class="spider-header">
      <div><p class="eyebrow">PIXEL.OI / JOGOS</p><h3>Spider <span data-difficulty></span></h3></div>
      <div class="spider-actions"></div>
    </header>
    <div class="spider-stats" aria-label="Estatísticas da partida">
      <span>Sequências <strong data-stat="completed"></strong></span>
      <span>Jogadas <strong data-stat="moves"></strong></span>
      <span>Pontos <strong data-stat="score"></strong></span>
    </div>
    <div class="spider-scroll" tabindex="0" aria-label="Mesa de Spider. Role horizontalmente para ver as dez colunas em telas pequenas.">
      <div class="spider-table">
        <div class="spider-top"><div class="spider-foundations" aria-label="Sequências concluídas"></div><button class="spider-stock" type="button"></button></div>
        <div class="spider-columns"></div>
      </div>
    </div>
    <p class="spider-message" role="status" aria-live="polite"></p>
    <details class="spider-help"><summary>Como jogar</summary>
      <p>Organize as cartas de Rei até Ás. Arraste uma carta ou uma sequência em ordem; também pode clicar ou tocar na carta e depois na coluna de destino. Enter ou Espaço seleciona uma carta; os números das colunas são botões de destino.</p>
      <p>Uma carta vai sobre outra de valor imediatamente maior. Uma sequência só se move junta quando todas as cartas são do mesmo naipe e estão em ordem. Sobre outra coluna, o naipe pode ser diferente, desde que o valor seja um acima. Qualquer sequência válida pode ir para uma coluna vazia. Complete oito sequências de Rei a Ás do mesmo naipe para vencer. As cartas cobertas viram automaticamente.</p>
      <p>O monte distribui uma carta em cada coluna, até cinco vezes. Preencha as colunas vazias antes de distribuir. Desfazer reverte uma jogada inteira, inclusive cartas viradas e sequências retiradas. Dica sugere uma jogada, sem garantir a solução.</p>
      <p>Sua arte original está nas cartas. O 9 de espadas usa uma imagem provisória até recebermos o PNG. A partida fica nesta sessão ao fechar a janela; recarregar a página inicia outra.</p>
    </details>
    <section class="spider-confirm" hidden role="dialog" aria-labelledby="spider-confirm-title">
      <div><h3 id="spider-confirm-title">Começar de novo?</h3><p>A partida atual será substituída por um novo embaralhamento.</p><div class="spider-confirm-actions"><button type="button" data-confirm="no">Continuar jogando</button><button type="button" data-confirm="yes">Nova partida</button></div></div>
    </section>`;

  const actions = root.querySelector(".spider-actions");
  function action(name, label, onClick) {
    const button = iconButton(name, label, onClick);
    button.append(document.createTextNode(label));
    actions.append(button);
    return button;
  }
  const newButton = action("atualizar", "Novo jogo", () => {
    dialog.hidden = false;
    content.inert = true;
    root.querySelector('[data-confirm="no"]').focus();
  });
  const undoButton = action("seta", "Desfazer", () => {
    if (!game.undo()) return;
    selection = hintTarget = null;
    render("Jogada desfeita.");
  });
  const hintButton = action("informacoes", "Dica", () => {
    const hint = game.hint();
    if (hint) {
      selection = { from: hint.from, index: hint.index };
      hintTarget = hint.to;
      render(
        `Dica: mova ${cardLabel(game.columns[hint.from][hint.index])} da coluna ${hint.from + 1} para a coluna ${hint.to + 1}.`,
      );
    } else {
      selection = hintTarget = null;
      render(
        !game.dealError
          ? "Nenhuma transferência útil encontrada. Você pode distribuir uma nova fileira."
          : "Nenhuma transferência útil encontrada. Tente desfazer jogadas ou começar uma nova partida.",
      );
    }
  });
  action("menu", "Início", () => {
    drag.cancel();
    onHome();
  });
  const dialog = root.querySelector(".spider-confirm");
  // O conteúdo atrás da confirmação fica inerte; ela não bloqueia o resto do desktop.
  const content = document.createElement("div");
  content.className = "spider-content";
  while (root.firstChild !== dialog) content.append(root.firstChild);
  root.prepend(content);

  function closeConfirmation() {
    dialog.hidden = true;
    content.inert = false;
    newButton.focus();
  }
  root
    .querySelector('[data-confirm="no"]')
    .addEventListener("click", closeConfirmation);
  root.querySelector('[data-confirm="yes"]').addEventListener("click", () => {
    game.newGame();
    selection = hintTarget = null;
    closeConfirmation();
    render("Nova partida. Boa sorte!");
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      closeConfirmation();
    }
    if (event.key === "Tab") {
      event.preventDefault();
      const buttons = [...dialog.querySelectorAll("button")];
      buttons[document.activeElement === buttons[0] ? 1 : 0].focus();
    }
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dialog.hidden) {
      selection = hintTarget = null;
      render("Seleção cancelada.");
    }
  });

  const status = root.querySelector(".spider-message");
  const columns = root.querySelector(".spider-columns");
  const stock = root.querySelector(".spider-stock");
  stock.addEventListener("click", () => {
    if (game.dealError) {
      status.textContent = game.dealError;
      return;
    }
    game.deal();
    selection = hintTarget = null;
    render("Uma nova carta foi distribuída em cada coluna.");
  });

  function tryMove(to) {
    if (!selection) {
      status.textContent = "Selecione primeiro uma carta ou uma sequência.";
      return;
    }
    const { from, index } = selection;
    if (!game.move(from, index, to)) {
      status.textContent =
        "Essa sequência precisa de uma carta um valor acima, ou de uma coluna vazia.";
      return;
    }
    selection = hintTarget = null;
    render(`Cartas movidas para a coluna ${to + 1}.`);
    columns
      .querySelector(`[data-destination="${to}"]`)
      .focus({ preventScroll: true });
  }

  function selectCard(from, index) {
    if (selection && selection.from !== from) {
      tryMove(from);
      return;
    }
    if (selection?.from === from && selection.index === index) {
      selection = hintTarget = null;
      render("Seleção cancelada.");
    } else if (isSequence(game.columns[from], index)) {
      selection = { from, index };
      hintTarget = null;
      render("Selecione a coluna de destino. Escape cancela a seleção.");
    } else {
      status.textContent =
        "Selecione uma carta livre ou uma sequência decrescente sem interrupções.";
    }
    columns
      .querySelector(`[data-column="${from}"] [data-index="${index}"]`)
      ?.focus({ preventScroll: true });
  }

  const drag = setupSpiderDrag(root, {
    canMove: (from, index, to) => game.canMove(from, index, to),
    onDrop(from, index, to) {
      selection = { from, index };
      tryMove(to);
    },
    onInvalid() {
      status.textContent =
        "Solte sobre uma coluna válida. As cartas voltaram ao lugar.";
    },
  });

  function render(
    message = "Monte oito sequências de Rei até Ás. Clique ou arraste para jogar.",
  ) {
    drag.cancel();
    const focusedColumn = document.activeElement?.dataset.destination;
    const mode = difficulties.find((mode) => mode.count === game.suitCount);
    root.querySelector("[data-difficulty]").textContent =
      `${mode.name.toUpperCase()} · ${mode.count} ${mode.count === 1 ? "NAIPE" : "NAIPES"}`;
    root.querySelector('[data-stat="completed"]').textContent =
      `${game.completed.length}/8`;
    root.querySelector('[data-stat="moves"]').textContent = game.moves;
    root.querySelector('[data-stat="score"]').textContent = game.score;
    undoButton.disabled = !game.history.length;
    hintButton.disabled = game.won;
    const sets = game.stock.length / 10;
    stock.replaceChildren();
    if (sets) {
      const image = document.createElement("img");
      image.src = back;
      image.alt = "";
      stock.append(image);
    }
    const stockLabel = document.createElement("span");
    stockLabel.textContent = sets ? `Distribuir · ${sets}` : "Monte vazio";
    stock.append(stockLabel);
    stock.disabled = !sets || game.won;
    stock.setAttribute(
      "aria-label",
      `Distribuir uma carta por coluna. ${sets} distribuições restantes.`,
    );
    const foundations = root.querySelector(".spider-foundations");
    foundations.replaceChildren();
    for (let i = 0; i < 8; i++) {
      const slot = document.createElement("span");
      slot.className = `spider-foundation${i < game.completed.length ? " complete" : ""}`;
      const complete = game.completed[i];
      const suit = complete ? suits[complete[0].suit] : null;
      slot.textContent = suit ? `K—A ${suit.symbol}` : "—";
      slot.classList.toggle("red-suit", !!suit?.red);
      slot.setAttribute(
        "aria-label",
        `Sequência ${i + 1}: ${i < game.completed.length ? "concluída" : "pendente"}`,
      );
      foundations.append(slot);
    }
    columns.replaceChildren();
    game.columns.forEach((cards, columnIndex) => {
      const column = document.createElement("div");
      column.className = "spider-column";
      column.dataset.column = columnIndex;
      column.setAttribute("role", "group");
      column.setAttribute("aria-label", `Coluna ${columnIndex + 1}`);
      column.classList.toggle("hint-target", hintTarget === columnIndex);
      column.classList.toggle(
        "valid-target",
        !!selection &&
          game.canMove(selection.from, selection.index, columnIndex),
      );
      const destination = document.createElement("button");
      destination.type = "button";
      destination.className = "spider-destination";
      destination.dataset.destination = columnIndex;
      destination.textContent = String(columnIndex + 1).padStart(2, "0");
      destination.setAttribute(
        "aria-label",
        `Mover para coluna ${columnIndex + 1}`,
      );
      destination.disabled = game.won;
      destination.addEventListener("click", () => tryMove(columnIndex));
      column.append(destination);
      const pile = document.createElement("div");
      pile.className = "spider-pile";
      let top = 0;
      cards.forEach((card, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `spider-card${card.faceUp ? " face-up" : " face-down"}`;
        button.dataset.index = index;
        button.dataset.rank = card.faceUp ? card.rank : "";
        button.dataset.suit = card.faceUp ? card.suit : "";
        button.style.setProperty("--card-top", top);
        button.setAttribute(
          "aria-label",
          card.faceUp
            ? `${cardLabel(card)}, coluna ${columnIndex + 1}, posição ${index + 1}`
            : `Carta virada, coluna ${columnIndex + 1}`,
        );
        button.disabled = !card.faceUp || game.won;
        button.draggable = false;
        button.dataset.movable = String(!game.won && isSequence(cards, index));
        button.dataset.cardId = card.id;
        button.setAttribute(
          "aria-pressed",
          String(selection?.from === columnIndex && index >= selection.index),
        );
        button.classList.toggle(
          "selected",
          selection?.from === columnIndex && index >= selection.index,
        );
        button.append(cardImage(card));
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          selectCard(columnIndex, index);
        });
        pile.append(button);
        top += card.faceUp ? 28 : 12;
      });
      pile.style.setProperty(
        "--pile-offset",
        cards.length ? top - (cards.at(-1).faceUp ? 28 : 12) : 0,
      );
      pile.addEventListener("click", () => tryMove(columnIndex));
      column.append(pile);
      columns.append(column);
    });
    status.textContent = game.won
      ? "Você venceu! As oito sequências estão completas. Que tal outra partida?"
      : message;
    root.classList.toggle("spider-won", game.won);
    if (game.won && !wasWon)
      notifyApp(
        "solitaire",
        "Você venceu a Spider! As oito sequências estão completas.",
      );
    wasWon = game.won;
    if (focusedColumn !== undefined)
      columns
        .querySelector(`[data-destination="${focusedColumn}"]`)
        ?.focus({ preventScroll: true });
  }
  render();
  return root;
}

export function createSpider() {
  const host = document.createElement("div");
  host.className = "spider-host";
  function showTable() {
    host.replaceChildren(createTable(showHome));
    host.querySelector(".spider-scroll").focus({ preventScroll: true });
  }
  function showHome() {
    const home = document.createElement("section");
    home.className = "spider-home";
    home.setAttribute("aria-label", "Início da Spider");
    home.innerHTML = `
      <div class="spider-home-heading"><img src="${back}" alt="" draggable="false"><div><p class="eyebrow">PIXEL.OI / JOGOS</p><h3>Spider</h3><p>Escolha seu próximo desafio.</p></div></div>
      <div class="spider-modes" aria-label="Escolher dificuldade"></div>
      <div class="spider-resume"></div>
      <section class="spider-start-confirm" hidden aria-label="Confirmar nova partida"><p role="status"></p><div><button type="button" data-start="no">Cancelar</button><button type="button" data-start="yes">Começar nova partida</button></div></section>
      <p class="spider-home-note">Dez colunas. Oito sequências. Cada naipe conta.<br>Monte sequências do mesmo naipe, de Rei até Ás.</p>`;
    const confirmation = home.querySelector(".spider-start-confirm");
    let pending = null;
    function start(count) {
      game = new SpiderGame(Math.random, count);
      showTable();
    }
    for (const mode of difficulties) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "spider-mode";
      button.dataset.mode = mode.count;
      button.innerHTML = `<span class="spider-mode-suits" aria-hidden="true">${Object.values(
        suits,
      )
        .slice(0, mode.count)
        .map(
          (suit) =>
            `<span class="${suit.red ? "red-suit" : ""}">${suit.symbol}</span>`,
        )
        .join(
          " ",
        )}</span><strong>${mode.name}</strong><span>${mode.count} ${mode.count === 1 ? "naipe" : "naipes"}</span><small>${mode.description}</small>`;
      button.addEventListener("click", () => {
        if (!game || game.won) {
          start(mode.count);
          return;
        }
        pending = mode.count;
        confirmation.hidden = false;
        confirmation.querySelector("p").textContent =
          `Iniciar no modo ${mode.name.toLowerCase()} (${mode.count} ${mode.count === 1 ? "naipe" : "naipes"})? A partida atual será substituída.`;
        confirmation.querySelector('[data-start="no"]').focus();
      });
      home.querySelector(".spider-modes").append(button);
    }
    if (game) {
      const mode = difficulties.find((mode) => mode.count === game.suitCount);
      const resume = document.createElement("button");
      resume.type = "button";
      resume.className = "spider-resume-button";
      resume.textContent = `Continuar partida · ${mode.name} · ${game.moves} ${game.moves === 1 ? "jogada" : "jogadas"}`;
      resume.setAttribute("aria-label", "Continuar partida");
      resume.addEventListener("click", showTable);
      home.querySelector(".spider-resume").append(resume);
    }
    function cancel() {
      confirmation.hidden = true;
      home.querySelector(`[data-mode="${pending}"]`)?.focus();
      pending = null;
    }
    confirmation
      .querySelector('[data-start="no"]')
      .addEventListener("click", cancel);
    confirmation
      .querySelector('[data-start="yes"]')
      .addEventListener("click", () => {
        if (pending !== null) start(pending);
      });
    home.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !confirmation.hidden) {
        event.stopPropagation();
        cancel();
      }
    });
    host.replaceChildren(home);
    home.querySelector("button").focus({ preventScroll: true });
  }
  showHome();
  return host;
}
