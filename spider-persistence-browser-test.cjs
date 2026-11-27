const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 850 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const url = process.env.PIXEL_URL || "http://localhost:8084";
    async function boot() {
      await page.goto(url);
      await page.locator("#start").click();
      await page.locator("#system").waitFor({ state: "visible" });
      await page.locator('.desktop-app[data-app="solitaire"]').click();
      await page.locator(".spider-modes").waitFor();
    }
    async function saved() {
      await page.waitForFunction(
        () =>
          document.querySelector(".spider-save-status")?.textContent ===
          "Partida salva neste navegador.",
      );
    }
    async function record() {
      return page.evaluate(async () => {
        const s = await import("./js/spider-storage.js");
        return s.loadSpiderRecord();
      });
    }
    await boot();
    await page.locator('[data-mode="2"]').click();
    await saved();
    await page.locator(".spider-stock").click();
    await saved();
    const afterDeal = await record();
    assert.equal(afterDeal.state.moves, 1);
    assert.equal(afterDeal.state.suitCount, 2);
    assert.equal(afterDeal.history.length, 1);
    await boot();
    await page
      .getByRole("button", { name: "Continuar partida", exact: true })
      .click();
    assert.equal(await page.locator('[data-stat="moves"]').textContent(), "1");
    assert.equal(await page.locator(".spider-card").count(), 64);
    assert.equal(
      await page.locator("[data-difficulty]").textContent(),
      "MÉDIO · 2 NAIPES",
    );
    await page.getByRole("button", { name: "Desfazer", exact: true }).click();
    await saved();
    assert.equal((await record()).state.moves, 0);
    await boot();
    await page
      .getByRole("button", { name: "Continuar partida", exact: true })
      .click();
    assert.equal(await page.locator(".spider-card").count(), 54);
    await page.getByRole("button", { name: "Novo jogo", exact: true }).click();
    await page
      .getByRole("button", { name: "Continuar jogando", exact: true })
      .click();
    assert.equal((await record()).state.suitCount, 2);
    await page.getByRole("button", { name: "Início", exact: true }).click();
    await page.locator('[data-mode="4"]').click();
    await page
      .getByRole("button", { name: "Começar nova partida", exact: true })
      .click();
    await saved();
    assert.equal((await record()).state.suitCount, 4);
    // Storage is isolated from documents; pre-existing notes remain available.
    await page.evaluate(async () => {
      const s = await import("./js/documents-store.js");
      await s.saveNote({
        id: "preservada",
        title: "Nota existente",
        body: "Intacta",
        createdAt: 1,
        updatedAt: 1,
      });
    });
    await boot();
    assert.equal(
      await page.evaluate(async () => {
        const s = await import("./js/documents-store.js");
        return (await s.getNote("preservada")).body;
      }),
      "Intacta",
    );
    await page.evaluate(async () => {
      const s = await import("./js/spider-storage.js");
      await s.saveSpiderRecord({
        id: "current",
        version: 1,
        state: { bad: true },
        history: [],
      });
    });
    await boot();
    assert.equal(
      await page
        .getByRole("button", { name: "Continuar partida", exact: true })
        .count(),
      0,
    );
    assert.match(
      await page.locator(".spider-save-status").textContent(),
      /Não foi possível recuperar/,
    );
    await page.locator('[data-mode="1"]').click();
    await saved();
    const blocked = await browser.newPage();
    await blocked.addInitScript(() => {
      IDBFactory.prototype.open = function () {
        throw new Error("blocked");
      };
    });
    await blocked.goto(url);
    await blocked.locator("#start").click();
    await blocked.locator("#system").waitFor({ state: "visible" });
    await blocked.locator('.desktop-app[data-app="solitaire"]').click();
    await blocked.locator('[data-mode="1"]').click();
    await blocked.waitForFunction(() =>
      document
        .querySelector(".spider-save-status")
        ?.textContent.includes("Não foi possível salvar"),
    );
    await blocked.locator(".spider-stock").click();
    assert.equal(
      await blocked.locator('[data-stat="moves"]').textContent(),
      "1",
    );
    await page.setViewportSize({ width: 360, height: 740 });
    await page.screenshot({ path: "/workspace/work/spider-saved-mobile.png" });
    assert.deepEqual(errors, []);
    console.log(
      "PASS Spider persistente: recarregar, dificuldade, baralho, desfazer, cancelamento, troca de modo, notas preservadas, registro inválido e armazenamento bloqueado.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
