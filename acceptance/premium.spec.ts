import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
test("guided states, deferred workspace loading and filter recovery", async ({
  page,
}) => {
  page.setDefaultTimeout(10000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const workspaceRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/src/features/journal/FilmJournal.tsx"))
      workspaceRequests.push(request.url());
  });
  await page.route(
    "**/src/features/journal/FilmJournal.tsx*",
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await route.continue();
    },
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect(workspaceRequests).toEqual([]);
  await page
    .getByRole("button", { name: "Create an account", exact: true })
    .click();
  await page.getByLabel("Your name", { exact: true }).fill("Polish Owner");
  await page
    .getByLabel("Email address", { exact: true })
    .fill(randomUUID() + "@example.test");
  await page.getByLabel("Password", { exact: true }).fill("BrowserOnly#4827");
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await expect(
    page.getByRole("main", { name: "Loading workspace" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add your first movie", exact: true })
    .click();
  await page
    .getByLabel("Movie title", { exact: true })
    .fill("A favourite film");
  await page.getByRole("button", { name: "Save movie", exact: true }).click();
  await page.getByRole("combobox", { name: "Film genre", exact: true }).click();
  await page.getByRole("option", { name: "Comedy", exact: true }).click();
  await page.getByLabel("Search films").fill("no-film-match");
  await expect(
    page.getByRole("heading", {
      name: "No films match your filters.",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A favourite film", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "My journal", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Your first journal entry is waiting.",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "View watchlist", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A favourite film", exact: true }),
  ).toBeVisible();
  expect(workspaceRequests.length).toBeGreaterThan(0);
  await page.setViewportSize({ width: 390, height: 844 });
  const sort = page.getByRole("combobox", { name: "Sort films", exact: true });
  const box = await sort.boundingBox();
  expect(box!.height).toBeLessThanOrEqual(50);
  await expect(sort.locator("span").first()).toHaveCSS("white-space", "nowrap");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
