const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1366, height: 900 },
      acceptDownloads: true,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const png = await fs.readFile("assets/icones/galeria.png");
    const image = {
      name: "Minha imagem.png",
      mimeType: "image/png",
      buffer: png,
    };
    async function boot() {
      await page.goto(process.env.PIXEL_URL || "http://localhost:8080");
      await page.locator("#start").click();
      await page.locator("#system").waitFor({ state: "visible" });
    }
    async function open(id) {
      await page.locator(`.desktop-app[data-app="${id}"]`).dblclick();
    }
    async function savedImages(n) {
      await page.waitForFunction(async (n) => {
        const s = await import("./js/documents-store.js");
        const notes = await s.listNotes();
        return notes.some((note) => (note.images || []).length === n);
      }, n);
    }
    await boot();
    await open("gallery");
    const gallery = page.locator(".gallery-app");
    await gallery.locator(".gallery-input").setInputFiles(image);
    await gallery.locator("[data-image-id]").waitFor();
    assert.equal(
      await page.evaluate(async () => {
        const s = await import("./js/documents-store.js");
        return (await s.listFiles()).length;
      }),
      1,
    );
    await gallery.locator("[data-image-id]").click();
    const download = page.waitForEvent("download");
    await gallery
      .getByRole("button", { name: "Baixar imagem no PC", exact: true })
      .click();
    const d = await download;
    assert.equal(d.suggestedFilename(), image.name);
    assert.deepEqual(await fs.readFile(await d.path()), png);
    await gallery.locator(".gallery-input").setInputFiles({
      name: "quebrada.png",
      mimeType: "image/png",
      buffer: Buffer.from("não é png"),
    });
    await page.waitForFunction(() =>
      document
        .querySelector(".gallery-app .document-status")
        .textContent.includes("Não foi possível abrir"),
    );
    assert.equal(await gallery.locator("[data-image-id]").count(), 1);
    await gallery.locator(".gallery-input").setInputFiles({
      name: "desenho.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg/>"),
    });
    await page.waitForFunction(() =>
      document
        .querySelector(".gallery-app .document-status")
        .textContent.includes("Escolha uma imagem"),
    );
    await open("notes");
    const notes = page.locator(".notes-app");
    await notes.getByRole("button", { name: "Nova nota", exact: true }).click();
    await notes.locator("#note-title").fill("Fotos <script>");
    await notes
      .locator("#note-body")
      .fill("Meu texto <img src=x onerror=alert(1)>");
    await notes
      .getByRole("button", { name: "Imagem da Galeria", exact: true })
      .click();
    await notes.locator("[data-pick-image]").click();
    await notes.locator(".note-images figure").waitFor();
    await savedImages(1);
    await notes
      .locator("input[type=file]")
      .setInputFiles({ ...image, name: "Segunda.png" });
    await savedImages(2);
    assert.equal(await notes.locator(".note-images figure").count(), 2);
    const firstId = await notes
      .locator(".note-images figure")
      .first()
      .getAttribute("data-attachment-id");
    await notes
      .locator(".note-image-caption")
      .first()
      .fill("Minha legenda <script>");
    await notes
      .getByRole("button", { name: "Descer imagem", exact: true })
      .first()
      .click();
    assert.equal(
      await notes
        .locator(".note-images figure")
        .last()
        .getAttribute("data-attachment-id"),
      firstId,
    );
    assert.equal(
      await notes.locator(".note-image-caption").last().inputValue(),
      "Minha legenda <script>",
    );
    await notes
      .getByRole("button", { name: "Salvar agora", exact: true })
      .click();
    await notes
      .getByRole("button", { name: "Exportar com imagens", exact: true })
      .click();
    await page.waitForFunction(async () => {
      const s = await import("./js/documents-store.js");
      return (await s.listFiles()).some((f) => f.name.endsWith(".html"));
    });
    const html = await page.evaluate(async () => {
      const s = await import("./js/documents-store.js");
      return await (
        await s.listFiles()
      )
        .find((f) => f.name.endsWith(".html"))
        .blob.text();
    });
    assert.equal((html.match(/src="data:image\/png;base64,/g) || []).length, 2);
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("Minha legenda &lt;script&gt;"));
    await notes
      .getByRole("button", { name: "Exportar .txt", exact: true })
      .click();
    await page.waitForFunction(async () => {
      const s = await import("./js/documents-store.js");
      return (await s.listFiles()).some((f) => f.name.endsWith(".txt"));
    });
    // Delete gallery original: note copies survive.
    await page
      .locator('.window[data-app="notes"] button[aria-label="Minimizar Notas"]')
      .click();
    await gallery
      .getByRole("button", { name: "Excluir imagem", exact: true })
      .click();
    await gallery
      .locator(".document-dialog")
      .getByRole("button", { name: "Excluir", exact: true })
      .click();
    await page.waitForFunction(
      () => !document.querySelector(".gallery-app [data-image-id]"),
    );
    await boot();
    await open("notes");
    await notes.locator("[data-note-id]").click();
    assert.equal(await notes.locator(".note-images figure").count(), 2);
    assert.equal(
      await notes
        .locator(".note-images figure")
        .last()
        .getAttribute("data-attachment-id"),
      firstId,
    );
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".note-images img")].every(
        (i) => i.complete && i.naturalWidth > 0,
      ),
    );
    assert.equal(
      await notes.locator("#note-body").inputValue(),
      "Meu texto <img src=x onerror=alert(1)>",
    );
    await notes
      .getByRole("button", { name: "Remover imagem da nota", exact: true })
      .first()
      .click();
    await notes
      .locator(".document-dialog")
      .getByRole("button", { name: "Cancelar", exact: true })
      .click();
    assert.equal(await notes.locator(".note-images figure").count(), 2);
    await notes
      .getByRole("button", { name: "Remover imagem da nota", exact: true })
      .first()
      .click();
    await notes
      .locator(".document-dialog")
      .getByRole("button", { name: "Excluir", exact: true })
      .click();
    await savedImages(1);
    assert.equal(
      await notes.locator(".note-image-caption").first().inputValue(),
      "Minha legenda <script>",
    );
    await page.setViewportSize({ width: 360, height: 740 });
    await page.waitForTimeout(200);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      360,
    );
    await page.screenshot({ path: "/workspace/work/notes-images-mobile.png" });
    await page
      .locator('.window[data-app="notes"] button[aria-label="Minimizar Notas"]')
      .click();
    await open("gallery");
    await gallery.locator(".gallery-input").setInputFiles(image);
    await gallery.locator("[data-image-id]").waitFor();
    await gallery.locator("[data-image-id]").click();
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".gallery-app img")].every(
        (i) => i.complete && i.naturalWidth > 0,
      ),
    );
    assert.equal(
      await gallery
        .getByRole("button", { name: "Excluir imagem", exact: true })
        .evaluate((button) => {
          const b = button.getBoundingClientRect(),
            p = button.closest(".gallery-preview").getBoundingClientRect();
          return b.top >= p.top && b.bottom <= p.bottom;
        }),
      true,
    );
    await page.screenshot({ path: "/workspace/work/gallery-mobile.png" });
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.screenshot({ path: "/workspace/work/gallery-desktop.png" });
    assert.deepEqual(errors, []);
    console.log(
      "PASS imagens: importação, validação, bytes originais, Galeria/Arquivos compartilhados, cópias nas notas, exportação HTML segura, TXT, persistência, remoção confirmada e mobile.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
