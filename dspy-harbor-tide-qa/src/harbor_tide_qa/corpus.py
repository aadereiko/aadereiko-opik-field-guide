import re
from importlib.resources import files

SECTION_HEADER = re.compile(r"^\[([A-Z]+-\d+)\]\s*", re.MULTILINE)


def load_tables() -> str:
    return files("harbor_tide_qa").joinpath("data/tide_tables.txt").read_text(encoding="utf-8")


def split_sections(text: str) -> dict[str, str]:
    parts = SECTION_HEADER.split(text)
    return {
        parts[i]: " ".join(parts[i + 1].split())
        for i in range(1, len(parts), 2)
    }
