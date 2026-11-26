import dspy
import pytest

from harbor_tide_qa.corpus import load_tables, split_sections
from harbor_tide_qa.examples import TEST_QUESTIONS, TRAIN_TICKETS, build_trainset
from harbor_tide_qa.metrics import cited_table, house_format_metric
from harbor_tide_qa.program import answer_question, make_task


class StubProgram:
    def __init__(self, answer: str):
        self.answer = answer
        self.calls = []

    def __call__(self, context: str, question: str):
        self.calls.append((context, question))
        return dspy.Prediction(answer=self.answer)


@pytest.fixture
def sections():
    return split_sections(load_tables())


def test_corpus_splits_into_eight_sections(sections):
    assert len(sections) == 8
    assert "2.5 m or more" in sections["BAR-1"]


def test_every_ticket_and_question_points_at_a_real_section(sections):
    for _, _, table, key_fact in TRAIN_TICKETS:
        assert table in sections
    for _, table, _ in TEST_QUESTIONS:
        assert table in sections


def test_train_and_test_questions_do_not_overlap():
    train = {q for q, *_ in TRAIN_TICKETS}
    assert not train & {q for q, *_ in TEST_QUESTIONS}


@pytest.mark.parametrize("answer,expected", [
    ("3.4 m | table: HT-2", "HT-2"),
    ("3.4 m |table:HT-2  ", "HT-2"),
    ("3.4 m, from table HT-2", None),
    ("3.4 m | table: HT-2 and more", None),
])
def test_cited_table(answer, expected):
    assert cited_table(answer) == expected


def test_metric_checks_format_table_and_fact():
    example = build_trainset()[1]
    ok = dspy.Prediction(answer="3.4 m | table: HT-2")
    assert house_format_metric(example, ok)
    assert not house_format_metric(example, dspy.Prediction(answer="It reaches 3.4 m."))
    assert not house_format_metric(example, dspy.Prediction(answer="3.4 m | table: HT-1"))
    assert not house_format_metric(example, dspy.Prediction(answer="4.0 m | table: HT-2"))


def test_traced_answer_function_works_with_tracking_disabled(monkeypatch):
    monkeypatch.setenv("OPIK_TRACK_DISABLE", "true")
    program = StubProgram("50 minutes | table: HT-2")
    assert answer_question(program, "How much later?") == "50 minutes | table: HT-2"
    context, question = program.calls[0]
    assert "[HT-2]" in context and question == "How much later?"


def test_task_returns_input_and_output():
    task = make_task(StubProgram("x | table: HT-1"))
    result = task({"question": "q"})
    assert result == {"input": {"question": "q"}, "output": "x | table: HT-1"}
