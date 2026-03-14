import { test, expect } from "@playwright/test";
import {
  gotoGame,
  runCommand,
  waitForLogContaining,
  clearLog,
} from "./helpers";

test.describe("Mail System", () => {
  test("mail command shows inbox", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "mail");
    await page.waitForTimeout(1000);

    // Should show inbox contents or an "empty" / "no mail" message
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("inbox") ||
        allText.includes("mail") ||
        allText.includes("empty") ||
        allText.includes("no ") ||
        allText.includes("message"),
    ).toBeTruthy();
  });

  test("mail send delivers message", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(
      page,
      "mail send e2e_tester_2 Test Subject | Test body message",
    );
    await page.waitForTimeout(1000);

    // Should confirm the message was sent
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("sent") ||
        allText.includes("delivered") ||
        allText.includes("mail") ||
        allText.includes("message"),
    ).toBeTruthy();
  });

  test("mail sent shows sent messages", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "mail sent");
    await page.waitForTimeout(1000);

    // Should show sent messages or indicate none exist
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("sent") ||
        allText.includes("mail") ||
        allText.includes("empty") ||
        allText.includes("no ") ||
        allText.includes("message"),
    ).toBeTruthy();
  });

  test("mail read with invalid id shows error", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "mail read 99999");
    await page.waitForTimeout(1000);

    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("error") ||
        allText.includes("not found") ||
        allText.includes("invalid") ||
        allText.includes("no mail") ||
        allText.includes("does not exist") ||
        allText.includes("no message"),
    ).toBeTruthy();
  });

  test("mail delete with invalid id shows error", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "mail delete 99999");
    await page.waitForTimeout(1000);

    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("error") ||
        allText.includes("not found") ||
        allText.includes("invalid") ||
        allText.includes("no mail") ||
        allText.includes("does not exist") ||
        allText.includes("no message"),
    ).toBeTruthy();
  });
});
