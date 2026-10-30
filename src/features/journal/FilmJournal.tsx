import { useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BookOpen,
  Check,
  Clock3,
  Download,
  Film,
  Moon,
  Pencil,
  Plus,
  Search,
  Star,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import type { WorkspaceState } from "../../platform/AccountWorkspaceGate";
import { Button, Dropdown, Input, Modal, Textarea } from "../../platform/ui";
import DateInput from "../../platform/DateInput";
import { message } from "../../platform/workspaceApi";
import product from "../../../product.json";
import {
  filmSchema,
  genres,
  journalSummary,
  parseFilmBackup,
  today,
  type FilmRecord,
} from "./model";
const field = "grid min-w-0 gap-2 text-sm font-medium";
const covers = [
  "from-indigo-950 via-slate-800 to-amber-900",
  "from-rose-950 via-stone-800 to-orange-900",
  "from-emerald-950 via-slate-800 to-teal-900",
  "from-violet-950 via-slate-800 to-fuchsia-900",
];
function exportFilms(records: FilmRecord[]) {
  const url = URL.createObjectURL(
    new Blob(
      [JSON.stringify({ version: 2, product: product.id, records }, null, 2)],
      { type: "application/json" },
    ),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "film-journal-backup.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function FilmJournal({
  state,
}: {
  state: WorkspaceState<FilmRecord>;
}) {
  const [params, setParams] = useSearchParams();
  const view =
    params.get("view") === "watchlist"
      ? "watchlist"
      : params.get("view") === "journal"
        ? "journal"
        : "library";
  const [query, setQuery] = useState(""),
    [genre, setGenre] = useState("all"),
    [sort, setSort] = useState("recent");
  const [editor, setEditor] = useState<{ record?: FilmRecord } | null>(null),
    [dirty, setDirty] = useState(false),
    [discard, setDiscard] = useState(false),
    [remove, setRemove] = useState<FilmRecord | null>(null),
    [reading, setReading] = useState<FilmRecord | null>(null),
    [restore, setRestore] = useState<FilmRecord[] | null>(null);
  const [status, setStatus] = useState<"Watchlist" | "Watched">("Watchlist"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [dark, setDark] = useState(
      () => document.documentElement.dataset.theme === "dark",
    );
  const upload = useRef<HTMLInputElement>(null),
    summary = journalSummary(state.records);
  const films = state.records
    .filter(
      (record) =>
        (view === "library" ||
          record.status === (view === "watchlist" ? "Watchlist" : "Watched")) &&
        (genre === "all" || record.genre === genre) &&
        (record.title + " " + record.notes)
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "rating"
          ? b.rating - a.rating || a.title.localeCompare(b.title)
          : b.updatedAt.localeCompare(a.updatedAt),
    );
  function navigate(next: string) {
    setParams({ view: next });
    setQuery("");
    setError("");
  }
  function open(record?: FilmRecord) {
    setEditor(record ? { record } : {});
    setStatus(record?.status || "Watchlist");
    setDirty(false);
    setError("");
  }
  function close() {
    if (state.busy) return;
    if (dirty) setDiscard(true);
    else setEditor(null);
  }
  async function save(records: FilmRecord[], text: string) {
    setError("");
    try {
      await state.save(records);
      setNotice(text);
      return true;
    } catch (failure) {
      setError(message(failure));
      return false;
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const now = new Date().toISOString();
    try {
      const next = filmSchema.parse({
        ...(editor?.record || { id: crypto.randomUUID(), createdAt: now }),
        updatedAt: now,
        title: form.get("title"),
        year: form.get("year") === "" ? null : Number(form.get("year")),
        rating: Number(form.get("rating")),
        genre: form.get("genre"),
        status,
        notes: form.get("notes"),
        watchedOn:
          status === "Watched" ? String(form.get("watchedOn") || "") : "",
      });
      if (
        await save(
          editor?.record
            ? state.records.map((record) =>
                record.id === next.id ? next : record,
              )
            : [...state.records, next],
          editor?.record ? "Review updated." : "Film added to your collection.",
        )
      ) {
        setEditor(null);
        setDirty(false);
      }
    } catch (failure) {
      setError(message(failure));
    }
  }
  return (
    <div className="min-h-[calc(100dvh-48px)] bg-canvas text-ink">
      <a
        href="#journal-main"
        className="sr-only z-50 rounded-lg bg-ink p-3 text-canvas focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <header className="border-b border-line bg-surface px-5 py-5 sm:px-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5">
          <a
            href="/"
            className="flex items-center gap-3 text-xl font-semibold tracking-tight"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-white dark:text-slate-950">
              <Film size={22} />
            </span>
            Film Journal
          </a>
          <nav aria-label="Film library navigation" className="flex gap-1">
            {[
              ["library", "Collection"],
              ["watchlist", "Watchlist"],
              ["journal", "My journal"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-current={view === key ? "page" : undefined}
                onClick={() => navigate(key)}
                className={`rounded-xl px-3 py-2.5 text-sm font-medium sm:px-5 ${view === key ? "bg-soft text-primary" : "text-muted hover:bg-soft"}`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="flex gap-2">
            <Button
              tone="quiet"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => {
                const next = !dark;
                setDark(next);
                document.documentElement.dataset.theme = next
                  ? "dark"
                  : "light";
                try {
                  localStorage.setItem(
                    product.storageNamespace + ".appearance",
                    next ? "dark" : "light",
                  );
                } catch {
                  /* The visible theme still changes when storage is blocked. */
                }
              }}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </Button>
            <Button disabled={state.busy} onClick={() => open()}>
              <Plus size={16} />
              Add movie
            </Button>
          </div>
        </div>
      </header>
      <main
        id="journal-main"
        tabIndex={-1}
        className="mx-auto max-w-7xl px-4 py-7 outline-none sm:px-8 sm:py-10"
      >
        <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-7 text-white sm:p-10">
          <div className="pointer-events-none absolute -top-12 -right-10 size-72 rounded-full bg-orange-300/15 blur-3xl" />
          <div className="relative max-w-2xl">
            <p className="text-[10px] font-semibold tracking-[.2em] text-orange-200 uppercase">
              Your taste, remembered
            </p>
            <h1 className="mt-4 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
              {view === "watchlist"
                ? "Make room for your next great watch."
                : view === "journal"
                  ? "The films that stayed with you."
                  : "A life in films, one story at a time."}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
              {view === "journal"
                ? "Record your own rating, watched date and review. This is your perspective."
                : view === "watchlist"
                  ? "Keep a considered list, then move each film into your personal journal."
                  : "Build a personal collection and keep the details that make a film worth remembering."}
            </p>
            <div className="mt-7 flex flex-wrap gap-x-7 gap-y-4 text-xs text-slate-300">
              <span className="flex items-center gap-2">
                <Film size={15} />
                {state.records.length} films
              </span>
              <span className="flex items-center gap-2">
                <Clock3 size={15} />
                {summary.watchlist} on your watchlist
              </span>
              <span className="flex items-center gap-2">
                <Check size={15} />
                {summary.watched} watched
              </span>
              <span className="flex items-center gap-2">
                <Star size={15} />
                {summary.average === null
                  ? "No watched ratings yet"
                  : summary.average.toFixed(1) + " / 10 watched average"}
              </span>
            </div>
          </div>
        </section>
        {notice && (
          <p
            role="status"
            className="mt-5 rounded-xl bg-success/10 p-3 text-sm text-success"
          >
            {notice}
          </p>
        )}
        {error && !editor && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-danger/10 p-3 text-sm text-danger"
          >
            {error}
          </p>
        )}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="relative min-w-48 flex-1">
            <Search
              size={17}
              className="pointer-events-none absolute top-3.5 left-3 text-muted"
            />
            <Input
              type="search"
              aria-label="Search films"
              placeholder="Search films and your reviews"
              className="pl-10"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="w-44">
            <Dropdown
              label="Film genre"
              value={genre}
              options={[
                { value: "all", label: "All genres" },
                ...genres.map((value) => ({ value, label: value })),
              ]}
              onChange={setGenre}
            />
          </div>
          <div className="w-44">
            <Dropdown
              label="Sort films"
              value={sort}
              options={[
                { value: "recent", label: "Recently updated" },
                { value: "title", label: "Title A–Z" },
                { value: "rating", label: "Your highest rated" },
              ]}
              onChange={setSort}
            />
          </div>
          <Button
            tone="quiet"
            disabled={state.busy}
            onClick={() => exportFilms(state.records)}
          >
            <Download size={15} />
            Export JSON
          </Button>
          <Button
            tone="quiet"
            disabled={state.busy}
            onClick={() => upload.current?.click()}
          >
            <Upload size={15} />
            Import JSON
          </Button>
          <input
            ref={upload}
            aria-label="Import workspace JSON"
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={async (event) => {
              const input = event.currentTarget,
                file = input.files?.[0];
              if (!file) return;
              try {
                if (file.size > 1_500_000)
                  throw new Error("Choose a file under 1.5 MB.");
                const raw: unknown = JSON.parse(await file.text());
                setRestore(parseFilmBackup(raw));
                setError("");
              } catch (failure) {
                setError(message(failure));
              } finally {
                input.value = "";
              }
            }}
          />
        </div>
        <div className="mt-7 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {view === "journal"
              ? "Your film diary"
              : view === "watchlist"
                ? "Up next"
                : "Your collection"}
          </h2>
          <span className="text-xs text-muted">
            {films.length} {films.length === 1 ? "film" : "films"}
          </span>
        </div>
        <section
          aria-label="Film collection"
          className={
            view === "journal"
              ? "mt-5 grid gap-5"
              : "mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          }
        >
          {films.map((record, index) => (
            <article
              key={record.id}
              className={`overflow-hidden rounded-2xl border border-line bg-surface ${view === "journal" ? "grid sm:grid-cols-[190px_1fr]" : ""}`}
            >
              <button
                type="button"
                aria-label={"Read " + record.title}
                onClick={() => setReading(record)}
                className={`relative flex w-full flex-col justify-between bg-linear-to-br ${covers[index % covers.length]} p-6 text-left text-white ${view === "journal" ? "min-h-44" : "aspect-3/4"}`}
              >
                <span className="flex items-center justify-between gap-3 text-[10px] tracking-wider uppercase">
                  <span>{record.genre}</span>
                  <Film size={17} />
                </span>
                <span
                  className="my-8 block text-4xl font-light tracking-tight opacity-25"
                  aria-hidden="true"
                >
                  {record.title
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((word) => word[0])
                    .join("")}
                </span>
                <span>
                  <strong className="block text-xl leading-tight font-semibold">
                    {record.title}
                  </strong>
                  <span className="mt-3 block text-xs text-white/70">
                    {record.year ?? "Year not recorded"}
                  </span>
                </span>
              </button>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`rounded-md px-2 py-1 text-[10px] font-medium ${record.status === "Watched" ? "bg-success/10 text-success" : "bg-soft text-primary"}`}
                  >
                    {record.status}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold">
                    <Star size={13} className="fill-primary text-primary" />
                    {record.rating.toFixed(1)}
                    <span className="font-normal text-muted">/ 10</span>
                  </span>
                </div>
                <h3 className="mt-4 font-semibold leading-6">{record.title}</h3>
                {record.status === "Watched" && (
                  <p className="mt-2 text-xs text-muted">
                    {record.watchedOn
                      ? "Watched " + record.watchedOn
                      : "Watched date not recorded"}
                  </p>
                )}
                {record.notes && (
                  <p
                    className={`mt-3 whitespace-pre-wrap text-sm leading-7 text-muted ${view === "journal" ? "line-clamp-6" : "line-clamp-3"}`}
                  >
                    {record.notes}
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-2">
                  {record.status === "Watchlist" ? (
                    <Button
                      tone="quiet"
                      className="min-h-9 px-3 py-2 text-xs"
                      disabled={state.busy}
                      onClick={() =>
                        void save(
                          state.records.map((item) =>
                            item.id === record.id
                              ? {
                                  ...record,
                                  status: "Watched",
                                  watchedOn: today(),
                                  updatedAt: new Date().toISOString(),
                                }
                              : item,
                          ),
                          "Film added to your journal.",
                        )
                      }
                    >
                      <Check size={13} />
                      Mark watched
                    </Button>
                  ) : (
                    <Button
                      tone="quiet"
                      className="min-h-9 px-3 py-2 text-xs"
                      onClick={() => setReading(record)}
                    >
                      <BookOpen size={13} />
                      Read review
                    </Button>
                  )}
                  <Button
                    tone="quiet"
                    className="min-h-9 p-2"
                    aria-label={"Edit " + record.title}
                    disabled={state.busy}
                    onClick={() => open(record)}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    tone="quiet"
                    className="min-h-9 p-2"
                    aria-label={"Delete " + record.title}
                    disabled={state.busy}
                    onClick={() => setRemove(record)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </article>
          ))}
          {!films.length && (
            <div className="rounded-2xl border border-dashed border-line p-10 text-center sm:col-span-2 lg:col-span-3 xl:col-span-4">
              <Film className="mx-auto mb-5 text-primary" size={30} />
              <h3 className="text-lg font-semibold">
                {state.records.length
                  ? "No films match this view."
                  : "Your next favourite starts here."}
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted">
                {state.records.length
                  ? "Try another search or genre."
                  : "Add a film to your watchlist and make this collection your own."}
              </p>
              {!state.records.length && (
                <Button className="mt-6" onClick={() => open()}>
                  Add your first movie
                </Button>
              )}
            </div>
          )}
        </section>
        <footer className="mt-10 text-center text-[11px] leading-6 text-muted">
          Film Journal · Personal ratings and reviews · Cover artwork is
          decorative, not official film artwork
        </footer>
      </main>
      <Modal
        open={editor !== null}
        title={editor?.record ? "Edit movie" : "Add movie"}
        onClose={close}
        busy={state.busy}
      >
        <form
          key={editor?.record?.id || "new"}
          onSubmit={(event) => void submit(event)}
          onChange={() => setDirty(true)}
          onInput={() => setDirty(true)}
          className="grid gap-4"
        >
          <fieldset disabled={state.busy} className="grid min-w-0 gap-4">
            <label className={field}>
              Movie title
              <Input
                name="title"
                defaultValue={editor?.record?.title}
                required
                maxLength={160}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={field}>
                Release year
                <Input
                  name="year"
                  type="number"
                  defaultValue={editor?.record?.year ?? ""}
                  min={1888}
                  max={2200}
                  placeholder="Optional"
                />
              </label>
              <label className={field}>
                Your rating (0–10)
                <Input
                  name="rating"
                  type="number"
                  defaultValue={editor?.record?.rating ?? 0}
                  required
                  min={0}
                  max={10}
                  step={0.1}
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={field}>
                <label htmlFor="journal-genre">Genre</label>
                <Dropdown
                  id="journal-genre"
                  name="genre"
                  label="Genre"
                  defaultValue={editor?.record?.genre || "Drama"}
                  options={genres.map((value) => ({ value, label: value }))}
                  onChange={() => setDirty(true)}
                />
              </div>
              <div className={field}>
                <label htmlFor="journal-status">Status</label>
                <Dropdown
                  id="journal-status"
                  name="status"
                  label="Status"
                  value={status}
                  options={["Watchlist", "Watched"].map((value) => ({
                    value,
                    label: value,
                  }))}
                  onChange={(value) => {
                    setStatus(value === "Watched" ? "Watched" : "Watchlist");
                    setDirty(true);
                  }}
                />
              </div>
            </div>
            {status === "Watched" && (
              <div className={field}>
                <label htmlFor="journal-date">Watched on</label>
                <DateInput
                  id="journal-date"
                  name="watchedOn"
                  label="Watched on"
                  defaultValue={editor?.record?.watchedOn}
                />
              </div>
            )}
            <label className={field}>
              Your review
              <Textarea
                name="notes"
                defaultValue={editor?.record?.notes}
                maxLength={2000}
                className="min-h-40"
                placeholder="What stayed with you?"
              />
            </label>
          </fieldset>
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-danger/10 p-3 text-sm text-danger"
            >
              {error}
            </p>
          )}
          <div className="mt-3 flex justify-end gap-3">
            <Button tone="quiet" disabled={state.busy} onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={state.busy}>
              {state.busy ? "Saving…" : "Save movie"}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={reading !== null}
        title={reading?.title || "Film review"}
        onClose={() => setReading(null)}
      >
        <p className="text-xs text-muted">
          {reading?.year ?? "Year not recorded"} · {reading?.genre} · Your
          rating {reading?.rating} / 10
        </p>
        <p className="mt-3 text-xs text-muted">
          {reading?.status}
          {reading?.watchedOn ? " · " + reading.watchedOn : ""}
        </p>
        <div className="mt-6 whitespace-pre-wrap text-sm leading-8">
          {reading?.notes || "No review recorded yet."}
        </div>
        <Button
          tone="quiet"
          className="mt-7"
          onClick={() => {
            const record = reading || undefined;
            setReading(null);
            open(record);
          }}
        >
          Edit review
        </Button>
      </Modal>
      <Modal
        open={discard}
        title="Discard unsaved changes?"
        onClose={() => setDiscard(false)}
      >
        <p className="text-sm text-muted">
          Your review changes have not been saved.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button tone="quiet" onClick={() => setDiscard(false)}>
            Keep editing
          </Button>
          <Button
            tone="danger"
            onClick={() => {
              setDiscard(false);
              setEditor(null);
              setDirty(false);
            }}
          >
            Discard changes
          </Button>
        </div>
      </Modal>
      <Modal
        open={remove !== null}
        title="Delete movie?"
        onClose={() => setRemove(null)}
        busy={state.busy}
      >
        <p className="text-sm leading-7 text-muted">
          This removes this film and its personal review from your account.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            tone="quiet"
            disabled={state.busy}
            onClick={() => setRemove(null)}
          >
            Keep movie
          </Button>
          <Button
            tone="danger"
            disabled={state.busy}
            onClick={async () => {
              if (
                remove &&
                (await save(
                  state.records.filter((record) => record.id !== remove.id),
                  "Film removed.",
                ))
              )
                setRemove(null);
            }}
          >
            Delete movie
          </Button>
        </div>
      </Modal>
      <Modal
        open={restore !== null}
        title="Replace workspace from export?"
        onClose={() => setRestore(null)}
        busy={state.busy}
      >
        <p className="text-sm leading-7 text-muted">
          Import {restore?.length} films and reviews, replacing your{" "}
          {state.records.length} current records. Export a backup before
          continuing. Previous Movies exports are supported.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            tone="quiet"
            disabled={state.busy}
            onClick={() => setRestore(null)}
          >
            Cancel import
          </Button>
          <Button
            disabled={state.busy}
            onClick={async () => {
              if (restore && (await save(restore, "Film collection imported.")))
                setRestore(null);
            }}
          >
            Replace workspace
          </Button>
        </div>
      </Modal>
    </div>
  );
}
