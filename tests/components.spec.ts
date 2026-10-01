import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const WIDTHS = [375, 768, 1280];

async function componentPaths(page: Page): Promise<string[]> {
  await page.goto("/components");
  const hrefs = await page
    .locator('main a[href^="/components/"]')
    .evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
  return [...new Set(hrefs)];
}

async function checkPage(page: Page, path: string) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(path, { waitUntil: "networkidle" });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(0);
  }

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  test.info().annotations.push({ type: "axe-violations", description: String(axe.violations.length) });
  expect(
    blocking.map((v) => `${v.id}: ${v.nodes.length} node(s) — ${v.help}`),
    "serious/critical accessibility violations",
  ).toEqual([]);
  expect(errors, "console or page errors").toEqual([]);
}

test("home page", async ({ page }) => {
  await checkPage(page, "/");
});

test("components index", async ({ page }) => {
  await checkPage(page, "/components");
});

test("agent logs", async ({ page }) => {
  await checkPage(page, "/logs");
  await expect(page.getByRole("heading", { level: 1, name: "Agent logs" })).toBeVisible();
});

test("every component page", async ({ page }) => {
  const paths = await componentPaths(page);
  expect(paths.length).toBeGreaterThan(0);
  for (const path of paths) {
    await test.step(path, async () => {
      await checkPage(page, path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByText("Live preview")).toBeVisible();
      await expect(page.getByRole("tab", { name: "Usage" })).toBeVisible();
    });
    test.info().annotations.push({ type: "component", description: path });
  }
});
