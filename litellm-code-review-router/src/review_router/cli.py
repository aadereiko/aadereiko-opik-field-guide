import argparse
from pathlib import Path

from .config import DIFFS_DIR, MODELS, load_environment


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="review-router",
        description="Review fictional diffs with several models and compare cost and latency.",
    )
    parser.add_argument("--models", nargs="+", default=MODELS, help="LiteLLM model names")
    parser.add_argument("--diffs", type=Path, default=DIFFS_DIR, help="folder of .diff files")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    load_environment()

    from .diffs import load_diffs
    from .report import format_table, summarize
    from .router import route_all

    diffs = load_diffs(args.diffs)
    print(f"Reviewing {len(diffs)} diffs with {len(args.models)} models")
    results = route_all(args.models, diffs)
    print()
    print(format_table(summarize(results)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
