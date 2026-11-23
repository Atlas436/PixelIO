const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (require("node:fs").existsSync("/usr/bin/chromium")
        ? "/usr/bin/chromium"
        : undefined),
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  await page.goto(process.env.PIXEL_URL || "http://localhost:8080");
  await page.locator("#start").click();
  await page.locator("#boot").waitFor({ state: "visible" });
  await page.locator("#system").waitFor({ state: "visible" });
  assert.equal(await page.locator(".desktop-app").count(), 10);
  const files = page.locator('.desktop-app[data-app="files"]');
  await files.click();
  assert.equal(await page.locator(".window").count(), 0);
  await files.dblclick();
  const win = page.locator('.window[data-app="files"]');
  await win.waitFor();
  await win
    .getByRole("button", { name: "Maximizar Arquivos", exact: true })
    .click();
  assert(await win.evaluate((e) => e.classList.contains("maximized")));
  await win
    .getByRole("button", { name: "Restaurar Arquivos", exact: true })
    .click();
  assert(!(await win.evaluate((e) => e.classList.contains("maximized"))));
  await win
    .getByRole("button", { name: "Minimizar Arquivos", exact: true })
    .click();
  assert(await win.isHidden());
  await page.locator('[data-task="files"]').click();
  assert(await win.isVisible());
  // arraste além dos limites; a janela deve continuar inteiramente visível.
  const title = await win.locator(".window-title").boundingBox();
  await page.mouse.move(title.x + 20, title.y + 8);
  await page.mouse.down();
  await page.mouse.move(-800, -800);
  await page.mouse.up();
  let box = await win.boundingBox();
  assert(box.x >= 0 && box.y >= 0);
  const menu = page.locator("#menu-toggle");
  await menu.click();
  assert(await page.locator("#app-menu").isVisible());
  await page.locator(".menu-app").filter({ hasText: "Notas" }).click();
  assert.equal(await page.locator(".window").count(), 2);
  assert.equal(
    await page.locator(".window.active").getAttribute("data-app"),
    "notes",
  );
  await page.locator('[data-task="files"]').click();
  assert.equal(
    await page.locator(".window.active").getAttribute("data-app"),
    "files",
  );
  await win
    .getByRole("button", { name: "Fechar Arquivos", exact: true })
    .click();
  assert.equal(await page.locator('[data-task="files"]').count(), 0);
  assert.equal(
    await page.locator(".window.active").getAttribute("data-app"),
    "notes",
  );
  // Todos os aplicativos abrem pelo menu e a mesma aplicação não duplica janelas.
  for (const name of [
    "Arquivos",
    "Música",
    "Terminal",
    "Notas",
    "Assistente IA",
    "Paciência",
    "Pixel Studio",
    "Configurações",
    "Galeria",
    "Sobre",
  ]) {
    await menu.click();
    await page
      .locator("#app-list")
      .getByRole("button", { name, exact: true })
      .click();
  }
  assert.equal(await page.locator(".window").count(), 10);
  await page.locator("#notifications-toggle").click();
  assert(await page.locator("#notifications-panel").isVisible());
  await page.keyboard.press("Escape");
  assert(await page.locator("#notifications-panel").isHidden());
  await page.locator("#volume-toggle").click();
  await page.locator("#volume-level").fill("25");
  assert.equal(await page.locator("#volume-value").textContent(), "25%");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() =>
    [...document.images].every((image) => image.complete),
  );
  const badImages = await page
    .locator("img")
    .evaluateAll((images) =>
      images.filter((i) => !i.complete || !i.naturalWidth).map((i) => i.src),
    );
  assert.deepEqual(badImages, []);

  await page.setViewportSize({ width: 360, height: 640 });
  await page.waitForTimeout(100);
  for (const w of await page.locator(".window").all()) {
    const b = await w.boundingBox();
    assert(
      b.x >= 0 && b.y >= 0 && b.x + b.width <= 361 && b.y + b.height <= 585,
      JSON.stringify(b),
    );
  }
  await page
    .locator(".window.active")
    .getByRole("button", { name: /Maximizar/ })
    .click();

  await page.locator("#power-toggle").click();
  await page.locator("#shutdown").click();
  assert(await page.locator("#welcome").isVisible());
  assert.equal(await page.locator(".window").count(), 0);
  await page.locator("#start").click();
  await page.locator("#system").waitFor({ state: "visible" });
  assert.equal(await page.locator(".task").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: apresentação, boot, 10 apps, seleção, abertura, foco, minimizar/restaurar, maximizar/restaurar, arraste, fechar, menu, painéis, imagens, mobile, encerrar e reiniciar.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
