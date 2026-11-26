from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Diff:
    id: str
    title: str
    patch: str


def parse_diff(diff_id: str, text: str) -> Diff:
    first, _, rest = text.partition("\n")
    if not first.startswith("title:"):
        raise ValueError(f"{diff_id}: first line must start with 'title:'")
    return Diff(id=diff_id, title=first.removeprefix("title:").strip(), patch=rest.strip("\n"))


def load_diffs(directory: Path) -> list[Diff]:
    return [parse_diff(p.stem, p.read_text()) for p in sorted(directory.glob("*.diff"))]
