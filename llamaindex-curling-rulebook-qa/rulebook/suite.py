import opik

from .settings import PROJECT_NAME

SUITE_NAME = "curling-rulebook-rules"

RULE_CASES = [
    ("B-2.3", "How much is the season registration fee and what happens if a team pays late?",
     ["The answer states the registration fee is $240 per team",
      "The answer states the late fee is $35 for payment after October 15"]),
    ("B-4.2", "How long does a team have to field three players before it forfeits?",
     ["The answer states the wait is 15 minutes after the scheduled start"]),
    ("G-3.4", "What happens when a game is tied after the regular number of ends?",
     ["The answer states one extra end is played",
      "The answer states the team that did not have the last stone in the eighth end gets the last stone in the extra end"]),
    ("G-5.2", "Until which stone of an end is a free guard protected from removal?",
     ["The answer states guards are protected until the fourth stone has been thrown"]),
    ("G-7.2", "How much thinking time does each team get?",
     ["The answer states 38 minutes per team per game"]),
    ("O-2.2", "When are ice closures announced, and how soon is a cancelled game replayed?",
     ["The answer states closures are announced by 4:00 p.m. on game day",
      "The answer states a cancelled game is rescheduled within 14 days"]),
    ("O-4.1", "How many yellow cards lead to a suspension?",
     ["The answer states three yellow cards in one season lead to a one-game suspension"]),
    ("O-5.3", "What is the deadline and deposit for filing a protest?",
     ["The answer states a protest must be filed within 48 hours",
      "The answer states the deposit is $50"]),
]

GLOBAL_ASSERTIONS = [
    "If the answer states any fee, percentage, day count, time or number of stones, that same figure "
    "appears in the retrieved excerpts. An answer that states no such figure passes this check",
    "The answer names the rule it relies on",
]


def suite_items() -> list[dict]:
    return [
        {"data": {"rule_id": rule_id, "question": question}, "assertions": assertions}
        for rule_id, question, assertions in RULE_CASES
    ]


def build_suite(client: opik.Opik):
    # A test suite stores each question with plain-English assertions; an LLM judge checks them
    # on every run. It shows up under the project's test suites and each run becomes an experiment.
    suite = client.get_or_create_test_suite(
        name=SUITE_NAME,
        project_name=PROJECT_NAME,
        global_assertions=GLOBAL_ASSERTIONS,
    )
    suite.insert(suite_items())
    return suite


def run_suite(suite, answer_fn):
    def task(item: dict) -> dict:
        return {"input": item, "output": answer_fn(item["question"])}

    # run_tests calls the task per item, then the judge scores each assertion; the result is
    # an experiment with one row per rule and a pass rate.
    return opik.run_tests(test_suite=suite, task=task, worker_threads=3, generate_report=False)


def print_summary(result) -> None:
    print(f"\nPass rate: {result.pass_rate:.0%} ({result.items_passed}/{result.items_total} rules passed)")
    for item_result in result.item_results.values():
        first = item_result.test_results[0].test_case.task_output["input"]
        print(f"  [{'PASS' if item_result.passed else 'FAIL'}] {first['rule_id']}: {first['question']}")
        if not item_result.passed:
            for run in item_result.test_results:
                for score in run.score_results:
                    if score.scoring_failed or score.value != 1:
                        print(f"         failed: {score.name}: {score.reason}")
    if result.experiment_url:
        print(f"\nView the run: {result.experiment_url}")
