import test from "node:test";
import assert from "node:assert/strict";
import { parseMusicLink } from "../js/shared/music-links.js";

test("YouTube: watch, link curto, shorts, live e playlists", () => {
  const id = "dQw4w9WgXcQ";
  for (const url of [
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/shorts/${id}`,
    `https://music.youtube.com/watch?v=${id}`,
    `https://youtube.com/live/${id}`,
  ])
    assert.equal(
      parseMusicLink(url, "youtube").src,
      `https://www.youtube-nocookie.com/embed/${id}`,
    );
  const playlist = parseMusicLink(
    "https://www.youtube.com/playlist?list=PLabcdefghijk1234",
    "youtube",
  );
  assert.equal(
    playlist.src,
    "https://www.youtube-nocookie.com/embed/videoseries?list=PLabcdefghijk1234",
  );
  assert.equal(
    parseMusicLink(
      `https://www.youtube.com/watch?v=${id}&list=PLabcdefghijk1234`,
      "youtube",
    ).src,
    `https://www.youtube-nocookie.com/embed/${id}?list=PLabcdefghijk1234`,
  );
});
test("Spotify: músicas, álbuns, playlists e podcasts com localidade", () => {
  for (const type of ["track", "album", "playlist", "episode", "show"]) {
    const result = parseMusicLink(
      `https://open.spotify.com/intl-pt/${type}/0123456789abcdefghijkl?si=abc`,
      "spotify",
    );
    assert.equal(
      result.src,
      `https://open.spotify.com/embed/${type}/0123456789abcdefghijkl`,
    );
    assert.equal(parseMusicLink(result.src, "spotify").href, result.href);
  }
});
test("URLs inseguras, provedores falsos e IDs inválidos não viram iframes", () => {
  for (const [url, provider] of [
    ["javascript:alert(1)", "youtube"],
    ["http://youtu.be/dQw4w9WgXcQ", "youtube"],
    ["https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ", "youtube"],
    ["https://youtube.com@evil.test/watch?v=dQw4w9WgXcQ", "youtube"],
    ["https://user:password@youtube.com/watch?v=dQw4w9WgXcQ", "youtube"],
    ["https://youtu.be/short", "youtube"],
    ["https://youtube.com", "youtube"],
    ["https://open.spotify.com/track/bad", "spotify"],
    [
      "https://open.spotify.com.evil.test/track/0123456789abcdefghijkl",
      "spotify",
    ],
    ["https://open.spotify.com/user/0123456789abcdefghijkl", "spotify"],
    ["https://youtu.be/dQw4w9WgXcQ", "spotify"],
    ["https://youtube.com/playlist?list=<script>", "youtube"],
    ["not a URL", "youtube"],
    ["https://youtube.com:444/watch?v=dQw4w9WgXcQ", "youtube"],
  ])
    assert.throws(() => parseMusicLink(url, provider), url);
});
