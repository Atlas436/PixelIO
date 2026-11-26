const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
function wav() {
  const size = 8000 * 20 * 2;
  const b = Buffer.alloc(44 + size);
  b.write("RIFF");
  b.writeUInt32LE(36 + size, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24);
  b.writeUInt32LE(16000, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(size, 40);
  for (let i = 0; i < size / 2; i++)
    b.writeInt16LE(
      Math.round(Math.sin((i / 8000) * 440 * 2 * Math.PI) * 100),
      44 + i * 2,
    );
  return b;
}
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    args: ["--no-sandbox"],
  });
  try {
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage({
      viewport: { width: 1366, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    // Os iframes são isolados do teste: checamos URLs e ciclo de vida, não disponibilidade/licenciamento dos serviços.
    await page.route("https://www.youtube-nocookie.com/**", (r) =>
      r.fulfill({ contentType: "text/html", body: "<p>Player externo</p>" }),
    );
    await page.route("https://www.youtube.com/iframe_api", (r) => r.abort());
    await page.route("https://open.spotify.com/embed/iframe-api/v1", (r) =>
      r.abort(),
    );
    await page.route("https://open.spotify.com/embed/**", (r) =>
      r.request().resourceType() === "script"
        ? r.abort()
        : r.fulfill({
            contentType: "text/html",
            body: "<p>Player externo</p>",
          }),
    );
    await page.addInitScript(() => {
      window.revoked = [];
      const original = URL.revokeObjectURL;
      URL.revokeObjectURL = (url) => {
        window.revoked.push(url);
        original.call(URL, url);
      };
    });
    await page.goto(process.env.PIXEL_URL || "http://localhost:8080");
    await page.locator("#start").click();
    await page.locator("#system").waitFor({ state: "visible" });
    assert.equal(await page.locator("#desktop .app-icon img").count(), 8);
    await page.waitForFunction(() =>
      [...document.querySelectorAll("#desktop img")].every(
        (i) => i.complete && i.naturalWidth > 0,
      ),
    );
    await page.locator('.desktop-app[data-app="music"]').click();
    const app = page.locator(".music-app");
    await app.waitFor();
    assert(
      await app
        .getByRole("button", { name: "Reproduzir", exact: true })
        .isDisabled(),
    );
    const sound = wav();
    await app.locator("#music-files").setInputFiles([
      { name: "primeira.wav", mimeType: "audio/wav", buffer: sound },
      { name: "segunda.wav", mimeType: "audio/wav", buffer: sound },
      {
        name: "nao-audio.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("texto"),
      },
    ]);
    assert.equal(await app.locator(".music-track").count(), 2);
    assert.match(await app.locator(".music-status").textContent(), /ignorado/);
    await page.waitForFunction(
      () => document.querySelector(".music-app audio").readyState >= 1,
    );
    await app.getByRole("button", { name: "Reproduzir", exact: true }).click();
    await page.waitForFunction(
      () => !document.querySelector(".music-app audio").paused,
    );
    assert.equal(await app.locator("audio").evaluate((a) => a.volume), 0.7);
    await page.locator("#volume-toggle").click();
    await page.locator("#volume-level").fill("0");
    assert.equal(await app.locator("audio").evaluate((a) => a.volume), 0);
    await page.keyboard.press("Escape");
    await app.getByRole("button", { name: "Pausar", exact: true }).click();
    assert(await app.locator("audio").evaluate((a) => a.paused));
    await app.locator("#music-seek").fill("50");
    assert((await app.locator("audio").evaluate((a) => a.currentTime)) > 9);
    await app
      .getByRole("button", { name: "Próxima música", exact: true })
      .click();
    assert.equal(await app.locator(".music-now").textContent(), "segunda.wav");
    await app
      .getByRole("button", { name: "Música anterior", exact: true })
      .click();
    assert.equal(await app.locator(".music-now").textContent(), "primeira.wav");
    // Minimizar preserva áudio; fechar interrompe e libera os arquivos.
    await page
      .locator('.window[data-app="music"]')
      .getByRole("button", { name: "Minimizar Música", exact: true })
      .click();
    assert(!(await app.locator("audio").evaluate((a) => a.paused)));
    await page.locator('[data-task="music"]').click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      app.locator(".music-download").click(),
    ]);
    assert.equal(download.suggestedFilename(), "primeira.wav");
    await app.getByRole("tab", { name: "YouTube", exact: true }).click();
    assert(!(await app.locator("audio").evaluate((a) => a.paused)));
    await app
      .locator("#music-link-youtube")
      .fill("https://evil.test/watch?v=dQw4w9WgXcQ");
    await app.locator('#music-youtube button[type="submit"]').click();
    assert.equal(await page.locator(".media-dock iframe").count(), 0);
    await app
      .locator("#music-link-youtube")
      .fill("https://youtu.be/dQw4w9WgXcQ");
    await app.locator('#music-youtube button[type="submit"]').click();
    const youtubeURL = new URL(
      await page.locator(".media-dock iframe").getAttribute("src"),
    );
    assert.equal(
      youtubeURL.origin + youtubeURL.pathname,
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    assert.equal(youtubeURL.searchParams.get("enablejsapi"), "1");
    await app.getByRole("tab", { name: "Spotify", exact: true }).click();
    assert.equal(await page.locator(".media-dock iframe").count(), 1);
    await app
      .locator("#music-link-spotify")
      .fill("https://open.spotify.com/track/0123456789abcdefghijkl");
    await app.locator('#music-spotify button[type="submit"]').click();
    assert.equal(
      await page.locator(".media-dock iframe").getAttribute("src"),
      "https://open.spotify.com/embed/track/0123456789abcdefghijkl",
    );
    await app.getByRole("tab", { name: "Spotify", exact: true }).focus();
    await page.keyboard.press("Home");
    assert(await app.locator("#music-local").isVisible());
    assert.equal(await page.locator(".media-dock iframe").count(), 1);
    await app
      .getByRole("button", { name: "Remover segunda.wav", exact: true })
      .click();
    assert.equal(await app.locator(".music-track").count(), 1);
    const oldAudio = await app.locator("audio").elementHandle();
    await page
      .locator('.window[data-app="music"]')
      .getByRole("button", { name: "Fechar Música", exact: true })
      .click();
    assert(await oldAudio.evaluate((a) => a.paused && !a.hasAttribute("src")));
    assert.equal(await page.evaluate(() => window.revoked.length), 2);
    await page.locator('.desktop-app[data-app="music"]').click();
    assert.equal(await page.locator(".music-track").count(), 0);
    await page.setViewportSize({ width: 360, height: 640 });
    await page.waitForFunction(
      () =>
        document.querySelector('.window[data-app="music"]').offsetWidth <=
        innerWidth,
    );
    assert((await app.boundingBox()).width <= 360);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      360,
    );
    await app.locator("#music-files").setInputFiles({
      name: "reinicio.wav",
      mimeType: "audio/wav",
      buffer: sound,
    });
    await page.locator("#power-toggle").click();
    await page.locator("#shutdown").click();
    assert.equal(await page.locator(".music-app").count(), 0);
    assert.equal(await page.evaluate(() => window.revoked.length), 3);
    assert.deepEqual(errors, []);
    console.log(
      "PASS Música: ícones, áudio WAV real, fila, pausa, seek, volume da barra, minimizar, download local, links, abas, limpeza ao fechar/encerrar e tela pequena.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
