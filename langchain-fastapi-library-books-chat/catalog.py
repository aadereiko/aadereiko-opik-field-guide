import json
from pathlib import Path

CATALOG_PATH = Path(__file__).parent / "data" / "catalog.json"


def load_catalog() -> list[dict]:
    return json.loads(CATALOG_PATH.read_text())


def format_catalog(books: list[dict]) -> str:
    return "\n".join(
        f"- [{b['id']}] \"{b['title']}\" by {b['author']} ({b['genre']}, {b['pages']} pages): {b['blurb']}"
        for b in books
    )
