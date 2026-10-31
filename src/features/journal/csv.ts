import { filmSchema, type FilmRecord } from "./model";
const format = "film-journal-safe-v1";
const headers = [
  "format",
  "title",
  "year",
  "rating",
  "genre",
  "status",
  "watchedOn",
  "notes",
  "lists",
] as const;
const unsafe = (value: string) =>
  /^[\s]*[=+@-]/.test(value) || /^[\t\r]/.test(value);
const cell = (value: string) =>
  '"' +
  (value.startsWith("'") || unsafe(value) ? "'" + value : value).replace(
    /"/g,
    '""',
  ) +
  '"';
const decode = (value: string, safe: boolean) =>
  safe && value.startsWith("'") && (value[1] === "'" || unsafe(value.slice(1)))
    ? value.slice(1)
    : value;
export function filmCsv(records: readonly FilmRecord[]): string {
  return (
    "\uFEFF" +
    headers.join(",") +
    "\r\n" +
    records
      .map((film) =>
        [
          format,
          film.title,
          String(film.year ?? ""),
          String(film.rating),
          film.genre,
          film.status,
          film.watchedOn || "",
          film.notes,
          JSON.stringify(film.lists || []),
        ]
          .map(cell)
          .join(","),
      )
      .join("\r\n")
  );
}
export function csvRows(text: string): string[][] {
  if (text.length > 1_500_000)
    throw new Error("Choose a CSV file under 1.5 MB.");
  const rows: string[][] = [];
  let row: string[] = [],
    value = "",
    quoted = false,
    closed = false;
  const add = () => {
    row.push(value);
    value = "";
    closed = false;
  };
  const line = () => {
    add();
    if (row.some((value) => value !== "")) rows.push(row);
    row = [];
    if (rows.length > 10001)
      throw new Error("CSV supports up to 10,000 films.");
  };
  const raw = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (quoted) {
      if (char === '"') {
        if (raw[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else value += char;
      continue;
    }
    if (closed && char !== "," && char !== "\r" && char !== "\n")
      throw new Error("Unexpected text after a quoted CSV value.");
    if (char === '"') {
      if (value) throw new Error("Quote CSV values that contain quotes.");
      quoted = true;
    } else if (char === ",") add();
    else if (char === "\r" || char === "\n") {
      if (char === "\r" && raw[i + 1] === "\n") i++;
      line();
    } else value += char;
  }
  if (quoted) throw new Error("A quoted CSV value is unfinished.");
  if (value || row.length || closed) line();
  return rows;
}
const identity = (film: FilmRecord) =>
  JSON.stringify([film.title.normalize("NFKC").toLowerCase(), film.year]);
export function reviewFilmCsv(
  text: string,
  existing: readonly FilmRecord[],
  now = new Date().toISOString(),
) {
  const rows = csvRows(text);
  if (rows.length < 2)
    throw new Error("Include a header and at least one film.");
  const names = rows[0].map((value) => value.trim().toLowerCase());
  if (
    !names.includes("title") ||
    new Set(names).size !== names.length ||
    names.some(
      (name) => !headers.map((value) => value.toLowerCase()).includes(name),
    )
  )
    throw new Error(
      "Use the Film Journal CSV columns, including title. Export CSV for a template.",
    );
  const known = new Set(existing.map(identity));
  const add: FilmRecord[] = [];
  let duplicates = 0;
  for (const [index, row] of rows.slice(1).entries()) {
    if (row.length !== names.length)
      throw new Error(`CSV row ${index + 2} has the wrong number of columns.`);
    const values: Record<string, string> = Object.fromEntries(
      names.map((name, i) => [name, row[i]]),
    );
    const safe = values.format === format;
    try {
      const film = filmSchema.parse({
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        title: decode(values.title, safe),
        year: values.year?.trim() ? Number(values.year) : null,
        rating: values.rating?.trim() ? Number(values.rating) : 0,
        genre: values.genre || "Drama",
        status: values.status || "Watchlist",
        watchedOn: values.watchedon || "",
        notes: decode(values.notes || "", safe),
        lists: values.lists ? (JSON.parse(values.lists) as unknown) : [],
      });
      const key = identity(film);
      if (known.has(key)) {
        duplicates++;
        continue;
      }
      known.add(key);
      add.push(film);
    } catch {
      throw new Error(
        `Check the film fields on CSV row ${index + 2}. Use a valid year, 0–10 rating, genre/status, date and JSON list names.`,
      );
    }
  }
  if (existing.length + add.length > 10000)
    throw new Error("Import would exceed 10,000 films.");
  return { add, duplicates };
}
