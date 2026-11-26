from types import SimpleNamespace

import main

REPLY = (
    '{"team": "Birch Two", "grid": "511 064", "status": "still_searching",'
    ' "injuries": [], "needs_helicopter": false, "next_report_minutes": 40}'
)


class StubClient:
    def __init__(self):
        message = SimpleNamespace(content=REPLY)
        response = SimpleNamespace(choices=[SimpleNamespace(message=message)])
        create = lambda **kwargs: response
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=create))


def test_extract_entry_is_traced_but_runs_without_opik(monkeypatch):
    monkeypatch.setattr(main, "get_client", StubClient)
    entry = main.extract_entry("Birch 2, Base. Report again in 40 minutes.")
    assert entry.team == "Birch Two"
    assert entry.next_report_minutes == 40


def test_extraction_prompt_keeps_base_out_of_the_team_field():
    assert "never from base" in main.EXTRACTION_PROMPT


def test_extraction_prompt_separates_hold_times_from_report_times():
    assert "not report times" in main.EXTRACTION_PROMPT
