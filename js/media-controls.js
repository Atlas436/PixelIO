import { iconButton, pixelArt } from "./assets.js";

// Um único ponto de controle para mini player e Media Session do navegador.
export function createMediaControls(app) {
  let state = null;
  let disposed = false;
  let scheduled = 0;
  const root = document.createElement("aside");
  root.className = "media-dock";
  root.hidden = true;
  root.setAttribute("aria-label", "Mini player do Música");
  const frame = document.createElement("div");
  frame.className = "media-dock-frame";
  const info = document.createElement("div");
  info.className = "media-dock-info";
  const title = document.createElement("p");
  title.className = "media-dock-title";
  const provider = document.createElement("span");
  provider.className = "media-dock-provider";
  const buttons = document.createElement("div");
  buttons.className = "media-dock-buttons";
  const previous = iconButton("seta", "Faixa anterior no mini player", () =>
    state?.previous?.(),
  );
  const play = iconButton("iniciar", "Reproduzir no mini player", () => {
    if (state?.playing) state.pause?.();
    else state?.play?.();
  });
  const next = iconButton("seta", "Próxima faixa no mini player", () =>
    state?.next?.(),
  );
  next.classList.add("music-next");
  const restore = document.createElement("button");
  restore.type = "button";
  restore.className = "media-dock-open";
  restore.textContent = "Abrir Música";
  restore.addEventListener("click", () =>
    app.dispatchEvent(
      new CustomEvent("pixel:restore-music", { bubbles: true }),
    ),
  );
  buttons.append(previous, play, next, restore);
  info.append(provider, title, buttons);
  root.append(frame, info);
  document.querySelector("#system").append(root);

  function layout() {
    scheduled = 0;
    if (disposed || !state) {
      root.hidden = true;
      return;
    }
    const window = app.closest(".window");
    const slot = state.slot;
    const pane = slot?.closest(".music-pane");
    const rect = slot?.getBoundingClientRect();
    const area = pane?.getBoundingClientRect();
    const visible =
      !!window &&
      !window.hidden &&
      window.classList.contains("active") &&
      (!state.local || !app.querySelector("#music-local").hidden);
    // O player externo permanece no mesmo nó. Só sua posição muda, evitando reinício.
    const embedded =
      !!state.external &&
      visible &&
      pane &&
      !pane.hidden &&
      rect.width >= 200 &&
      rect.height >= 200 &&
      rect.top >= area.top &&
      rect.bottom <= area.bottom &&
      rect.left >= area.left &&
      rect.right <= area.right;
    root.hidden = state.local ? visible : false;
    root.classList.toggle("media-dock-embedded", embedded);
    root.classList.toggle("media-dock-external", !!state.external);
    if (embedded)
      Object.assign(root.style, {
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      });
    else {
      root.style.left = "";
      root.style.top = "";
      root.style.width = "";
      root.style.height = "";
    }
  }
  function schedule() {
    if (!scheduled) scheduled = requestAnimationFrame(layout);
  }
  const observer = new MutationObserver(schedule);
  const sizes = new ResizeObserver(schedule);
  for (const pane of app.querySelectorAll(".music-pane")) sizes.observe(pane);
  queueMicrotask(() => {
    if (!disposed && app.closest(".window"))
      observer.observe(app.closest(".window"), {
        attributes: true,
        subtree: true,
        attributeFilter: ["class", "style", "hidden"],
      });
  });
  window.addEventListener("resize", schedule);
  document.addEventListener("scroll", schedule, true);
  const actions = [
    "play",
    "pause",
    "stop",
    "previoustrack",
    "nexttrack",
    "seekbackward",
    "seekforward",
    "seekto",
  ];
  function nativeSession() {
    if (!navigator.mediaSession) return;
    const session = navigator.mediaSession;
    const handlers = state
      ? {
          play: state.play,
          pause: state.pause,
          stop: state.stop || state.pause,
          previoustrack: state.previous,
          nexttrack: state.next,
          seekto: state.seek ? (details) => state.seek(details.seekTime) : null,
          seekbackward: state.seek
            ? (details) =>
                state.seek(
                  Math.max(
                    0,
                    (state.position || 0) - (details.seekOffset || 10),
                  ),
                )
            : null,
          seekforward: state.seek
            ? (details) =>
                state.seek(
                  Math.min(
                    state.duration || Infinity,
                    (state.position || 0) + (details.seekOffset || 10),
                  ),
                )
            : null,
        }
      : {};
    for (const action of actions)
      try {
        session.setActionHandler(action, handlers[action] || null);
      } catch {
        /* Nem todos os navegadores oferecem todas as ações. */
      }
    try {
      if (state && "MediaMetadata" in window)
        session.metadata = new MediaMetadata({
          title: state.title,
          artist: `Pixel.OI · ${state.provider}`,
        });
      else session.metadata = null;
      session.playbackState = state
        ? state.playing
          ? "playing"
          : "paused"
        : "none";
      if (session.setPositionState) {
        if (
          state &&
          Number.isFinite(state.duration) &&
          state.duration > 0 &&
          Number.isFinite(state.position)
        )
          session.setPositionState({
            duration: state.duration,
            playbackRate: 1,
            position: Math.max(0, Math.min(state.position, state.duration)),
          });
        else session.setPositionState();
      }
    } catch {
      /* A integração é opcional; os controles do site continuam funcionando. */
    }
  }
  return {
    frame,
    update(nextState) {
      state = nextState;
      if (state) {
        title.textContent = state.title;
        title.title = state.title;
        provider.textContent = state.provider;
        previous.disabled = !state.previous;
        next.disabled = !state.next;
        play.disabled = !(state.playing ? state.pause : state.play);
        const label = state.playing
          ? "Pausar no mini player"
          : "Reproduzir no mini player";
        play.setAttribute("aria-label", label);
        play.title = label;
        if (play.dataset.playing !== String(state.playing)) {
          play.replaceChildren(pixelArt(state.playing ? "pausar" : "iniciar"));
          play.dataset.playing = String(state.playing);
        }
      }
      nativeSession();
      layout();
    },
    dispose() {
      disposed = true;
      state = null;
      nativeSession();
      observer.disconnect();
      sizes.disconnect();
      cancelAnimationFrame(scheduled);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("scroll", schedule, true);
      root.remove();
    },
  };
}
