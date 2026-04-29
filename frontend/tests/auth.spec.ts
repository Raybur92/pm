import { expect, test } from "@playwright/test";

test("redirects unauthenticated user to login page", async ({ page, context }) => {
  // Clear any existing auth token
  await context.clearCookies();

  await page.goto("/");
  await expect(page).toHaveURL("/login");
  await expect(page.getByText("Kanban Studio")).toBeVisible();
});

test("login with correct credentials redirects to kanban board", async ({ page, context }) => {
  // Clear any existing auth token
  await context.clearCookies();

  await page.goto("/login");

  // Fill in credentials
  await page.getByTestId("username-input").fill("user");
  await page.getByTestId("password-input").fill("password");

  // Submit form
  await page.getByTestId("login-button").click();

  // Should redirect to home and show Kanban board
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
});

test("login with incorrect credentials shows error message", async ({ page, context }) => {
  // Clear any existing auth token
  await context.clearCookies();

  await page.goto("/login");

  // Fill in incorrect credentials
  await page.getByTestId("username-input").fill("user");
  await page.getByTestId("password-input").fill("wrongpassword");

  // Submit form
  await page.getByTestId("login-button").click();

  // Should show error message
  await expect(page.getByTestId("error-message")).toBeVisible();
  await expect(page.getByTestId("error-message")).toContainText("Invalid username or password");

  // Should not redirect
  await expect(page).toHaveURL("/login");
});

test("logout button clears session and redirects to login", async ({ page, context }) => {
  // Clear any existing auth token
  await context.clearCookies();

  // Login first
  await page.goto("/login");
  await page.getByTestId("username-input").fill("user");
  await page.getByTestId("password-input").fill("password");
  await page.getByTestId("login-button").click();

  // Wait for redirect to home
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();

  // Click logout button
  await page.getByTestId("logout-button").click();

  // Should redirect to login
  await expect(page).toHaveURL("/login");
  await expect(page.getByTestId("username-input")).toBeVisible();
});

test("accessing kanban while logged out redirects to login", async ({ page, context }) => {
  // Clear any existing auth token
  await context.clearCookies();

  // Try to access home
  await page.goto("/");

  // Should redirect to login
  await expect(page).toHaveURL("/login");
});

test("session persists across page reloads after login", async ({ page, context }) => {
  // Clear any existing auth token
  await context.clearCookies();

  // Login
  await page.goto("/login");
  await page.getByTestId("username-input").fill("user");
  await page.getByTestId("password-input").fill("password");
  await page.getByTestId("login-button").click();

  // Wait for redirect to home
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();

  // Reload page
  await page.reload();

  // Should still be on home and logged in
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  await expect(page.getByTestId("logout-button")).toBeVisible();
});
