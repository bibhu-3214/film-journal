import { z } from "zod";
import product from "../../../product.json";
export const genres = [
  "Drama",
  "Comedy",
  "Thriller",
  "Animation",
  "Documentary",
  "Other",
] as const;
const calendar = z.string().refine((value) => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number),
    date = new Date(0);
  date.setFullYear(y, m - 1, d);
  return (
    y > 0 &&
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}, "Choose a real date.");
export const listNames = z
  .array(
    z
      .string()
      .trim()
      .min(1)
      .max(40)
      .regex(/^[^,\r\n]+$/),
  )
  .max(12)
  .refine(
    (names) =>
      new Set(names.map((name) => name.toLowerCase())).size === names.length,
    "List names must be unique.",
  );
export function parseListNames(value: string): string[] {
  return listNames.parse(
    value
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean),
  );
}
export const filmSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    title: z.string().trim().min(1).max(160),
    year: z.number().int().min(1888).max(2200).nullable(),
    rating: z.number().min(0).max(10),
    genre: z.enum(genres),
    status: z.enum(["Watchlist", "Watched"]),
    notes: z.string().max(2000),
    watchedOn: calendar.optional(),
    lists: listNames.optional(),
  })
  .strict()
  .refine(
    (film) => !film.watchedOn || film.status === "Watched",
    "Only watched films can have a watched date.",
  );
export type FilmRecord = z.infer<typeof filmSchema>;
export function parseFilmBackup(raw: unknown) {
  const backup = z
    .object({
      version: z.union([z.literal(1), z.literal(2)]),
      product: z.string(),
      records: z.array(filmSchema).max(10000),
    })
    .strict()
    .parse(raw);
  if (![product.id, ...product.legacyProductIds].includes(backup.product))
    throw new Error("Choose an export from Film Journal.");
  if (
    new Set(backup.records.map((film) => film.id)).size !==
    backup.records.length
  )
    throw new Error("The file contains duplicate IDs.");
  return backup.records;
}
export function journalSummary(films: readonly FilmRecord[]) {
  const watched = films.filter((film) => film.status === "Watched");
  return {
    watchlist: films.length - watched.length,
    watched: watched.length,
    reviews: watched.filter((film) => film.notes.trim()).length,
    average: watched.length
      ? watched.reduce((sum, film) => sum + film.rating, 0) / watched.length
      : null,
  };
}
export function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
