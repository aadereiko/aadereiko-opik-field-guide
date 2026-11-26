from types import SimpleNamespace

import litellm
import pytest

from review_router import router, tracing
from review_router.config import DIFFS_DIR
from review_router.diffs import Diff, load_diffs, parse_diff
from review_router.prompts import build_messages, extract_verdict
from review_router.report import format_table, summarize
from review_router.router import ReviewResult


def fake_response(text="Adds retries.\n- no jitter\nVerdict: request changes"):
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=text))],
        usage=SimpleNamespace(total_tokens=321),
        _hidden_params={"response_cost": 0.0004},
    )


def test_parse_diff_splits_title_and_patch():
    diff = parse_diff("0009-x", "title: Fix it\n--- a/x\n+++ b/x\n")
    assert diff.title == "Fix it"
    assert diff.patch.startswith("--- a/x")


def test_parse_diff_requires_title():
    with pytest.raises(ValueError):
        parse_diff("0009-x", "--- a/x\n")


def test_bundled_diffs_load():
    diffs = load_diffs(DIFFS_DIR)
    assert len(diffs) == 4
    assert all(d.patch for d in diffs)


def test_build_messages_contains_patch():
    messages = build_messages(Diff("d1", "Title", "+added line"))
    assert messages[0]["role"] == "system"
    assert "+added line" in messages[1]["content"]


def test_extract_verdict():
    assert extract_verdict("ok\nVerdict: approve") == "approve"
    assert extract_verdict("no verdict here") == "unknown"


def test_summarize_and_format():
    results = [
        ReviewResult("openai/a", "d1", "", "approve", 1.0, 0.001, 100),
        ReviewResult("openai/a", "d2", "", "request changes", 3.0, 0.003, 300),
        ReviewResult("openai/b", "d1", "", "approve", 2.0, 0.0005, 50),
    ]
    rows = {r["model"]: r for r in summarize(results)}
    assert rows["a"]["tokens"] == 400
    assert rows["a"]["mean_latency_s"] == 2.0
    assert rows["a"]["approvals"] == 1
    assert "b" in format_table(list(rows.values()))


def test_review_diff_with_tracing_enabled_but_tracking_disabled(monkeypatch):
    monkeypatch.setenv("OPIK_TRACK_DISABLE", "true")
    monkeypatch.setattr(litellm, "completion", lambda **kwargs: fake_response())
    tracing.enable_tracing()
    result = router.review_diff("openai/gpt-4o-mini", Diff("d1", "T", "+x"))
    assert result.tokens == 321
    assert result.cost_usd == 0.0004
    assert result.verdict == "request changes"
    litellm.callbacks = []


def test_trace_metadata_tags_model_and_diff():
    meta = tracing.trace_metadata("openai/gpt-4.1", Diff("d7", "T", "+x"))
    assert meta["opik"]["tags"] == ["gpt-4.1", "d7"]
