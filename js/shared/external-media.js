let youtubePromise;
let spotifyPromise;
function loadSDK(url, callback, read) {
  if (read()) return Promise.resolve(read());
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    const previous = window[callback];
    const finish = () => {
      clearTimeout(timer);
      if (window[callback] === ready) window[callback] = previous;
    };
    const ready = (...args) => {
      try {
        previous?.(...args);
      } finally {
        finish();
        resolve(read(...args));
      }
    };
    window[callback] = ready;
    const timer = setTimeout(() => {
      finish();
      script.remove();
      reject(new Error("O controle do player não respondeu."));
    }, 12000);
    script.onerror = () => {
      finish();
      script.remove();
      reject(new Error("Não foi possível carregar o controle do player."));
    };
    document.head.append(script);
  });
}
function youtubeSDK() {
  return (youtubePromise ||= loadSDK(
    "https://www.youtube.com/iframe_api",
    "onYouTubeIframeAPIReady",
    () => window.YT?.Player && window.YT,
  ).catch((error) => {
    youtubePromise = null;
    throw error;
  }));
}
function spotifySDK() {
  return (spotifyPromise ||= loadSDK(
    "https://open.spotify.com/embed/iframe-api/v1",
    "onSpotifyIframeApiReady",
    (api) => window.pixelSpotifyAPI || (api && (window.pixelSpotifyAPI = api)),
  ).catch((error) => {
    spotifyPromise = null;
    throw error;
  }));
}

export function createExternalMedia(provider, parsed, host, onUpdate, onError) {
  let disposed = false,
    ready = false,
    player = null,
    timer;
  const data = {
    provider: provider === "youtube" ? "YouTube" : "Spotify",
    title: parsed.title,
    playing: false,
    duration: 0,
    position: 0,
  };
  const iframe = document.createElement("iframe");
  iframe.title = parsed.title;
  iframe.allow =
    "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  const src = new URL(parsed.src);
  if (provider === "youtube") {
    src.searchParams.set("enablejsapi", "1");
    src.searchParams.set("origin", location.origin);
  }
  iframe.src = src.href;
  host.replaceChildren(iframe);
  const invoke = (method, ...args) => {
    try {
      if (ready && !disposed) player?.[method]?.(...args);
    } catch {
      onError("Use os controles do player para esta ação.");
    }
  };
  const snapshot = () => ({
    ...data,
    external: true,
    play: ready
      ? () => invoke(provider === "youtube" ? "playVideo" : "resume")
      : null,
    pause: ready
      ? () => invoke(provider === "youtube" ? "pauseVideo" : "pause")
      : null,
    seek: ready
      ? (seconds) => {
          if (!Number.isFinite(seconds)) return;
          const position = Math.max(
            0,
            Math.min(data.duration || Infinity, seconds),
          );
          if (provider === "youtube") invoke("seekTo", position, true);
          else invoke("seek", Math.floor(position));
        }
      : null,
    previous:
      ready && provider === "youtube" && src.searchParams.has("list")
        ? () => invoke("previousVideo")
        : null,
    next:
      ready && provider === "youtube" && src.searchParams.has("list")
        ? () => invoke("nextVideo")
        : null,
  });
  function update() {
    if (!disposed) onUpdate(snapshot());
  }
  update();
  if (provider === "youtube") {
    youtubeSDK()
      .then((YT) => {
        if (disposed) return;
        player = new YT.Player(iframe, {
          events: {
            onReady() {
              if (disposed) return;
              ready = true;
              const poll = () => {
                if (disposed || !ready) return;
                try {
                  data.duration = player.getDuration?.() || 0;
                  data.position = player.getCurrentTime?.() || 0;
                  data.title = player.getVideoData?.()?.title || parsed.title;
                  data.playing = player.getPlayerState?.() === 1;
                } catch {}
                update();
              };
              poll();
              timer = setInterval(poll, 750);
            },
            onStateChange(event) {
              if (disposed) return;
              data.playing = event.data === 1;
              update();
            },
            onError() {
              if (disposed) return;
              ready = false;
              data.playing = false;
              update();
              onError(
                "Este vídeo não pôde ser reproduzido aqui. Use Abrir no YouTube.",
              );
            },
          },
        });
      })
      .catch(() => {
        if (!disposed)
          onError(
            "Controles externos indisponíveis. Use o player ou Abrir no YouTube.",
          );
      });
  } else {
    spotifySDK()
      .then((api) => {
        if (disposed) return;
        const placeholder = document.createElement("div");
        host.replaceChildren(placeholder);
        api.createController(
          placeholder,
          { url: parsed.href, width: "100%", height: "100%" },
          (controller) => {
            if (disposed) {
              controller.destroy();
              return;
            }
            player = controller;
            controller.addListener("ready", () => {
              ready = true;
              update();
            });
            controller.addListener("playback_update", (event) => {
              data.playing = !event.data.isPaused;
              data.duration = (event.data.duration || 0) / 1000;
              data.position = (event.data.position || 0) / 1000;
              update();
            });
          },
        );
      })
      .catch(() => {
        if (!disposed)
          onError(
            "Controles externos indisponíveis. Use o player ou Abrir no Spotify.",
          );
      });
  }
  return {
    dispose() {
      disposed = true;
      ready = false;
      clearInterval(timer);
      try {
        player?.destroy?.();
      } catch {}
      host.replaceChildren();
    },
  };
}
