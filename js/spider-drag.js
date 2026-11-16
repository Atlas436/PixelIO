// Arraste por ponteiro: mouse, caneta e toque usam as próprias cartas da mesa.
export function setupSpiderDrag(root, { canMove, onDrop, onInvalid }) {
  let active = null;
  let ghost = null;
  let settlingGhost = null;
  let settlingCards = [];
  let cleanupTimer;
  let suppressUntil = 0;
  const clearMarks = () => {
    for (const element of root.querySelectorAll(
      ".drag-source, .drop-target, .valid-target",
    ))
      element.classList.remove("drag-source", "drop-target", "valid-target");
  };
  function cancel() {
    clearTimeout(cleanupTimer);
    settlingGhost?.remove();
    settlingCards.forEach((card) => card.classList.remove("drag-source"));
    settlingGhost = null;
    settlingCards = [];
    if (active?.started) suppressUntil = performance.now() + 250;
    const previous = active;
    active = null;
    if (previous?.card.hasPointerCapture(previous.id))
      previous.card.releasePointerCapture(previous.id);
    previous?.events.abort();
    ghost?.remove();
    ghost = null;
    clearMarks();
  }
  root.addEventListener("dragstart", (event) => event.preventDefault());
  root.addEventListener(
    "click",
    (event) => {
      if (event.detail && performance.now() < suppressUntil) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
  root.addEventListener("pointerdown", (event) => {
    // Uma nova pressão é uma ação intencional, não o clique sintético do arraste.
    suppressUntil = 0;
    const card = event.target.closest('.spider-card[data-movable="true"]');
    if (!card || event.button !== 0 || active || !event.isPrimary) return;
    cancel();
    const rect = card.getBoundingClientRect();
    active = {
      id: event.pointerId,
      from: Number(card.closest("[data-column]").dataset.column),
      index: Number(card.dataset.index),
      x: event.clientX,
      y: event.clientY,
      rect,
      card,
      started: false,
      events: new AbortController(),
    };
    window.addEventListener("blur", cancel, { signal: active.events.signal });
    card.setPointerCapture(event.pointerId);
  });
  root.addEventListener("pointermove", (event) => {
    if (!active || event.pointerId !== active.id) return;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    if (!active.started) {
      if (Math.hypot(dx, dy) < 6) return;
      active.started = true;
      const cards = [
        ...active.card.parentElement.querySelectorAll(".spider-card"),
      ].slice(active.index);
      active.ids = cards.map((card) => card.dataset.cardId);
      ghost = document.createElement("div");
      ghost.className = "spider-drag-ghost";
      ghost.setAttribute("aria-hidden", "true");
      ghost.inert = true;
      Object.assign(ghost.style, {
        left: `${active.rect.left}px`,
        top: `${active.rect.top}px`,
        width: `${active.rect.width}px`,
      });
      cards.forEach((card, index) => {
        const copy = card.cloneNode(true);
        copy.classList.remove("selected", "drag-source");
        copy.style.setProperty("--card-top", index * 28);
        copy.tabIndex = -1;
        ghost.append(copy);
        card.classList.add("drag-source");
      });
      document.body.append(ghost);
    }
    event.preventDefault();
    ghost.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    const destination = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest(".spider-column");
    for (const column of root.querySelectorAll(".spider-column")) {
      const valid = canMove(
        active.from,
        active.index,
        Number(column.dataset.column),
      );
      column.classList.toggle("valid-target", valid);
      column.classList.toggle("drop-target", valid && column === destination);
    }
  });
  root.addEventListener("pointerup", (event) => {
    if (!active || event.pointerId !== active.id) return;
    const current = active;
    active = null;
    current.events.abort();
    if (current.card.hasPointerCapture(event.pointerId))
      current.card.releasePointerCapture(event.pointerId);
    if (!current.started) return;
    suppressUntil = performance.now() + 250;
    const column = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest(".spider-column");
    const to =
      column && root.contains(column) ? Number(column.dataset.column) : null;
    const valid = to !== null && canMove(current.from, current.index, to);
    const movingGhost = ghost;
    // O modelo muda imediatamente; só a apresentação termina o encaixe animado.
    ghost = null;
    clearMarks();
    if (valid) onDrop(current.from, current.index, to);
    else onInvalid();
    const originals = current.ids
      .map((id) => root.querySelector(`[data-card-id="${id}"]`))
      .filter(Boolean);
    originals.forEach((card) => card.classList.add("drag-source"));
    const destination = originals[0]?.getBoundingClientRect() || current.rect;
    if (!movingGhost) return;
    settlingGhost = movingGhost;
    settlingCards = originals;
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      movingGhost.style.transition = "transform 140ms ease-out";
      movingGhost.style.transform = `translate3d(${destination.left - current.rect.left}px, ${destination.top - current.rect.top}px, 0)`;
    }
    cleanupTimer = setTimeout(
      () => {
        movingGhost.remove();
        originals.forEach((card) => card.classList.remove("drag-source"));
        settlingGhost = null;
        settlingCards = [];
      },
      matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 150,
    );
  });
  root.addEventListener("pointercancel", cancel);
  root.addEventListener("lostpointercapture", () => {
    if (active) cancel();
  });
  root.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && active) {
        event.preventDefault();
        event.stopImmediatePropagation();
        cancel();
      }
    },
    true,
  );
  return { cancel };
}
