import json
import os

from calls import RADIO_CALLS
from logbook import entry_to_dict
from main import DATA_DIR, extract_entry, log_radio_call

import opik

PROJECT = os.environ["OPIK_PROJECT_NAME"]
SUITE_NAME = "radio-log-field-suite"

# 'grid' is deliberately not judged: logbook.normalize_grid fixes its format in plain code (and
# tests/ cover it), and an LLM judge kept failing "511 064" against the spoken "511-064".

ASSERTIONS = [
    "The 'team' field is the callsign of the field team, not 'Base'.",
    "The values in 'status', 'injuries' and 'needs_helicopter' agree with "
    "what the transcript says. Nothing is invented.",
    "'next_report_minutes' is null unless the field team said when it will "
    "call base again. A duration for anything else (how long the team can "
    "hold, how long daylight lasts) must not appear there.",
]


def task(item: dict) -> dict:
    entry = extract_entry(item["transcript"])
    return {"input": {"transcript": item["transcript"]}, "output": entry_to_dict(entry)}


def load_transcripts() -> list[dict]:
    DATA_DIR.mkdir(exist_ok=True)
    records = []
    for call in RADIO_CALLS:
        path = DATA_DIR / f"{call['id']}.json"
        if not path.exists():
            log_radio_call(call)
        records.append(json.loads(path.read_text()))
    return records


if __name__ == "__main__":
    client = opik.Opik()
    # A test suite stores items plus plain-language assertions. An LLM judge scores each
    # assertion pass/fail per item, and every run shows up under the project's Experiments.
    suite = client.get_or_create_test_suite(
        name=SUITE_NAME,
        project_name=PROJECT,
        global_assertions=ASSERTIONS,
        # The judge and the extractor are both small LLMs, so one run can flip. Each item runs 3
        # times and passes if 2 pass; the experiment lists the repeats instead of one lucky draw.
        global_execution_policy={"runs_per_item": 3, "pass_threshold": 2},
    )

    existing = {item["data"]["call"] for item in suite.get_items()}
    for record in load_transcripts():
        if record["call"] not in existing:
            suite.insert([{"data": {"call": record["call"], "transcript": record["transcript"]}}])

    result = opik.run_tests(test_suite=suite, task=task)
    print(f"\nPass rate: {result.pass_rate:.0%}")
    opik.flush_tracker()
