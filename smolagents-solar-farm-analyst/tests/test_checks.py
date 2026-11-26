import pandas as pd
import pytest

import checks
import farm


@pytest.fixture(scope="module")
def df():
    return farm.load_output()


def test_extract_code_handles_closed_and_unclosed_blocks():
    out = "Thought: x\n<code>\nprint(1)\n</code>\nmore\n<code>print(2)"
    assert checks.extract_code(out) == ["print(1)", "print(2)"]


def test_data_has_planted_findings(df):
    truth = checks.ground_truth(df)
    assert truth["worst_array"] == "B2"
    assert truth["outage_date"] == pd.Timestamp("2025-05-14")
    assert set(truth["monthly_mwh"]) == {"April", "May", "June"}


def test_grade_accepts_correct_and_rejects_wrong_answers(df):
    truth = checks.ground_truth(df)
    assert checks.grade(0, "Array B2 is about 13% below the median.", truth)
    assert not checks.grade(0, "Array A1 is lowest.", truth)
    day = f"{truth['day_before_kwh']:,.2f}"
    assert checks.grade(1, f"No output on May 14, 2025; the day before was {day} kWh.", truth)
    assert not checks.grade(1, "No output on May 15, 2025.", truth)
    m = truth["monthly_mwh"]
    ok = f"April {m['April']}, May {m['May']}, June {m['June']} MWh; May is highest."
    assert checks.grade(2, ok, truth)
    assert checks.grade(2, "April 88.52 MWh, May 96.26 MWh, June 83.36 MWh, with May having the highest output.", truth)
    assert not checks.grade(2, ok.replace("May is highest", "June is highest"), truth)


def test_zero_output_dates_finds_only_the_storm(df):
    assert farm.zero_output_dates(df) == ["2025-05-14"]


def test_printed_output_strips_the_wrapper_text():
    step = "Execution logs:\nB2 0.16\nLast output from code snippet:\nNone"
    assert checks.printed_output(step) == "B2 0.16"
    assert checks.printed_output("Execution logs:\nLast output from code snippet:\nNone") == ""
