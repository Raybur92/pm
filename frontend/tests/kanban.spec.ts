import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByTestId("username-input").fill("user");
  await page.getByTestId("password-input").fill("password");
  await page.getByTestId("login-button").click();
  await page.waitForURL("/");
  // Wait for board to load from API
  await page.waitForSelector('[data-testid^="column-"]');
}

test("loads the kanban board", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
});

test("adds a card to a column", async ({ page }) => {
  await login(page);
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Playwright card");
  await firstColumn.getByPlaceholder("Details").fill("Added via e2e.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Playwright card")).toBeVisible();
});

test("card persists after page reload", async ({ page }) => {
  await login(page);
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Persistent card");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Persistent card")).toBeVisible();

  await page.reload();
  await page.waitForSelector('[data-testid^="column-"]');
  await expect(
    page.locator('[data-testid^="column-"]').first().getByText("Persistent card")
  ).toBeVisible();
});

test("rename column persists after page reload", async ({ page }) => {
  await login(page);
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  const titleInput = firstColumn.getByRole("textbox", { name: /column title/i });

  await titleInput.fill("Renamed Column");
  await titleInput.blur();

  await page.reload();
  await page.waitForSelector('[data-testid^="column-"]');
  await expect(
    page.locator('[data-testid^="column-"]').first().getByRole("textbox", { name: /column title/i })
  ).toHaveValue("Renamed Column");
});

test("delete card removes it permanently", async ({ page }) => {
  await login(page);
  const firstColumn = page.locator('[data-testid^="column-"]').first();

  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Card to delete");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Card to delete")).toBeVisible();

  await firstColumn
    .locator('[data-testid^="card-"]')
    .filter({ hasText: "Card to delete" })
    .getByRole("button", { name: /delete card to delete/i })
    .click();
  await expect(firstColumn.getByText("Card to delete")).not.toBeVisible();

  await page.reload();
  await page.waitForSelector('[data-testid^="column-"]');
  await expect(
    page.locator('[data-testid^="column-"]').first().getByText("Card to delete")
  ).not.toBeVisible();
});

test("edit card persists after page reload", async ({ page }) => {
  await login(page);
  const firstColumn = page.locator('[data-testid^="column-"]').first();

  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Original title");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Original title")).toBeVisible();

  const card = firstColumn
    .locator('[data-testid^="card-"]')
    .filter({ hasText: "Original title" });
  await card.getByRole("button", { name: /edit original title/i }).click();
  await card.getByLabel("Card title").fill("Updated title");
  await card.getByRole("button", { name: /^save$/i }).click();
  await expect(firstColumn.getByText("Updated title")).toBeVisible();

  await page.reload();
  await page.waitForSelector('[data-testid^="column-"]');
  await expect(
    page.locator('[data-testid^="column-"]').first().getByText("Updated title")
  ).toBeVisible();
});

test("multiple cards maintain order after page reload", async ({ page }) => {
  await login(page);
  const firstColumn = page.locator('[data-testid^="column-"]').first();

  for (const title of ["Order card A", "Order card B", "Order card C"]) {
    await firstColumn.getByRole("button", { name: /add a card/i }).click();
    await firstColumn.getByPlaceholder("Card title").fill(title);
    await firstColumn.getByRole("button", { name: /add card/i }).click();
    await expect(firstColumn.getByText(title)).toBeVisible();
  }

  await page.reload();
  await page.waitForSelector('[data-testid^="column-"]');

  const cardTitles = await page
    .locator('[data-testid^="column-"]')
    .first()
    .locator('[data-testid^="card-"] h4')
    .allTextContents();

  const idxA = cardTitles.findIndex((t) => t.includes("Order card A"));
  const idxB = cardTitles.findIndex((t) => t.includes("Order card B"));
  const idxC = cardTitles.findIndex((t) => t.includes("Order card C"));

  expect(idxA).toBeGreaterThanOrEqual(0);
  expect(idxA).toBeLessThan(idxB);
  expect(idxB).toBeLessThan(idxC);
});

test("moves a card between columns", async ({ page }) => {
  await login(page);

  // Add a card to the first column to have something to drag
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Card to move");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Card to move")).toBeVisible();

  const card = firstColumn.locator('[data-testid^="card-"]').first();
  const targetColumn = page.locator('[data-testid^="column-"]').nth(3);

  const cardBox = await card.boundingBox();
  const columnBox = await targetColumn.boundingBox();
  if (!cardBox || !columnBox) throw new Error("Unable to resolve drag coordinates.");

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(columnBox.x + columnBox.width / 2, columnBox.y + 120, { steps: 12 });
  await page.mouse.up();

  await expect(targetColumn.getByText("Card to move")).toBeVisible();
});
