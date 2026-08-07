import { test, expect } from "@playwright/test";

test.describe("home page", () => {
  test("loads and renders the app shell", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/VideoTube/);
  });

  test("shows skip-to-content link and branding", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/skip to content/i)).toBeVisible();
  });
});

test.describe("login page", () => {
  test("renders a login form", async ({ page }) => {
    await page.goto("/login");
    const input = page.locator("input");
    await expect(input.first()).toBeVisible({ timeout: 60_000 });
  });
});

test.describe("register page", () => {
  test("renders a registration form", async ({ page }) => {
    await page.goto("/register");
    const input = page.locator("input");
    await expect(input.first()).toBeVisible({ timeout: 60_000 });
  });
});

test.describe("404 page", () => {
  test("shows a friendly not-found page", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist-xyz");
    await expect(page.getByText("404")).toBeVisible({ timeout: 20_000 });
    expect(res?.status()).toBe(404);
  });
});