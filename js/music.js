import { iconButton, pixelArt } from "./assets.js";
import { parseMusicLink } from "./music-links.js";
import { getVolume, subscribeVolume } from "./audio-settings.js";

const allowedExtension = /\.(mp3|wav|ogg|oga|m4a|aac|flac|webm|opus)$/i;
const time = (value) =>
  Number.isFinite(value)
    ? `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`
    : "0:00";

export function createMusic() {
  const root = document.createElement("div");
  root.className = "music-app";
  root.innerHTML = `
    <header class="music-heading"><p class="eyebrow">PIXEL.OI / MÚSICA</p><h3>Seu som, seu espaço.</h3><p>Links favoritos ou arquivos que já estão com você.</p></header>
    <div class="music-tabs" role="tablist" aria-label="Origem da música">
      <button type="button" role="tab" id="music-tab-local" aria-controls="music-local" data-source="local">Meus arquivos</button>
      <button type="button" role="tab" id="music-tab-youtube" aria-controls="music-youtube" data-source="youtube">YouTube</button>
      <button type="button" role="tab" id="music-tab-spotify" aria-controls="music-spotify" data-source="spotify">Spotify</button>
    </div>
    <section id="music-local" class="music-pane" role="tabpanel" aria-labelledby="music-tab-local">
      <label class="music-add"><span>Adicionar músicas</span><input id="music-files" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus,.webm" multiple></label>
      <p class="music-note">Os arquivos ficam no seu navegador, sem envio. Ao fechar a janela, adicione-os novamente.</p>
      <div class="music-player"><p class="music-now" aria-live="polite">Escolha uma música para começar.</p><div class="music-controls"></div><div class="music-timeline"><time data-time="current">0:00</time><input type="range" id="music-seek" aria-label="Posição da música" min="0" max="100" value="0" disabled><time data-time="duration">0:00</time></div><a class="music-download" hidden>Baixar cópia do arquivo</a></div>
      <div class="music-queue" aria-label="Fila de músicas"></div>
      <p class="music-note">O volume da barra de tarefas controla estes arquivos.</p>
    </section>
    <section id="music-youtube" class="music-pane" role="tabpanel" aria-labelledby="music-tab-youtube" hidden></section>
    <section id="music-spotify" class="music-pane" role="tabpanel" aria-labelledby="music-tab-spotify" hidden></section>
    <p class="music-status" role="status" aria-live="polite"></p>`;

  let files = [];
  let nextId = 0;
  let currentId = null;
  let source = "local";
  let disposed = false;
  const audio = document.createElement("audio");
  audio.hidden = true;
  root.append(audio);
  audio.preload = "metadata";
  audio.volume = getVolume();
  const unsubscribe = subscribeVolume((value) => {
    audio.volume = value;
  });
  const status = root.querySelector(".music-status");
  const queue = root.querySelector(".music-queue");
  const currentFile = () => files.find((file) => file.id === currentId);
  const currentIndex = () => files.findIndex((file) => file.id === currentId);
  const controls = root.querySelector(".music-controls");
  const previous = iconButton("seta", "Música anterior", () =>
    selectAt(currentIndex() - 1, true),
  );
  const play = iconButton("iniciar", "Reproduzir", () => {
    if (!currentFile()) return;
    if (audio.paused) playAudio();
    else audio.pause();
  });
  const next = iconButton("seta", "Próxima música", () =>
    selectAt(currentIndex() + 1, true),
  );
  next.classList.add("music-next");
  controls.append(previous, play, next);
  const seek = root.querySelector("#music-seek");
  const download = root.querySelector(".music-download");
  const input = root.querySelector("#music-files");
  root.querySelector(".music-add").prepend(pixelArt("upload"));

  async function playAudio() {
    const requestedId = currentId;
    try {
      await audio.play();
    } catch (error) {
      if (
        !disposed &&
        currentId === requestedId &&
        error.name !== "AbortError" &&
        audio.paused
      )
        status.textContent =
          "Não foi possível reproduzir. Verifique o formato do arquivo e tente novamente.";
    }
  }
  function selectAt(index, shouldPlay) {
    const file = files[index];
    if (!file) return;
    audio.pause();
    currentId = file.id;
    audio.src = file.url;
    audio.load();
    status.textContent = "";
    renderQueue();
    updatePlayer();
    if (shouldPlay) playAudio();
  }
  function updatePlayer() {
    if (disposed) return;
    const file = currentFile();
    root.querySelector(".music-now").textContent = file
      ? file.name
      : "Escolha uma música para começar.";
    play.disabled = !file;
    previous.disabled = currentIndex() <= 0;
    next.disabled = !file || currentIndex() >= files.length - 1;
    const playing = !audio.paused && !audio.ended;
    play.setAttribute("aria-label", playing ? "Pausar" : "Reproduzir");
    play.title = playing ? "Pausar" : "Reproduzir";
    if (play.dataset.playing !== String(playing)) {
      play.replaceChildren(pixelArt(playing ? "pausar" : "iniciar"));
      play.dataset.playing = String(playing);
    }
    root.querySelector('[data-time="current"]').textContent = time(
      audio.currentTime,
    );
    root.querySelector('[data-time="duration"]').textContent = time(
      audio.duration,
    );
    seek.disabled =
      !file || !Number.isFinite(audio.duration) || audio.duration <= 0;
    seek.value = seek.disabled ? 0 : (audio.currentTime / audio.duration) * 100;
    download.hidden = !file;
    if (file) {
      download.href = file.url;
      download.download = file.name;
    } else download.removeAttribute("href");
  }
  function renderQueue() {
    queue.replaceChildren();
    if (!files.length) {
      const empty = document.createElement("p");
      empty.className = "music-empty";
      empty.textContent =
        "Sua fila está vazia. Adicione MP3, WAV ou outro áudio compatível.";
      queue.append(empty);
    }
    for (const file of files) {
      const row = document.createElement("div");
      row.className = "music-track";
      row.classList.toggle("current", file.id === currentId);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "music-track-name";
      button.textContent = file.name;
      button.setAttribute("aria-label", `Reproduzir ${file.name}`);
      if (file.id === currentId) button.setAttribute("aria-current", "true");
      button.addEventListener("click", () =>
        selectAt(files.indexOf(file), true),
      );
      const remove = iconButton("excluir", `Remover ${file.name}`, () => {
        const index = files.indexOf(file);
        const isCurrent = file.id === currentId;
        if (isCurrent) {
          audio.pause();
          audio.removeAttribute("src");
          audio.load();
          currentId = null;
        }
        files.splice(index, 1);
        URL.revokeObjectURL(file.url);
        if (isCurrent && files.length)
          selectAt(Math.min(index, files.length - 1), false);
        else {
          renderQueue();
          updatePlayer();
        }
      });
      row.append(button, remove);
      queue.append(row);
    }
  }
  input.addEventListener("change", () => {
    let rejected = 0;
    for (const file of input.files) {
      if (
        !file.type.startsWith("audio/") &&
        !allowedExtension.test(file.name)
      ) {
        rejected++;
        continue;
      }
      files.push({
        id: ++nextId,
        name: file.name,
        url: URL.createObjectURL(file),
      });
    }
    input.value = "";
    if (currentId === null && files.length) selectAt(0, false);
    else renderQueue();
    status.textContent = rejected
      ? `${rejected} arquivo(s) ignorado(s). Escolha arquivos de áudio.`
      : `${files.length} música(s) na fila.`;
  });
  seek.addEventListener("input", () => {
    if (!seek.disabled)
      audio.currentTime = (Number(seek.value) / 100) * audio.duration;
  });
  for (const event of [
    "loadedmetadata",
    "timeupdate",
    "play",
    "pause",
    "emptied",
  ])
    audio.addEventListener(event, updatePlayer);
  audio.addEventListener("ended", () => {
    if (currentIndex() < files.length - 1) selectAt(currentIndex() + 1, true);
    else updatePlayer();
  });
  audio.addEventListener("error", () => {
    if (!disposed && currentFile())
      status.textContent =
        "Este áudio não pôde ser aberto. Tente outro arquivo ou formato.";
  });

  const frames = new Map();
  for (const provider of ["youtube", "spotify"]) {
    const pane = root.querySelector(`#music-${provider}`);
    const label = provider === "youtube" ? "YouTube" : "Spotify";
    pane.innerHTML = `<form class="music-link-form"><label for="music-link-${provider}">Link do ${label}</label><div><input type="url" id="music-link-${provider}" placeholder="${provider === "youtube" ? "https://www.youtube.com/watch?v=…" : "https://open.spotify.com/track/…"}" required><button type="submit">Abrir player</button></div></form><div class="music-embed"><p>Cole um link para carregar o player oficial.</p></div><p class="music-note">Use os controles do player para reproduzir e ajustar o volume. Alguns conteúdos exigem login ou não permitem reprodução incorporada.</p><a class="music-provider-link" target="_blank" rel="noopener noreferrer" hidden>Abrir no ${label}</a><p class="music-note">Os links do ${label} são para ouvir pelo player; não oferecem download de áudio por aqui.</p>`;
    const frameArea = pane.querySelector(".music-embed");
    const open = pane.querySelector(".music-provider-link");
    pane.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      let parsed;
      try {
        parsed = parseMusicLink(pane.querySelector("input").value, provider);
      } catch (error) {
        status.textContent = error.message;
        return;
      }
      audio.pause();
      const iframe = document.createElement("iframe");
      iframe.title = parsed.title;
      iframe.allow =
        "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allowFullscreen = true;
      iframe.src = parsed.src;
      frameArea.replaceChildren(iframe);
      frames.set(provider, iframe);
      open.href = parsed.href;
      open.hidden = false;
      status.textContent = `Link adicionado. Inicie pelo player do ${label}; se não carregar, use o link abaixo.`;
    });
  }
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  function setTab(value) {
    if (source !== value) audio.pause();
    for (const [provider, iframe] of frames) {
      if (provider !== value) {
        const message = document.createElement("p");
        message.textContent = "Cole um link para carregar o player oficial.";
        iframe.replaceWith(message);
        frames.delete(provider);
      }
    }
    source = value;
    for (const tab of tabs) {
      const selected = tab.dataset.source === value;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      root.querySelector(`#music-${tab.dataset.source}`).hidden = !selected;
    }
    status.textContent = "";
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => setTab(tab.dataset.source));
    tab.addEventListener("keydown", (event) => {
      let nextIndex;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft")
        nextIndex = (index + tabs.length - 1) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      if (nextIndex === undefined) return;
      event.preventDefault();
      setTab(tabs[nextIndex].dataset.source);
      tabs[nextIndex].focus();
    });
  });
  root.dispose = () => {
    disposed = true;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    unsubscribe();
    for (const file of files) URL.revokeObjectURL(file.url);
    files = [];
    for (const iframe of frames.values()) iframe.remove();
    frames.clear();
  };
  setTab("local");
  renderQueue();
  updatePlayer();
  return root;
}
