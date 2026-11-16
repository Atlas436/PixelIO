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
      viewport: { width: 1280, height: 800 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const url = process.env.PIXEL_URL || "http://localhost:8080";
    async function boot(p) {
      await p.goto(url);
      await p.locator("#start").click();
      await p.locator("#system").waitFor({ state: "visible" });
    }
    await boot(page);
    assert(
      !(await page
        .locator("#system")
        .evaluate((e) => e.classList.contains("taskbar-autohide"))),
    );
    await page.locator('.desktop-app[data-app="settings"]').dblclick();
    assert.equal(await page.locator(".settings-app").count(), 1);
    assert.equal(
      await page
        .locator('.desktop-app[data-app="settings"] .settings-icon')
        .count(),
      1,
    );
    const toggle = page.locator("#taskbar-autohide");
    await toggle.check();
    await page.waitForFunction(() =>
      document.querySelector("#system").classList.contains("taskbar-hidden"),
    );
    await page.waitForFunction(
      () =>
        document.querySelector("#taskbar").getBoundingClientRect().top >=
        innerHeight - 1,
    );
    assert.equal(
      await page.evaluate(
        () =>
          document.querySelector("#workspace").getBoundingClientRect().bottom,
      ),
      800,
    );
    await page.mouse.move(640, 799);
    await page.waitForFunction(
      () =>
        !document.querySelector("#system").classList.contains("taskbar-hidden"),
    );
    await page.locator("#menu-toggle").click();
    await page.mouse.move(900, 300);
    assert(await page.locator("#app-menu").isVisible());
    assert(
      !(await page
        .locator("#system")
        .evaluate((e) => e.classList.contains("taskbar-hidden"))),
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "menu-toggle",
    );
    // Enquanto houver foco na barra, ela fica visível.
    await page.keyboard.press("Alt+KeyT");
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "menu-toggle",
    );
    await page.locator(".settings-app h3").click();
    await page.waitForFunction(() =>
      document.querySelector("#system").classList.contains("taskbar-hidden"),
    );
    // Aviso interno: revela por cinco segundos, sem mudar o foco.
    await toggle.focus();
    const before = await page.evaluate(() => document.activeElement.id);
    await page.evaluate(async () => {
      const { notifyApp } = await import("./js/notifications.js");
      notifyApp("solitaire", "Partida concluída para teste.");
    });
    await page.waitForFunction(
      () =>
        !document.querySelector("#system").classList.contains("taskbar-hidden"),
    );
    assert.equal(await page.evaluate(() => document.activeElement.id), before);
    assert(
      await page
        .locator("#notifications-toggle")
        .evaluate((e) => e.classList.contains("has-notification")),
    );
    await page.waitForFunction(
      () =>
        document.querySelector("#system").classList.contains("taskbar-hidden"),
      null,
      { timeout: 8000 },
    );
    await page.keyboard.press("Alt+KeyT");
    await page.locator("#notifications-toggle").click();
    assert.match(
      await page.locator("#notification-list").textContent(),
      /Partida concluída/,
    );
    assert(
      !(await page
        .locator("#notifications-toggle")
        .evaluate((e) => e.classList.contains("has-notification"))),
    );
    await page.keyboard.press("Escape");
    await toggle.uncheck();
    assert(
      !(await page
        .locator("#system")
        .evaluate((e) => e.classList.contains("taskbar-autohide"))),
    );
    assert.equal(
      await page.evaluate(() =>
        localStorage.getItem("pixel-oi:taskbar-autohide"),
      ),
      "false",
    );
    assert.equal(
      await page.evaluate(
        () =>
          document.querySelector("#workspace").getBoundingClientRect().bottom,
      ),
      740,
    );
    await toggle.check();
    await boot(page);
    assert(
      await page
        .locator("#system")
        .evaluate((e) => e.classList.contains("taskbar-autohide")),
    );
    await page.locator('.desktop-app[data-app="settings"]').dblclick();
    assert(await toggle.isChecked());
    // O modo maximizado acompanha a alteração da área útil.
    await page
      .locator('.window[data-app="settings"]')
      .getByRole("button", { name: "Maximizar Configurações", exact: true })
      .click();
    assert.equal(
      (await page.locator('.window[data-app="settings"]').boundingBox()).height,
      800,
    );
    await toggle.uncheck();
    assert.equal(
      (await page.locator('.window[data-app="settings"]').boundingBox()).height,
      740,
    );
    await toggle.check();
    await page.locator("#taskbar-reveal").evaluate((e) => e.blur());
    await page.waitForFunction(() =>
      document.querySelector("#system").classList.contains("taskbar-hidden"),
    );
    await page.mouse.move(640, 799);
    assert(
      !(await page
        .locator("#system")
        .evaluate((e) => e.classList.contains("taskbar-hidden"))),
    );
    assert.deepEqual(errors, []);
    // Configuração continua utilizável sem localStorage.
    const restricted = await browser.newPage();
    await restricted.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("Bloqueado", "SecurityError");
        },
      });
    });
    await boot(restricted);
    await restricted.locator('.desktop-app[data-app="settings"]').dblclick();
    await restricted.locator("#taskbar-autohide").check();
    assert.match(
      await restricted.locator(".settings-save-status").textContent(),
      /sessão/,
    );
    await restricted.close();
    const touch = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const mobile = await touch.newPage();
    await boot(mobile);
    await mobile.locator('.desktop-app[data-app="settings"]').tap();
    await mobile.locator("#taskbar-autohide").check();
    await mobile.waitForFunction(() =>
      document.querySelector("#system").classList.contains("taskbar-hidden"),
    );
    await mobile.locator("#taskbar-reveal").tap();
    assert(
      !(await mobile
        .locator("#system")
        .evaluate((e) => e.classList.contains("taskbar-hidden"))),
    );
    await touch.close();
    console.log(
      "PASS: ocultação, mouse, menus, teclado, notificações sem roubar foco, persistência, área útil, armazenamento bloqueado e toque.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
