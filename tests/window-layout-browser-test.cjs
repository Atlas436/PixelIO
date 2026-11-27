const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1400, height: 900 },
      hasTouch: true,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.PIXEL_URL || "http://localhost:8082");
    await page.locator("#start").click();
    await page.locator("#system").waitFor({ state: "visible" });
    await page.locator('.desktop-app[data-app="assistant"]').click();
    const guide = page.locator('.window[data-app="assistant"]');
    const original = await guide.boundingBox();
    async function drag(handle, dx, dy) {
      const box = await handle.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        box.x + box.width / 2 + dx,
        box.y + box.height / 2 + dy,
        { steps: 8 },
      );
      await page.mouse.up();
    }
    await drag(guide.locator('[data-resize="se"]'), 100, 60);
    const grown = await guide.boundingBox();
    assert.ok(
      grown.width > original.width + 90 && grown.height > original.height + 50,
    );
    await drag(guide.locator('[data-resize="nw"]'), -50, -20);
    const resized = await guide.boundingBox();
    assert.ok(resized.width > grown.width + 40);
    assert.ok(resized.x < grown.x);
    await page.keyboard.press("Alt+Shift+ArrowLeft");
    assert.equal(await guide.getAttribute("data-layout"), "left");
    const left = await guide.boundingBox();
    assert.equal(left.x, 0);
    assert.equal(left.width, 700);
    await guide.locator(".window-title").click();
    assert.equal(await guide.getAttribute("data-layout"), "left");
    await page.locator("#menu-toggle").click();
    await page
      .locator("#app-list")
      .getByRole("button", { name: "Notas", exact: true })
      .click();
    const notes = page.locator('.window[data-app="notes"]');
    await page.keyboard.press("Alt+Shift+ArrowRight");
    const right = await notes.boundingBox();
    assert.equal(right.x, 700);
    assert.equal(right.width, 700);
    assert.equal(right.y, left.y);
    assert.equal(right.height, left.height);
    await notes.getByRole("button", { name: "Nova nota", exact: true }).click();
    await notes.locator("#note-body").fill("Duas janelas lado a lado.");
    await page.keyboard.press("ArrowLeft");
    assert.equal(await notes.getAttribute("data-layout"), "right");
    await page.screenshot({ path: "/workspace/work/windows-side-by-side.png" });
    await page.keyboard.press("Alt+Shift+ArrowUp");
    assert.equal(
      await notes
        .locator("#note-body")
        .evaluate((input) => input === document.activeElement),
      true,
    );
    assert.equal(await notes.getAttribute("data-layout"), "maximized");
    await page
      .getByRole("button", { name: "Restaurar Notas", exact: true })
      .click();
    assert.equal(await notes.getAttribute("data-layout"), "right");
    await page.keyboard.press("Alt+Shift+ArrowDown");
    assert.equal(await notes.getAttribute("data-layout"), "free");
    assert.equal(
      await notes.locator("#note-body").inputValue(),
      "Duas janelas lado a lado.",
    );
    await guide
      .getByRole("button", { name: "Organizar Assistente IA", exact: true })
      .click();
    await guide
      .getByRole("button", { name: "Restaurar tamanho", exact: true })
      .click();
    const restored = await guide.boundingBox();
    assert.equal(restored.width, resized.width);
    assert.equal(restored.height, resized.height);
    await guide
      .getByRole("button", { name: "Organizar Assistente IA", exact: true })
      .click();
    await guide
      .getByRole("button", { name: "Encaixar à esquerda", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Minimizar Assistente IA", exact: true })
      .click();
    await page.locator('[data-task="assistant"]').click();
    assert.equal(await guide.getAttribute("data-layout"), "left");
    await drag(guide.locator(".window-title"), 40, 60);
    assert.equal(await guide.getAttribute("data-layout"), "free");
    assert.equal((await guide.boundingBox()).width, resized.width);
    await page.keyboard.press("Alt+Shift+ArrowLeft");
    await page.setViewportSize({ width: 1000, height: 800 });
    await page.waitForFunction(
      () =>
        document
          .querySelector('.window[data-app="assistant"]')
          .getBoundingClientRect().width === 500,
    );
    assert.equal((await guide.boundingBox()).width, 500);
    await page.setViewportSize({ width: 360, height: 740 });
    await page.waitForFunction(
      () =>
        document
          .querySelector('.window[data-app="assistant"]')
          .getBoundingClientRect().width === 360,
    );
    assert.equal((await guide.boundingBox()).width, 360);
    await guide
      .getByRole("button", { name: "Organizar Assistente IA", exact: true })
      .tap();
    assert.equal(
      await guide
        .getByRole("button", { name: "Encaixar à esquerda", exact: true })
        .isDisabled(),
      true,
    );
    await guide
      .getByRole("button", { name: "Restaurar tamanho", exact: true })
      .tap();
    assert.equal((await guide.boundingBox()).width, 360);
    await page.screenshot({
      path: "/workspace/work/windows-layout-mobile.png",
    });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      360,
    );
    await page.setViewportSize({ width: 1400, height: 900 });
    await guide
      .getByRole("button", { name: "Organizar Assistente IA", exact: true })
      .click();
    await page.keyboard.press("Escape");
    assert.equal(await guide.locator(".window-layout-menu").isHidden(), true);
    assert.deepEqual(errors, []);
    console.log(
      "PASS layout: resize por cantos, limites, atalhos, duas janelas, texto preservado, restaurar tamanho, maximizar, menu, minimizar/restaurar, viewport e toque.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
