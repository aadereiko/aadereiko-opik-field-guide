from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(usecwd=True))

import opik  # noqa: E402

import checks  # noqa: E402
import farm  # noqa: E402
from tracing import PROJECT_NAME  # noqa: E402


def text_of(payload) -> str:
    if isinstance(payload, dict):
        value = payload.get("value", payload)
        if isinstance(value, dict):
            value = value.get("content") or value.get("task") or ""
        return str(value)
    return str(payload or "")


def main() -> int:
    client = opik.Opik()
    truth = checks.ground_truth(farm.load_output())
    traces = sorted(
        client.search_traces(project_name=PROJECT_NAME, max_results=100),
        key=lambda t: t.start_time,
    )
    print(f"project={PROJECT_NAME} traces={len(traces)}")
    failures = 0
    for trace in traces:
        # search_spans returns every span of the trace: Step spans (general) hold the execution logs, OpenAIModel.generate spans (llm) hold the generated code and token usage.
        spans = client.search_spans(project_name=PROJECT_NAME, trace_id=trace.id, max_results=200)
        task = text_of(trace.input)
        question = next(i for i, q in enumerate(farm.QUESTIONS) if task.endswith(q))
        spans.sort(key=lambda s: s.start_time)
        llm = [s for s in spans if s.type == "llm" and s.model]
        code = [c for s in llm for c in checks.extract_code(text_of(s.output))]
        logs = [
            out
            for s in spans
            if s.name.startswith("Step")
            for out in [checks.printed_output(text_of(s.output))]
            if out
        ]
        tokens = sum((s.usage or {}).get("total_tokens", (s.usage or {}).get("total", 0)) for s in llm)
        cost = sum(s.total_estimated_cost or 0 for s in llm)
        correct = checks.grade(question, text_of(trace.output), truth)
        failures += not correct
        print(
            f"q{question + 1}: spans={len(spans)} llm={len(llm)} code_blocks={len(code)} "
            f"exec_logs={len(logs)} tokens={tokens} cost=${cost:.5f} answer_correct={correct}"
        )
        print(f"    code[0]: {code[0].splitlines()[0] if code else '-'}")
        print(f"    log[0]:  {logs[0].splitlines()[0] if logs else '-'}")
    return 1 if failures or len(traces) != len(farm.QUESTIONS) else 0


if __name__ == "__main__":
    raise SystemExit(main())
