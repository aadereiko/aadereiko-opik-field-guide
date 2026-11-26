import argparse
from pathlib import Path

from nutrilabel.render import generate_all, path_for
from nutrilabel.schema import check_consistency


def cmd_generate(args: argparse.Namespace) -> int:
    for path in generate_all(force=args.force):
        print(path)
    return 0


def cmd_extract(args: argparse.Namespace) -> int:
    from nutrilabel.extract import extract_facts

    target = Path(args.image)
    if not target.exists():
        generate_all()
        target = path_for(args.image)
    facts = extract_facts(target)
    print(facts.model_dump_json(indent=2))
    for problem in check_consistency(facts):
        print(f"warning: {problem}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="nutrilabel", description="Read nutrition-facts labels with a vision model")
    sub = parser.add_subparsers(dest="command", required=True)

    gen = sub.add_parser("generate", help="draw the sample label images into labels/")
    gen.add_argument("--force", action="store_true", help="redraw images that already exist")
    gen.set_defaults(func=cmd_generate)

    ext = sub.add_parser("extract", help="read one label (an image path or a sample slug like 'granola')")
    ext.add_argument("image")
    ext.set_defaults(func=cmd_extract)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
