// Somente URLs dos provedores conhecidos viram players; nunca inserimos HTML colado.
export function parseMusicLink(input, provider) {
  let url;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Cole um link completo, começando com https://.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port)
    throw new Error("Use um link HTTPS do serviço escolhido.");
  const host = url.hostname.toLowerCase();
  if (provider === "youtube") {
    if (
      ![
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "music.youtube.com",
        "youtu.be",
      ].includes(host)
    )
      throw new Error("Use um link do YouTube nesta aba.");
    const parts = url.pathname.split("/").filter(Boolean);
    let id = host === "youtu.be" ? parts[0] : url.searchParams.get("v");
    if (["shorts", "embed", "live"].includes(parts[0])) id = parts[1];
    const list = url.searchParams.get("list");
    if (id && !/^[A-Za-z0-9_-]{11}$/.test(id))
      throw new Error("O código do vídeo está incompleto.");
    if (list && !/^[A-Za-z0-9_-]{10,128}$/.test(list))
      throw new Error("O código da playlist é inválido.");
    if (!id && !list)
      throw new Error("Cole o link de um vídeo ou de uma playlist do YouTube.");
    const embed = new URL(
      `https://www.youtube-nocookie.com/embed/${id || "videoseries"}`,
    );
    if (list) embed.searchParams.set("list", list);
    const href = new URL(
      id ? "https://www.youtube.com/watch" : "https://www.youtube.com/playlist",
    );
    if (id) href.searchParams.set("v", id);
    if (list) href.searchParams.set("list", list);
    return {
      src: embed.href,
      href: href.href,
      title: id ? "Vídeo do YouTube" : "Playlist do YouTube",
    };
  }
  if (provider === "spotify") {
    if (host !== "open.spotify.com")
      throw new Error("Use um link de open.spotify.com nesta aba.");
    const parts = url.pathname.split("/").filter(Boolean);
    if (/^intl-[a-z-]+$/i.test(parts[0])) parts.shift();
    if (parts[0] === "embed") parts.shift();
    const [type, id] = parts;
    if (
      !["track", "album", "playlist", "episode", "show"].includes(type) ||
      !/^[A-Za-z0-9]{22}$/.test(id || "") ||
      parts.length !== 2
    )
      throw new Error(
        "Cole um link de música, álbum, playlist ou podcast do Spotify.",
      );
    return {
      src: `https://open.spotify.com/embed/${type}/${id}`,
      href: `https://open.spotify.com/${type}/${id}`,
      title: "Player do Spotify",
    };
  }
  throw new Error("Serviço desconhecido.");
}
