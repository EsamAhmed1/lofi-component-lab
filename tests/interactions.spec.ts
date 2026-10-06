import { expect, test } from "@playwright/test";

test.describe("command palette", () => {
  test("opens with the hotkey, filters, runs an item and closes", async ({ page, browserName }) => {
    await page.goto("/components/command-palette", { waitUntil: "networkidle" });
    const opener = page.getByRole("button", { name: /Search or jump to/ });
    await opener.focus();
    await page.keyboard.press(browserName === "webkit" ? "Meta+k" : "Control+k");

    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await expect(dialog).toBeVisible();
    const input = dialog.getByRole("combobox");
    await expect(input).toBeFocused();

    await input.fill("bill");
    await expect(dialog.getByRole("option")).toHaveCount(1);
    await expect(dialog.getByRole("option", { name: /Go to billing/ })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Enter");

    await expect(dialog).toBeHidden();
    await expect(page.getByText("Ran: Go to billing")).toBeVisible();
    await expect(opener).toBeFocused();
  });

  test("loose matching, disabled items and Escape behaviour", async ({ page }) => {
    await page.goto("/components/command-palette", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Search or jump to/ }).click();
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    const input = dialog.getByRole("combobox");

    await input.fill("nwp");
    await expect(dialog.getByRole("option", { name: /New project/ })).toBeVisible();

    await input.fill("archive");
    await expect(dialog.getByRole("option", { name: /Archive workspace/ })).toHaveAttribute("aria-disabled", "true");
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();

    await input.fill("zzzz");
    await expect(dialog.getByText("No results found.")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(input).toHaveValue("");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});

test.describe("otp input", () => {
  test("typing the right code verifies", async ({ page }) => {
    await page.goto("/components/otp-input", { waitUntil: "networkidle" });
    const group = page.getByRole("group", { name: "Verification code" });
    await group.getByRole("textbox", { name: "Digit 1 of 6" }).click();
    await page.keyboard.type("246810");
    await expect(page.getByText("Code verified. You're in.")).toBeVisible();
  });

  test("wrong code errors and backspace edits", async ({ page }) => {
    await page.goto("/components/otp-input", { waitUntil: "networkidle" });
    const group = page.getByRole("group", { name: "Verification code" });
    const first = group.getByRole("textbox", { name: "Digit 1 of 6" });
    await first.click();
    await page.keyboard.type("12a3");
    await expect(group.getByRole("textbox", { name: "Digit 4 of 6" })).toBeFocused();
    await page.keyboard.press("Backspace");
    await expect(group.getByRole("textbox", { name: "Digit 3 of 6" })).toHaveValue("");
    await page.keyboard.type("3999");
    await expect(page.getByText("That code didn't match.")).toBeVisible();
    await expect(first).toHaveAttribute("aria-invalid", "true");
  });

  test("SMS autofill drops the whole code into the first box", async ({ page }) => {
    await page.goto("/components/otp-input", { waitUntil: "networkidle" });
    const group = page.getByRole("group", { name: "Verification code" });
    await group.getByRole("textbox", { name: "Digit 1 of 6" }).fill("246810");
    await expect(group.getByRole("textbox", { name: "Digit 6 of 6" })).toHaveValue("0");
    await expect(page.getByText("Code verified. You're in.")).toBeVisible();
  });

  test("paste fills every box and strips spaces", async ({ page, browserName }) => {
    test.skip(browserName === "firefox", "Firefox ignores clipboardData on synthetic ClipboardEvents");
    await page.goto("/components/otp-input", { waitUntil: "networkidle" });
    const group = page.getByRole("group", { name: "Verification code" });
    await group.getByRole("textbox", { name: "Digit 1 of 6" }).focus();
    await page.evaluate(() => {
      const data = new DataTransfer();
      data.setData("text", "246 810");
      document.activeElement?.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    });
    await expect(page.getByText("Code verified. You're in.")).toBeVisible();
  });
});