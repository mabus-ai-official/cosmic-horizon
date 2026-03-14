import { test as setup, expect } from "@playwright/test";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = path.join(__dirname, ".auth.json");
const AUTH_FILE_2 = path.join(__dirname, ".auth2.json");

const TEST_USER = {
  username: "e2e_tester",
  email: "e2e@test.local",
  password: "TestPass123!",
  race: "muscarian",
};

const TEST_USER_2 = {
  username: "e2e_tester_2",
  email: "e2e2@test.local",
  password: "TestPass123!",
  race: "vedic",
};

async function authenticateUser(
  page: import("@playwright/test").Page,
  user: typeof TEST_USER,
  authFile: string,
) {
  // Try logging in first
  await page.goto("/login");
  await page.fill('input[type="text"]', user.username);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');

  // Wait for either game page (login success) or error
  const result = await Promise.race([
    page.waitForURL("**/game", { timeout: 5000 }).then(() => "game"),
    page.waitForSelector(".auth-error", { timeout: 5000 }).then(() => "error"),
  ]);

  if (result === "error") {
    // Account doesn't exist — register
    await page.goto("/register");

    // Step 1: credentials
    await page.fill('input[type="text"]', user.username);
    await page.fill('input[type="email"]', user.email);
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill(user.password);
    await passwordInputs.nth(1).fill(user.password);
    await page.click('button[type="submit"]');

    // Step 2: race selection
    await page.waitForSelector(".race-card");
    await page.click(
      `.race-card:has-text("${user.race.charAt(0).toUpperCase() + user.race.slice(1)}")`,
    );
    await page.click('button:has-text("LAUNCH")');

    // Step 3: wallet — skip it
    await page.waitForSelector('button:has-text("Skip")', { timeout: 10000 });
    await page.click('button:has-text("Skip")');
  }

  // Should be on game page now
  await page.waitForURL("**/game", { timeout: 10000 });

  // Dismiss intro sequence overlays (Skip All, Enter the Galaxy, tutorial)
  for (let i = 0; i < 20; i++) {
    // Check if we've reached the game UI
    if (
      await page
        .locator(".activity-bar")
        .first()
        .isVisible({ timeout: 500 })
        .catch(() => false)
    ) {
      break;
    }

    // "Skip All" button
    const skipAll = page.locator('button:has-text("Skip All")');
    if (await skipAll.isVisible({ timeout: 300 }).catch(() => false)) {
      await skipAll.click();
      await page.waitForTimeout(500);
      continue;
    }

    // "ENTER THE GALAXY" button
    const enterGalaxy = page.locator(
      '.intro-sequence__continue, button:has-text("ENTER THE GALAXY")',
    );
    if (await enterGalaxy.isVisible({ timeout: 300 }).catch(() => false)) {
      await enterGalaxy.click();
      await page.waitForTimeout(500);
      continue;
    }

    // Tutorial skip
    const skipTutorial = page.locator(
      'button:has-text("Skip Tutorial"), button:has-text("SKIP")',
    );
    if (await skipTutorial.isVisible({ timeout: 300 }).catch(() => false)) {
      await skipTutorial.click();
      await page.waitForTimeout(500);
      continue;
    }

    // Intro overlay — click to advance
    const introOverlay = page.locator(".intro-sequence");
    if (await introOverlay.isVisible({ timeout: 300 }).catch(() => false)) {
      await introOverlay.click();
      await page.waitForTimeout(300);
      continue;
    }

    await page.waitForTimeout(500);
  }

  await expect(page.locator(".activity-bar").first()).toBeVisible({
    timeout: 15000,
  });

  // Save auth state (localStorage token + cookies)
  await page.context().storageState({ path: authFile });
}

setup("authenticate player 1", async ({ page }) => {
  await authenticateUser(page, TEST_USER, AUTH_FILE);
});

setup("authenticate player 2", async ({ page }) => {
  await authenticateUser(page, TEST_USER_2, AUTH_FILE_2);
});
