import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByTestId("username-input").fill("user");
  await page.getByTestId("password-input").fill("password");
  await page.getByTestId("login-button").click();
  await page.waitForURL("/");
  await page.waitForSelector('[data-testid^="column-"]');
}

test("chat sidebar is visible on page load", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("complementary", { name: "AI Assistant" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chat with your board" })).toBeVisible();
});

test("chat input and send button are present", async ({ page }) => {
  await login(page);
  await expect(page.getByLabel("Message input")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send message" })).toBeVisible();
});

test("send button disabled on empty input", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("button", { name: "Send message" })).toBeDisabled();
});

test("send button enabled after typing", async ({ page }) => {
  await login(page);
  await page.getByLabel("Message input").fill("hello");
  await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
});

// Full-stack tests — require backend + OpenRouter to be running
test("AI responds to a message", async ({ page }) => {
  await login(page);
  await page.getByLabel("Message input").fill("What columns are on my board?");
  await page.getByRole("button", { name: "Send message" }).click();
  // User message appears immediately
  await expect(page.getByText("What columns are on my board?")).toBeVisible();
  // AI response appears (wait up to 30s for OpenRouter)
  await expect(page.getByRole("log").locator(".flex.justify-start").last()).toBeVisible({ timeout: 30_000 });
});

test("AI creates a card and board refreshes", async ({ page }) => {
  await login(page);
  const firstColumn = page.locator('[data-testid^="column-"]').first();

  await page.getByLabel("Message input").fill("Create a card called 'AI Test Card' in the first column");
  await page.getByRole("button", { name: "Send message" }).click();

  // Wait for AI response
  await expect(page.getByRole("log").locator(".flex.justify-start").last()).toBeVisible({ timeout: 30_000 });

  // Card should appear on the board
  await expect(firstColumn.getByText("AI Test Card")).toBeVisible({ timeout: 10_000 });
});

test("multiple messages build conversation history", async ({ page }) => {
  await login(page);
  const log = page.getByRole("log");

  await page.getByLabel("Message input").fill("Hello");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(log.locator(".flex.justify-start")).toHaveCount(1, { timeout: 30_000 });

  await page.getByLabel("Message input").fill("What did I just say?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(log.locator(".flex.justify-start")).toHaveCount(2, { timeout: 30_000 });
});
