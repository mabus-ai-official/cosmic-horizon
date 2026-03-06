import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // No auth for these tests

  test("login page loads with correct elements", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator(".auth-logo")).toBeVisible();
    await expect(page.locator('text="Sector Terminal Access"')).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText("LOGIN");
    await expect(page.locator('text="MULTIPLAYER"')).toBeVisible();
    await expect(page.locator('text="SINGLE PLAYER"')).toBeVisible();
    await expect(page.locator('text="Register here"')).toBeVisible();
  });

  test("register page loads with step 1", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator(".auth-logo")).toBeVisible();
    await expect(page.locator('text="New Pilot Registration"')).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    const passwordInputs = page.locator('input[type="password"]');
    await expect(passwordInputs).toHaveCount(2);
    await expect(page.locator('text="Login here"')).toBeVisible();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="text"]', "nonexistent_user_xyz");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    await expect(page.locator(".auth-error")).toBeVisible({ timeout: 5000 });
  });

  test("register step 1 validates password match", async ({ page }) => {
    await page.goto("/register");
    await page.fill('input[type="text"]', "testuser");
    await page.fill('input[type="email"]', "test@test.com");
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill("password1");
    await passwordInputs.nth(1).fill("password2");
    await page.click('button[type="submit"]');
    await expect(page.locator(".auth-error")).toHaveText(
      "Passwords do not match",
    );
  });

  test("register navigates to race selection on step 2", async ({ page }) => {
    await page.goto("/register");
    await page.fill('input[type="text"]', "testuser");
    await page.fill('input[type="email"]', "test@test.com");
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill("TestPass123!");
    await passwordInputs.nth(1).fill("TestPass123!");
    await page.click('button[type="submit"]');
    await expect(page.locator('text="Choose Your Race"')).toBeVisible();
    await expect(page.locator(".race-card")).toHaveCount(4);
    await expect(page.locator('text="Muscarian"')).toBeVisible();
    await expect(page.locator('text="Vedic"')).toBeVisible();
    await expect(page.locator('text="Kalin"')).toBeVisible();
    await expect(page.locator('text="Tar\'ri"')).toBeVisible();
  });

  test("login/register links navigate correctly", async ({ page }) => {
    await page.goto("/login");
    await page.click('text="Register here"');
    await expect(page).toHaveURL(/\/register/);

    await page.click('text="Login here"');
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user redirects to login", async ({ page }) => {
    await page.goto("/game");
    await expect(page).toHaveURL(/\/login/);
  });

  test("game mode toggle switches between modes", async ({ page }) => {
    await page.goto("/login");
    const mpButton = page.locator('button:has-text("MULTIPLAYER")');
    const spButton = page.locator('button:has-text("SINGLE PLAYER")');

    // Multiplayer is default
    await expect(mpButton).toHaveClass(/btn-primary/);
    await expect(spButton).toHaveClass(/btn-secondary/);

    // Click single player
    await spButton.click();
    await expect(spButton).toHaveClass(/btn-primary/);
    await expect(mpButton).toHaveClass(/btn-secondary/);
    await expect(
      page.locator('text="Switch to your own 1000-sector universe."'),
    ).toBeVisible();

    // Click multiplayer
    await mpButton.click();
    await expect(mpButton).toHaveClass(/btn-primary/);
    await expect(
      page.locator('text="Play in the shared universe with all players."'),
    ).toBeVisible();
  });
});
