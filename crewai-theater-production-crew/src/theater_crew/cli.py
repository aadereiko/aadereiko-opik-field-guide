import argparse
import sys

import opik

from .env import load_env


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="theater-crew", description="Plan a community-theater production with a CrewAI crew.")
    parser.add_argument("--notes", help="Path to a production notes file (default: bundled notes)")
    parser.add_argument("--model", default=None, help="OpenAI model for all agents (default: gpt-4o-mini)")
    parser.add_argument("--quiet", action="store_true", help="Hide CrewAI's step-by-step console output")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    # Env must load before the crew is traced: the Opik client reads OPIK_URL_OVERRIDE / OPIK_WORKSPACE at creation.
    load_env()

    from .crew import MODEL, build_crew, enable_tracing
    from .notes import extract_budget_ceiling, load_notes, read_notes_file

    notes = read_notes_file(args.notes) if args.notes else load_notes()
    ceiling = extract_budget_ceiling(notes)
    if ceiling:
        print(f"Budget ceiling in notes: ${ceiling:,}")

    crew = enable_tracing(build_crew(model=args.model or MODEL, verbose=not args.quiet))
    result = crew.kickoff(inputs={"season_notes": notes})
    print("\n=== PRODUCTION PLAN ===\n")
    print(result)

    # Traces are sent in a background batch; flushing keeps a short-lived CLI from exiting before they upload.
    opik.flush_tracker()
    return 0


if __name__ == "__main__":
    sys.exit(main())
