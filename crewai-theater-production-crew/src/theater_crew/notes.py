import re
from importlib import resources

DEFAULT_NOTES = "season_notes.md"


def load_notes(name: str = DEFAULT_NOTES) -> str:
    return resources.files("theater_crew").joinpath("data", name).read_text(encoding="utf-8")


def read_notes_file(path: str) -> str:
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def extract_budget_ceiling(notes: str) -> int | None:
    match = re.search(r"budget ceiling[^$\d]*\$\s*([\d,]+)", notes, flags=re.IGNORECASE)
    return int(match.group(1).replace(",", "")) if match else None
