import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
for (const width of [1440, 390])
  test(`personal watchlist and film journal at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await page
      .getByRole("button", { name: "Create an account", exact: true })
      .click();
    await page.getByLabel("Your name", { exact: true }).fill("Film Owner");
    await page
      .getByLabel("Email address", { exact: true })
      .fill(randomUUID() + "@example.test");
    await page.getByLabel("Password", { exact: true }).fill("BrowserOnly#4827");
    await page
      .getByRole("button", { name: "Create workspace", exact: true })
      .click();
    await expect(
      page.getByText("Account workspace", { exact: false }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Add movie", exact: true }).click();
    let dialog = page.getByRole("dialog", { name: "Add movie", exact: true });
    await dialog
      .getByLabel("Movie title", { exact: true })
      .fill("A personal favourite");
    await dialog.getByLabel("Your rating (0–10)", { exact: true }).fill("8.5");
    await dialog
      .getByLabel("Your review", { exact: true })
      .fill("The quiet moments stayed with me.");
    await dialog
      .getByRole("button", { name: "Save movie", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    await page.getByRole("button", { name: "Watchlist", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "A personal favourite", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Mark watched", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "A personal favourite", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "My journal", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "A personal favourite", exact: true }),
    ).toBeVisible();
    await page.reload();
    await page
      .getByRole("button", { name: "Read review", exact: true })
      .click();
    dialog = page.getByRole("dialog", {
      name: "A personal favourite",
      exact: true,
    });
    await expect(
      dialog.getByText("The quiet moments stayed with me.", { exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Edit A personal favourite", exact: true })
      .click();
    dialog = page.getByRole("dialog", { name: "Edit movie", exact: true });
    await dialog
      .getByLabel("Movie title", { exact: true })
      .fill("Updated favourite");
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", {
        name: "Discard unsaved changes?",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Keep editing", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Save movie", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    const downloading = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export JSON", exact: true })
      .click();
    const download = await downloading;
    const path = "output/film-" + width + ".json";
    await download.saveAs(path);
    const backup: unknown = JSON.parse(await readFile(path, "utf8"));
    expect(backup).toMatchObject({
      version: 2,
      product: "film-journal",
      records: [
        expect.objectContaining({
          title: "Updated favourite",
          status: "Watched",
          rating: 8.5,
          watchedOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      ],
    });
    await page
      .getByLabel("Import workspace JSON", { exact: true })
      .setInputFiles(path);
    dialog = page.getByRole("dialog", {
      name: "Replace workspace from export?",
      exact: true,
    });
    await dialog
      .getByRole("button", { name: "Replace workspace", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Updated favourite", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Switch to dark mode", exact: true })
      .click();
    await page.screenshot({
      path: "output/film-focused-" + width + ".png",
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();
  });
