import re

from rulebook import corpus, engine, suite


def test_generates_three_pdfs(tmp_path):
    paths = corpus.generate_pdfs(tmp_path)
    assert len(paths) == 3
    assert all(p.exists() and p.stat().st_size > 500 for p in paths)


def test_every_suite_rule_exists_in_corpus():
    text = corpus.corpus_text()
    for item in suite.suite_items():
        assert f"Rule {item['data']['rule_id']} " in text


def test_rule_ids_are_unique_and_well_formed():
    ids = [i["data"]["rule_id"] for i in suite.suite_items()]
    assert len(ids) == len(set(ids))
    assert all(re.fullmatch(r"[BGO]-\d\.\d", i) for i in ids)


def test_every_item_has_assertions():
    assert all(i["assertions"] for i in suite.suite_items())


def test_format_question_includes_instructions():
    prompt = engine.format_question("How long?")
    assert prompt.endswith("Question: How long?")
    assert "Cite the rule number" in prompt


class _Node:
    text = "Rule G-7.2 Each team has 38 minutes."


class _Response:
    source_nodes = [_Node()]

    def __str__(self):
        return "38 minutes (G-7.2)"


class _StubEngine:
    def query(self, prompt):
        assert "Question: Thinking time?" in prompt
        return _Response()


def test_traced_answer_runs_with_tracking_disabled():
    answer = engine.make_answerer(_StubEngine())
    out = answer("Thinking time?")
    assert out["answer"] == "38 minutes (G-7.2)"
    assert out["retrieved_excerpts"] == [_Node.text]
