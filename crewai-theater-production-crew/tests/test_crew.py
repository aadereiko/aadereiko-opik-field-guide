from theater_crew.cli import build_parser, main
from theater_crew.crew import build_crew, enable_tracing


def test_crew_has_three_sequential_tasks_with_context():
    crew = build_crew(verbose=False)
    assert [t.name for t in crew.tasks] == ["Cast the show", "Schedule rehearsals", "Draft the budget"]
    assert len(crew.tasks[2].context) == 2


def test_enable_tracing_with_tracking_disabled_is_harmless(monkeypatch):
    monkeypatch.setenv("OPIK_TRACK_DISABLE", "true")
    crew = enable_tracing(build_crew(verbose=False))
    assert len(crew.agents) == 3


def test_parser_defaults():
    args = build_parser().parse_args([])
    assert args.notes is None and args.quiet is False


def test_cli_runs_with_stubbed_kickoff(monkeypatch, capsys):
    monkeypatch.setenv("OPIK_TRACK_DISABLE", "true")
    from crewai import Crew

    monkeypatch.setattr(Crew, "kickoff", lambda self, inputs=None: f"stub plan ({len(inputs['season_notes'])} chars)")
    assert main(["--quiet"]) == 0
    assert "stub plan" in capsys.readouterr().out
