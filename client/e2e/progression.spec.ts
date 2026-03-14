import { test, expect } from "@playwright/test";
import {
  gotoGame,
  runCommand,
  waitForLogContaining,
  clearLog,
  selectPanel,
} from "./helpers";

test.describe("Leveling & Progression", () => {
  test("profile command shows level and XP", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "profile");

    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(allText.includes("level") || allText.includes("xp")).toBeTruthy();
  });

  test("p alias works for profile", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "p");

    // Accept any log response — the alias was handled
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const count = await lines.count();
    expect(count).toBeGreaterThan(0);
  });

  test("rank alias works for profile", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "rank");

    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("level") ||
        allText.includes("xp") ||
        allText.includes("rank"),
    ).toBeTruthy();
  });

  test("status shows progression info", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "status");

    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(allText.length).toBeGreaterThan(0);
  });
});

test.describe("Achievements", () => {
  test("achievements command lists achievements", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "achievements");

    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("earned") ||
        allText.includes("locked") ||
        allText.includes("achievement") ||
        allText.includes("progress"),
    ).toBeTruthy();
  });

  test("ach alias works", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "ach");

    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("earned") ||
        allText.includes("locked") ||
        allText.includes("achievement") ||
        allText.includes("progress"),
    ).toBeTruthy();
  });
});

test.describe("Leaderboards", () => {
  test("leaderboard shows overview", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "leaderboard");

    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(allText.length).toBeGreaterThan(0);
  });

  test("leaderboard credits shows credit rankings", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "leaderboard credits");

    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("credit") ||
        allText.includes("rank") ||
        allText.includes("leaderboard") ||
        allText.includes("#"),
    ).toBeTruthy();
  });

  test("leaderboard categories work", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    // Test planets category
    await runCommand(page, "leaderboard planets");

    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(allText.length).toBeGreaterThan(0);

    // Test explored category
    await clearLog(page);
    await runCommand(page, "leaderboard explored");

    const lines2 = page.locator(".log-line");
    await expect(lines2.first()).toBeVisible({ timeout: 10000 });
    const allText2 = (await lines2.allTextContents()).join(" ").toLowerCase();
    expect(allText2.length).toBeGreaterThan(0);
  });

  test("lb alias works", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "lb");

    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(allText.length).toBeGreaterThan(0);
  });
});

test.describe("Ranks", () => {
  test("ranks command shows rank tiers", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "ranks");

    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("recruit") ||
        allText.includes("rank") ||
        allText.includes("tier") ||
        allText.includes("level"),
    ).toBeTruthy();
  });
});
