import { expect, test } from "vitest";
import {
  filmSchema,
  parseFilmBackup,
  journalSummary,
} from "../src/features/journal/model";
const film = {
  id: "one",
  createdAt: "2026-10-30T09:00:00.000Z",
  updatedAt: "2026-10-30T09:00:00.000Z",
  title: "A film",
  year: 2026,
  rating: 8,
  genre: "Drama" as const,
  status: "Watchlist" as const,
  notes: "A personal review",
};
test("old Movies exports remain readable and watched dates round trip", () => {
  expect(
    parseFilmBackup({ version: 1, product: "movies", records: [film] }),
  ).toEqual([film]);
  const watched = { ...film, status: "Watched", watchedOn: "2026-10-30" };
  expect(
    parseFilmBackup({
      version: 2,
      product: "film-journal",
      records: [watched],
    }),
  ).toEqual([watched]);
  expect(() =>
    parseFilmBackup({ version: 2, product: "task-workspace", records: [film] }),
  ).toThrow();
  expect(() =>
    parseFilmBackup({
      version: 2,
      product: "film-journal",
      records: [film, film],
    }),
  ).toThrow();
});
test("rejects impossible dates, watchlist dates and invalid ratings", () => {
  for (const patch of [
    { rating: 11 },
    { watchedOn: "2026-10-30" },
    { status: "Watched", watchedOn: "2026-02-30" },
  ])
    expect(filmSchema.safeParse({ ...film, ...patch }).success).toBe(false);
});
test("journal statistics use watched films and personal reviews", () => {
  expect(journalSummary([film])).toEqual({
    watchlist: 1,
    watched: 0,
    reviews: 0,
    average: null,
  });
  expect(
    journalSummary([
      film,
      { ...film, id: "two", status: "Watched", rating: 6 },
    ]),
  ).toEqual({ watchlist: 1, watched: 1, reviews: 1, average: 6 });
});
