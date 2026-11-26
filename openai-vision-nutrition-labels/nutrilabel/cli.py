import argparse
from pathlib import Path

from nutrilabel.render import generate_all, path_for
from nutrilabel.schema import check_consistency


def cmd_generate(args: argparse.Namespace) -> int:
    for path in generate_all(force=args.force):
        print(path)
    return 0


def cmd_extract(args: argparse.Namespace) -> int:
    import opik

    from nutrilabel.extract import extract_facts

    target = Path(args.image)
    if not target.exists():
        generate_all()
        target = path_for(args.image)
    facts = extract_facts(target)
    # Traces are sent in batches from a background thread; a short CLI must flush before it exits.
    opik.flush_tracker()
    print(facts.model_dump_json(indent=2))
    for problem in check_consistency(facts):
        print(f"warning: {problem}")
    return 0


def cmd_run(args: argparse.Namespace) -> int:
    from nutrilabel.suite import run_suite

    result = run_suite(args.experiment)
    print(f"Pass rate: {result.pass_rate:.0%} ({result.items_passed}/{result.items_total} labels)")
    for item_result in result.item_results.values():
        label = item_result.test_results[0].test_case.task_output["input"]["label"]
        print(f"  [{'PASS' if item_result.passed else 'FAIL'}] {label}")
    print(f"Experiment: {result.experiment_name} ({result.experiment_url})")
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

    run = sub.add_parser("run", help="extract every sample label and grade the results with a test suite")
    run.add_argument("--experiment", default="label-reader-gpt-4o-mini")
    run.set_defaults(func=cmd_run)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
