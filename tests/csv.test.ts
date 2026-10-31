import { expect, test } from "vitest";
import { filmCsv, reviewFilmCsv, csvRows } from "../src/features/journal/csv";
import {
  filmSchema,
  parseFilmBackup,
  parseListNames,
} from "../src/features/journal/model";
const film = filmSchema.parse({
  id: "film",
  title: '=A film, "quoted"',
  year: 2026,
  rating: 8.5,
  genre: "Drama",
  status: "Watched",
  watchedOn: "2026-10-31",
  notes: "'=literal\nSecond line, with comma",
  lists: ["Weekend", "Favourites"],
  createdAt: "2026-10-31T09:00:00Z",
  updatedAt: "2026-10-31T09:00:00Z",
});
test("CSV safely escapes formulas and round trips quotes, Unicode, newlines and lists", () => {
  const csv = filmCsv([film]);
  expect(csv).toContain("'=A film");
  const preview = reviewFilmCsv(csv, [], "2026-10-31T09:00:00Z");
  expect(preview.add[0]).toEqual({ ...film, id: expect.any(String) });
  expect(preview.duplicates).toBe(0);
  expect(csvRows(csv)).toHaveLength(2);
});
test("review skips existing and repeated titles/years without overwriting saved reviews", () => {
  const before = structuredClone(film);
  const preview = reviewFilmCsv(filmCsv([film, film]), [film]);
  expect(preview.add).toEqual([]);
  expect(preview.duplicates).toBe(2);
  expect(film).toEqual(before);
});
test("CSV malformed columns, quoted data and invalid dates fail before creating any records", () => {
  for (const raw of [
    "title,unknown\nA,x",
    "title,year\nA,1700",
    'title\n"unfinished',
    "title,status,watchedOn\nA,Watchlist,2026-10-31",
  ])
    expect(() => reviewFilmCsv(raw, [])).toThrow();
  expect(() => reviewFilmCsv("title\n" + "x".repeat(1500001), [])).toThrow(
    "1.5 MB",
  );
});
test("personal lists are bounded and retained in existing JSON backup versions", () => {
  expect(parseListNames(" Weekend, Family ")).toEqual(["Weekend", "Family"]);
  expect(() => parseListNames("Weekend,weekend")).toThrow();
  expect(() => parseListNames("x".repeat(41))).toThrow();
  expect(
    parseFilmBackup({ version: 2, product: "film-journal", records: [film] }),
  ).toEqual([film]);
});
