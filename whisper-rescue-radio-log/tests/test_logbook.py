import json

import pytest

from logbook import LogEntryError, format_entry, normalize_grid, parse_entry

VALID = {
    "team": "Alder One",
    "grid": "472 189",
    "status": "found_alive",
    "injuries": ["suspected broken ankle"],
    "needs_helicopter": True,
    "next_report_minutes": None,
}


def raw(**overrides):
    return json.dumps({**VALID, **overrides})


def test_parse_valid_entry():
    entry = parse_entry(raw())
    assert entry.team == "Alder One"
    assert entry.needs_helicopter is True
    assert entry.next_report_minutes is None


@pytest.mark.parametrize("text", ["472189", "511-064", "grid 472 189"])
def test_normalize_grid_accepts_common_spellings(text):
    assert len(normalize_grid(text)) == 7
    assert normalize_grid(text)[3] == " "


def test_grid_needs_six_digits():
    with pytest.raises(LogEntryError):
        normalize_grid("47 189")


def test_base_is_not_a_team():
    with pytest.raises(LogEntryError):
        parse_entry(raw(team="Base"))


def test_unknown_status_is_rejected():
    with pytest.raises(LogEntryError):
        parse_entry(raw(status="lost"))


def test_non_json_reply_is_rejected():
    with pytest.raises(LogEntryError):
        parse_entry("Sure! Here is the log entry")


def test_format_entry_lists_next_call_only_when_given():
    assert "Next call" not in format_entry(parse_entry(raw()))
    assert "in 40 min" in format_entry(parse_entry(raw(next_report_minutes=40)))
