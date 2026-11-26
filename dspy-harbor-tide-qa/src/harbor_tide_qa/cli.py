import argparse

from harbor_tide_qa.config import load_environment

SUITE_NAME = "harbor-tide-qa"


def build_suite(client):
    from harbor_tide_qa import PROJECT_NAME
    from harbor_tide_qa.examples import GLOBAL_ASSERTIONS, TEST_QUESTIONS

    # A test suite stores items plus LLM-judged assertions; run_tests scores every
    # item against them and records one experiment per run in the project.
    suite = client.get_or_create_test_suite(
        name=SUITE_NAME,
        project_name=PROJECT_NAME,
        global_assertions=GLOBAL_ASSERTIONS,
    )
    suite.insert([
        {"data": {"question": question, "table": table},
         "assertions": [f"The answer cites table {table}. {assertion}"]}
        for question, table, assertion in TEST_QUESTIONS
    ])
    return suite


def run_suite(suite, program, name: str, compiled: bool):
    import opik

    from harbor_tide_qa import MODEL
    from harbor_tide_qa.program import make_task

    # Each run_tests call becomes one experiment, so the uncompiled and compiled
    # runs can be opened side by side in the suite's runs view.
    return opik.run_tests(
        test_suite=suite,
        task=make_task(program),
        experiment_name=name,
        experiment_config={"program": "ChainOfThought(TideQA)",
                           "compiled": compiled, "model": MODEL},
        worker_threads=4,
        generate_report=False,
    )


def cmd_run(_: argparse.Namespace) -> None:
    import dspy
    import opik

    from harbor_tide_qa.examples import build_trainset
    from harbor_tide_qa.metrics import house_format_metric
    from harbor_tide_qa.program import build_program, configure_dspy

    configure_dspy()
    client = opik.Opik()
    suite = build_suite(client)
    program = build_program()

    print("Running the suite against the uncompiled program...")
    uncompiled = run_suite(suite, program, "dspy-uncompiled", compiled=False)

    # BootstrapFewShot runs the program over the training tickets, keeps the
    # attempts that pass the metric (reasoning included) and bakes up to four
    # of them into the prompt as demos. Those calls are traced too.
    print("\nCompiling with BootstrapFewShot...")
    optimizer = dspy.BootstrapFewShot(
        metric=house_format_metric,
        max_bootstrapped_demos=4,
        max_labeled_demos=4,
        max_rounds=1,
    )
    compiled_program = optimizer.compile(program, trainset=build_trainset())

    print("\nRunning the suite against the compiled program...")
    compiled = run_suite(suite, compiled_program, "dspy-compiled", compiled=True)

    print("\n=== Uncompiled vs compiled ===")
    for label, result in [("uncompiled", uncompiled), ("compiled  ", compiled)]:
        print(f"{label}: {result.pass_rate:.0%} pass rate "
              f"({result.items_passed}/{result.items_total} items passed)")
    if compiled.experiment_url:
        print(f"\nView the runs: {compiled.experiment_url}")
    # Traces are sent in batches from a background thread; flush so a short
    # script does not exit with the last ones still queued.
    opik.flush_tracker()


def cmd_ask(args: argparse.Namespace) -> None:
    import opik

    from harbor_tide_qa.program import answer_question, build_program, configure_dspy

    configure_dspy()
    print(answer_question(build_program(), args.question))
    opik.flush_tracker()


def main(argv: list[str] | None = None) -> None:
    load_environment()
    parser = argparse.ArgumentParser(prog="harbor-tide-qa")
    sub = parser.add_subparsers(dest="command")
    sub.add_parser("run", help="run the suite before and after compiling (default)")
    ask = sub.add_parser("ask", help="ask the uncompiled program one question")
    ask.add_argument("question")
    args = parser.parse_args(argv)
    if args.command == "ask":
        cmd_ask(args)
    else:
        cmd_run(args)
