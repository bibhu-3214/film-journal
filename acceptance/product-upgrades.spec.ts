import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { z } from "zod";
async function register(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Create an account", exact: true })
    .click();
  await page.getByLabel("Your name", { exact: true }).fill("Product Owner");
  await page
    .getByLabel("Email address", { exact: true })
    .fill(randomUUID() + "@example.test");
  await page.getByLabel("Password", { exact: true }).fill("BrowserOnly#4827");
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await expect(page.locator(".platform-session")).toBeVisible();
}

import { readFile } from "node:fs/promises";
test("film lists persist and CSV preview appends without replacing existing reviews", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await register(page);
  await page
    .getByRole("button", { name: "Add movie", exact: true })
    .first()
    .click();
  await page.getByLabel("Movie title", { exact: true }).fill("Weekend film");
  await page
    .getByLabel("Lists (comma separated)", { exact: true })
    .fill("Weekend, Family");
  await page.getByLabel("Your review", { exact: true }).fill("Original review");
  await page.getByRole("button", { name: "Save movie", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Add movie", exact: true }),
  ).not.toBeVisible();
  await page
    .getByRole("combobox", { name: "Filter by film list", exact: true })
    .click();
  await page.getByRole("option", { name: "Weekend (1)", exact: true }).click();
  const rows = [
    ["title", "year", "rating", "genre", "status", "notes", "lists"],
    [
      "Weekend film",
      "",
      "0",
      "Drama",
      "Watchlist",
      "Duplicate review",
      '["Weekend"]',
    ],
    [
      "=A new film",
      "2024",
      "8.5",
      "Comedy",
      "Watched",
      "A new review",
      '["Weekend"]',
    ],
  ];
  const csv = rows
    .map((row) =>
      row.map((value) => '"' + value.replaceAll('"', '""') + '"').join(","),
    )
    .join("\n");
  await page
    .getByLabel("Import Film Journal CSV", { exact: true })
    .setInputFiles({
      name: "films.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
  const review = page.getByRole("dialog", {
    name: "Review CSV import",
    exact: true,
  });
  await expect(review).toContainText("Add 1 films. 1 duplicate");
  await review
    .getByRole("button", { name: "Confirm CSV import", exact: true })
    .click();
  await expect(review).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "=A new film", exact: true }),
  ).toBeVisible();
  const records = z
    .object({
      records: z.array(
        z.object({
          title: z.string(),
          notes: z.string(),
          lists: z.array(z.string()),
        }),
      ),
    })
    .parse(
      await page.request
        .get("/api/workspace")
        .then((response) => response.json()),
    ).records;
  expect(records).toHaveLength(2);
  expect(records.find((record) => record.title === "Weekend film")?.notes).toBe(
    "Original review",
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  const file = await download;
  const text = await readFile((await file.path())!, "utf8");
  expect(text).toContain("'=A new film");
  await page.reload();
  await page
    .getByRole("combobox", { name: "Filter by film list", exact: true })
    .click();
  await expect(
    page.getByRole("option", { name: "Weekend (2)", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("region", { name: "Personal film lists" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("film-lists-phone.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
