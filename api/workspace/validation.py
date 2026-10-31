import re
from datetime import date, datetime
from math import isfinite


class Invalid(ValueError):
    pass


def text(record, key, minimum=0, maximum=200):
    value = record.get(key)
    if not isinstance(value, str) or not minimum <= len(value.strip()) <= maximum:
        raise Invalid(f"Invalid {key}.")
    return value


def validate_records(records):
    if not isinstance(records, list) or len(records) > 10000:
        raise Invalid("A journal supports up to 10,000 films.")
    expected = {
        "id",
        "createdAt",
        "updatedAt",
        "title",
        "year",
        "rating",
        "genre",
        "status",
        "notes",
    }
    seen = set()
    for record in records:
        if (
            not isinstance(record, dict)
            or not expected <= set(record)
            or set(record) - expected - {"watchedOn", "lists"}
        ):
            raise Invalid("Record fields do not match Film Journal.")
        identity = text(record, "id", 1, 80)
        if identity in seen or not re.fullmatch(r"[A-Za-z0-9_-]+", identity):
            raise Invalid("Film IDs must be unique and valid.")
        seen.add(identity)
        for key in ["createdAt", "updatedAt"]:
            try:
                value = datetime.fromisoformat(text(record, key, 1, 40).replace("Z", "+00:00"))
                if value.tzinfo is None:
                    raise ValueError()
            except ValueError as exc:
                raise Invalid("Timestamps require an explicit timezone.") from exc
        text(record, "title", 1, 160)
        text(record, "notes", 0, 2000)
        year = record.get("year")
        if year is not None and (
            isinstance(year, bool) or not isinstance(year, int) or not 1888 <= year <= 2200
        ):
            raise Invalid("Invalid release year.")
        rating = record.get("rating")
        if (
            isinstance(rating, bool)
            or not isinstance(rating, (int, float))
            or not isfinite(rating)
            or not 0 <= rating <= 10
        ):
            raise Invalid("Invalid personal rating.")
        if record.get("genre") not in [
            "Drama",
            "Comedy",
            "Thriller",
            "Animation",
            "Documentary",
            "Other",
        ] or record.get("status") not in ["Watchlist", "Watched"]:
            raise Invalid("Invalid film classification.")
        if "lists" in record:
            lists = record["lists"]
            if not isinstance(lists, list) or len(lists) > 12:
                raise Invalid("Use up to 12 list names.")
            seen_lists = set()
            for name in lists:
                if (
                    not isinstance(name, str)
                    or name != name.strip()
                    or not 1 <= len(name) <= 40
                    or re.search(r"[,\r\n]", name)
                    or name.lower() in seen_lists
                ):
                    raise Invalid("Use unique list names of up to 40 characters.")
                seen_lists.add(name.lower())
        if "watchedOn" in record:
            watched = text(record, "watchedOn", 0, 10)
            if watched:
                try:
                    if (
                        date.fromisoformat(watched).isoformat() != watched
                        or record["status"] != "Watched"
                    ):
                        raise ValueError()
                except ValueError as exc:
                    raise Invalid("Choose a real watched date for a watched film.") from exc
    return records
