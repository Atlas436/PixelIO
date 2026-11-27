const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1366, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
    await page.addInitScript(() => {
      let seed = 42;
      Math.random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
    });
    await page.goto(process.env.PIXEL_URL || "http://localhost:8080");
    await page.locator("#start").click();
    await page.locator("#system").waitFor({ state: "visible" });
    await page.locator('.desktop-app[data-app="solitaire"]').click();
    const app = page.locator(".spider-app");
    const win = page.locator('.window[data-app="solitaire"]');
    await page.locator(".spider-modes").waitFor();
    assert.equal(await page.locator(".spider-mode").count(), 3);
    assert.equal(await app.count(), 0);
    await page.locator('[data-mode="1"]').click();
    await app.waitFor({ state: "visible" });
    assert.equal(await app.locator(".spider-column").count(), 10);
    assert.equal(await app.locator(".spider-card").count(), 54);
    assert.equal(await app.locator(".face-down").count(), 44);
    assert.equal(await app.locator(".face-up").count(), 10);
    assert.equal(
      await app.locator('[data-stat="completed"]').textContent(),
      "0/8",
    );
    await app.locator(".spider-stock").click();
    assert.equal(await app.locator(".spider-card").count(), 64);
    assert.equal(await app.locator('[data-stat="moves"]').textContent(), "1");
    await app.getByRole("button", { name: "Desfazer", exact: true }).click();
    assert.equal(await app.locator(".spider-card").count(), 54);
    // Início preserva a partida; trocar modo exige confirmação, cancelável.
    for (const mode of [2, 4, 1]) {
      await app.getByRole("button", { name: "Início", exact: true }).click();
      assert(await page.locator(".spider-home").isVisible());
      await page.locator(`[data-mode="${mode}"]`).click();
      assert(await page.locator(".spider-start-confirm").isVisible());
      await page.keyboard.press("Escape");
      assert(await page.locator(".spider-start-confirm").isHidden());
      await page
        .getByRole("button", { name: "Continuar partida", exact: true })
        .click();
      assert.equal(await app.locator('[data-stat="moves"]').textContent(), "0");
      await app.getByRole("button", { name: "Início", exact: true }).click();
      await page.locator(`[data-mode="${mode}"]`).click();
      await page.locator('[data-start="yes"]').click();
      assert.match(
        await app.locator("[data-difficulty]").textContent(),
        new RegExp(`${mode} NAIPE`),
      );
      assert.equal(await app.locator(".spider-card").count(), 54);
      const suits = await app
        .locator(".face-up")
        .evaluateAll((cards) => [...new Set(cards.map((c) => c.dataset.suit))]);
      assert(
        suits.every((suit) =>
          ["spades", "hearts", "diamonds", "clubs"]
            .slice(0, mode)
            .includes(suit),
        ),
      );
      await app.locator(".spider-stock").click();
      await app.getByRole("button", { name: "Desfazer", exact: true }).click();
    }
    // Verifica todos os 52 valores/naipes, inclusive PNGs fora da mesa inicial.
    const provisional = await page.evaluate(async () => {
      const { cardImage } = await import("./js/spider-cards.js");
      const gallery = document.createElement("div");
      gallery.hidden = true;
      gallery.id = "test-card-gallery";
      let placeholders = 0;
      for (const suit of ["spades", "hearts", "diamonds", "clubs"])
        for (let rank = 1; rank <= 13; rank++) {
          const image = cardImage({ rank, suit, faceUp: true });
          if (image.tagName !== "IMG") placeholders++;
          gallery.append(image);
        }
      document.body.append(gallery);
      return placeholders;
    });
    assert.equal(provisional, 1);
    await page.waitForFunction(() =>
      [...document.querySelectorAll("#test-card-gallery img")].every(
        (i) => i.complete && i.naturalWidth > 0,
      ),
    );
    await page.locator("#test-card-gallery").evaluate((e) => e.remove());
    // Cenário controlado pelo módulo de regras, sem API de teste no produto.
    await page.evaluate(async () => {
      const { SpiderGame } = await import("./js/spider-rules.js");
      window.originalNewGame = SpiderGame.prototype.newGame;
      SpiderGame.prototype.newGame = function () {
        const c = (rank, faceUp = true, id = rank) => ({
          rank,
          faceUp,
          id,
          suit: "spades",
        });
        this.columns = [
          [c(10, false, 100), c(7, true, 101), c(6, true, 102)],
          [c(8, true, 103)],
          [c(9, true, 104)],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
        ];
        this.stock = [];
        this.completed = [];
        this.moves = 0;
        this.history = [];
      };
    });
    async function restart() {
      await app.getByRole("button", { name: "Novo jogo", exact: true }).click();
      await app
        .getByRole("button", { name: "Nova partida", exact: true })
        .click();
    }
    await app.getByRole("button", { name: "Novo jogo", exact: true }).click();
    assert(await app.locator(".spider-confirm").isVisible());
    await page.keyboard.press("Escape");
    assert(await app.locator(".spider-confirm").isHidden());
    assert.equal(await app.locator(".spider-card").count(), 54);
    await restart();
    const source = app.locator('[data-column="0"] [data-index="1"]');
    await source.click({ position: { x: 10, y: 8 } });
    assert.equal(await app.locator(".spider-card.selected").count(), 2);
    await app.locator('[data-destination="2"]').click();
    assert.equal(await app.locator('[data-stat="moves"]').textContent(), "0");
    await app.locator('[data-destination="1"]').click();
    assert.equal(await app.locator('[data-stat="moves"]').textContent(), "1");
    assert.equal(
      await app.locator('[data-column="1"] .spider-card').count(),
      3,
    );
    assert.equal(await app.locator(".face-down").count(), 0);
    await app.getByRole("button", { name: "Desfazer", exact: true }).click();
    assert.equal(await app.locator(".face-down").count(), 1);
    // O 9 mantém seu número preto durante hover.
    const nine = app.locator('[data-rank="9"] .spider-provisional');
    await nine.hover();
    assert.equal(
      await nine.evaluate((e) => getComputedStyle(e).color),
      "rgb(17, 17, 17)",
    );
    // Uma pilha inteira acompanha o ponteiro; soltar fora de um destino válido não joga.
    const sourceBox = await source.boundingBox();
    await page.mouse.move(sourceBox.x + 10, sourceBox.y + 8);
    await page.mouse.down();
    await page.mouse.move(sourceBox.x + 60, sourceBox.y + 30, { steps: 4 });
    assert.equal(
      await page.locator(".spider-drag-ghost .spider-card").count(),
      2,
    );
    await page.mouse.move(1200, 700);
    await page.mouse.up();
    assert.equal(await app.locator('[data-stat="moves"]').textContent(), "0");
    await page.waitForFunction(
      () => !document.querySelector(".spider-drag-ghost"),
    );
    // Escape cancela o arraste sem fazer uma jogada nem deixar cartas flutuando.
    await page.mouse.move(sourceBox.x + 10, sourceBox.y + 8);
    await page.mouse.down();
    await page.mouse.move(sourceBox.x + 45, sourceBox.y + 30, { steps: 3 });
    await page.keyboard.press("Escape");
    await page.mouse.up();
    assert.equal(await page.locator(".spider-drag-ghost").count(), 0);
    assert.equal(await app.locator('[data-stat="moves"]').textContent(), "0");
    // Arrastar uma sequência.
    await source.dragTo(app.locator('[data-column="1"] .spider-pile'), {
      sourcePosition: { x: 10, y: 8 },
      targetPosition: { x: 20, y: 110 },
    });
    assert.equal(await app.locator('[data-stat="moves"]').textContent(), "1");
    await app.getByRole("button", { name: "Desfazer", exact: true }).click();
    await app.getByRole("button", { name: "Dica", exact: true }).click();
    assert.equal(await app.locator(".hint-target").count(), 1);
    await page.keyboard.press("Escape");
    assert.equal(await app.locator(".selected").count(), 0);
    // Teclado: selecionar com Enter e mover pelo botão de destino.
    await source.focus();
    await page.keyboard.press("Enter");
    await app.locator('[data-destination="1"]').focus();
    await page.keyboard.press("Enter");
    assert.equal(await app.locator('[data-stat="moves"]').textContent(), "1");
    await win
      .getByRole("button", { name: "Minimizar Paciência", exact: true })
      .click();
    await page.locator('[data-task="solitaire"]').click();
    assert.equal(await app.locator('[data-stat="moves"]').textContent(), "1");
    await win
      .getByRole("button", { name: "Fechar Paciência", exact: true })
      .click();
    await page.locator('.desktop-app[data-app="solitaire"]').click();
    await page
      .getByRole("button", { name: "Continuar partida", exact: true })
      .click();
    assert.equal(await app.locator('[data-stat="moves"]').textContent(), "1");
    // A oitava sequência deve exibir a vitória.
    await page.evaluate(async () => {
      const { SpiderGame } = await import("./js/spider-rules.js");
      SpiderGame.prototype.newGame = function () {
        let id = 0;
        const c = (rank) => ({ rank, faceUp: true, id: id++, suit: "spades" });
        this.completed = Array.from({ length: 7 }, () =>
          Array.from({ length: 13 }, (_, i) => c(13 - i)),
        );
        this.columns = [
          Array.from({ length: 12 }, (_, i) => c(13 - i)),
          [c(1)],
          ...Array.from({ length: 8 }, () => []),
        ];
        this.stock = [];
        this.moves = 0;
        this.history = [];
      };
    });
    await restart();
    await app.locator('[data-column="1"] .face-up').click();
    await app.locator('[data-destination="0"]').click();
    assert.equal(
      await app.locator('[data-stat="completed"]').textContent(),
      "8/8",
    );
    assert.match(
      await app.locator(".spider-message").textContent(),
      /Você venceu/,
    );
    assert(
      await page
        .locator("#notifications-toggle")
        .evaluate((e) => e.classList.contains("has-notification")),
    );
    const notificationsBefore = await page.evaluate(async () => {
      const { getNotifications } = await import("./js/notifications.js");
      return getNotifications().length;
    });
    await page.keyboard.press("Escape");
    assert.equal(
      await page.evaluate(async () => {
        const { getNotifications } = await import("./js/notifications.js");
        return getNotifications().length;
      }),
      notificationsBefore,
    );
    await app.getByRole("button", { name: "Desfazer", exact: true }).click();
    assert.equal(
      await app.locator('[data-stat="completed"]').textContent(),
      "7/8",
    );
    // Retoma o jogo real para verificar imagens, layout e toque.
    await page.evaluate(async () => {
      const { SpiderGame } = await import("./js/spider-rules.js");
      SpiderGame.prototype.newGame = window.originalNewGame;
    });
    await restart();
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".spider-app img")].every(
        (i) => i.complete && i.naturalWidth > 0,
      ),
    );
    assert.deepEqual(errors, []);
    await win
      .getByRole("button", { name: "Maximizar Paciência", exact: true })
      .click();
    await page.setViewportSize({ width: 360, height: 640 });
    const bounds = await win.boundingBox();
    assert(
      bounds.x >= 0 &&
        bounds.y >= 0 &&
        bounds.width <= 360 &&
        bounds.height <= 584,
    );
    await app.locator(".spider-scroll").evaluate((e) => {
      e.scrollLeft = e.scrollWidth;
    });
    assert(
      await app.locator(".spider-scroll").evaluate((e) => e.scrollLeft > 0),
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      360,
    );
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const touchPage = await mobile.newPage();
    await touchPage.goto(process.env.PIXEL_URL || "http://localhost:8080");
    await touchPage.locator("#start").tap();
    await touchPage.locator("#system").waitFor({ state: "visible" });
    await touchPage.locator('.desktop-app[data-app="solitaire"]').tap();
    await touchPage.locator('[data-mode="2"]').tap();
    await touchPage.locator(".spider-card.face-up").first().tap();
    assert((await touchPage.locator(".spider-card.selected").count()) > 0);
    const touchSource = await touchPage
      .locator(".spider-card.face-up")
      .first()
      .boundingBox();
    const touchSession = await mobile.newCDPSession(touchPage);
    const x = Math.round(touchSource.x + 10),
      y = Math.round(touchSource.y + 12);
    await touchSession.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await touchSession.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 30, y: y + 20 }],
    });
    assert.equal(
      await touchPage.locator(".spider-drag-ghost .spider-card").count(),
      1,
    );
    await touchSession.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await touchPage.waitForFunction(
      () => !document.querySelector(".spider-drag-ghost"),
    );
    assert.equal(
      await touchPage.locator('[data-stat="moves"]').textContent(),
      "0",
    );
    await mobile.close();
    console.log(
      "PASS Spider: regras integradas, distribuir/desfazer, seleção, movimento inválido, arraste, teclado, dica, confirmação, persistência da sessão, vitória, imagens, três dificuldades, início, confirmação de troca, mobile e toque.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
