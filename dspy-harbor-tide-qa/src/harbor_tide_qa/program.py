import dspy
import opik
from opik.integrations.dspy.callback import OpikCallback

from harbor_tide_qa import MODEL, PROJECT_NAME
from harbor_tide_qa.corpus import load_tables


class TideQA(dspy.Signature):
    """Answer the question using the harbour office tide tables."""

    context: str = dspy.InputField(desc="the tide tables")
    question: str = dspy.InputField()
    answer: str = dspy.OutputField()


def configure_dspy() -> None:
    # OpikCallback turns every DSPy module and LM call into spans in one trace;
    # without it DSPy runs but nothing reaches Opik.
    dspy.configure(
        lm=dspy.LM(MODEL, cache=False),
        callbacks=[OpikCallback(project_name=PROJECT_NAME, log_graph=True)],
    )


def build_program() -> dspy.Module:
    return dspy.ChainOfThought(TideQA)


# A general span that groups one answer; the DSPy callback nests its module and
# LM spans under it, so a suite item shows up as one readable tree.
@opik.track(name="answer_question", type="general")
def answer_question(program: dspy.Module, question: str) -> str:
    return program(context=load_tables(), question=question).answer


def make_task(program: dspy.Module):
    # run_tests calls this once per suite item and records the returned dict
    # as the item's output, which the LLM judge then checks.
    def task(item: dict) -> dict:
        return {
            "input": {"question": item["question"]},
            "output": answer_question(program, item["question"]),
        }

    return task
