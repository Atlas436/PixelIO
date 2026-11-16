import { SpiderGame, isSequence, rankName } from "./spider-rules.js";
import { iconButton } from "./assets.js";

// A partida permanece na memória ao fechar/reabrir a janela, até recarregar a página.
let game;
const asset = (name) =>
  new URL(`../assets/baralho/${name}`, import.meta.url).href;
const back = asset("verso-pixel-oi.png");
// Recorte visual por CSS: os arquivos originais de 100×100 não são modificados.
const faces = {
  1: ["espadas.png", 28, 23, 30, 40],
  2: ["espadas (8).png", 28, 16, 34, 67],
  3: ["espadas (7).png", 28, 16, 34, 67],
  4: ["espadas (6).png", 28, 16, 34, 67],
  5: ["espadas (5).png", 28, 16, 34, 67],
  6: ["espadas (4).png", 28, 16, 34, 67],
  7: ["espadas (3).png", 28, 16, 34, 67],
  8: ["espadas (2).png", 28, 16, 34, 67],
  10: ["espadas (1).png", 28, 16, 34, 67],
  11: ["Valete loiro espadas.png", 28, 16, 31, 63],
  12: ["rainha espadas.png", 19, 17, 40, 66],
  13: ["reis espadas.png", 28, 16, 31, 63],
};

function cardImage(card) {
  const image = document.createElement("img");
  image.alt = "";
  image.draggable = false;
  if (!card.faceUp) {
    image.src = back;
    return image;
  }
  const face = faces[card.rank];
  if (!face) {
    const provisional = document.createElement("span");
    provisional.className = "spider-provisional";
    provisional.innerHTML =
      "<span>9 ♠</span><small>9 ♠</small><span>9 ♠</span>";
    return provisional;
  }
  const [name, x, y, width, height] = face;
  image.src = asset(name);
  Object.assign(image.style, {
    width: `${10000 / width}%`,
    height: `${10000 / height}%`,
    left: `${(-x / width) * 100}%`,
    top: `${(-y / height) * 100}%`,
  });
  return image;
}

export function createSpider() {
  game ||= new SpiderGame();
  let selection = null;
  let hintTarget = null;
  let dragged = null;
  const root = document.createElement("div");
  root.className = "spider-app";
  root.innerHTML = `
    <header class="spider-header">
      <div><p class="eyebrow">PIXEL.OI / JOGOS</p><h3>Spider <span>1 NAIPE ♠</span></h3></div>
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
      <p>Uma carta vai sobre outra de valor imediatamente maior. Qualquer sequência em ordem pode ir para uma coluna vazia. Complete oito sequências de Rei a Ás para vencer. As cartas cobertas viram automaticamente.</p>
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
        `Dica: mova ${rankName(game.columns[hint.from][hint.index].rank)} de espadas da coluna ${hint.from + 1} para a coluna ${hint.to + 1}.`,
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

  function render(
    message = "Monte oito sequências de Rei até Ás. Clique ou arraste para jogar.",
  ) {
    const focusedColumn = document.activeElement?.dataset.destination;
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
      slot.textContent = i < game.completed.length ? "K—A ♠" : "♠";
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
        button.style.setProperty("--card-top", top);
        button.setAttribute(
          "aria-label",
          card.faceUp
            ? `${rankName(card.rank)} de espadas, coluna ${columnIndex + 1}, posição ${index + 1}`
            : `Carta virada, coluna ${columnIndex + 1}`,
        );
        button.disabled = !card.faceUp || game.won;
        button.draggable = !game.won && isSequence(cards, index);
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
        button.addEventListener("dragstart", (event) => {
          if (!button.draggable) {
            event.preventDefault();
            return;
          }
          dragged = { from: columnIndex, index };
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", "pixel-spider");
          for (const target of columns.children)
            target.classList.toggle(
              "valid-target",
              game.canMove(columnIndex, index, Number(target.dataset.column)),
            );
        });
        button.addEventListener("dragend", () => {
          dragged = null;
          for (const target of columns.children)
            target.classList.remove("drop-target");
          for (const target of columns.children)
            target.classList.toggle(
              "valid-target",
              !!selection &&
                game.canMove(
                  selection.from,
                  selection.index,
                  Number(target.dataset.column),
                ),
            );
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
      column.addEventListener("dragover", (event) => {
        if (!dragged || !game.canMove(dragged.from, dragged.index, columnIndex))
          return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        column.classList.add("drop-target");
      });
      column.addEventListener("dragleave", (event) => {
        if (!column.contains(event.relatedTarget))
          column.classList.remove("drop-target");
      });
      column.addEventListener("drop", (event) => {
        event.preventDefault();
        if (!dragged) return;
        selection = dragged;
        dragged = null;
        tryMove(columnIndex);
      });
      columns.append(column);
    });
    status.textContent = game.won
      ? "Você venceu! As oito sequências estão completas. Que tal outra partida?"
      : message;
    root.classList.toggle("spider-won", game.won);
    if (focusedColumn !== undefined)
      columns
        .querySelector(`[data-destination="${focusedColumn}"]`)
        ?.focus({ preventScroll: true });
  }
  render();
  return root;
}
