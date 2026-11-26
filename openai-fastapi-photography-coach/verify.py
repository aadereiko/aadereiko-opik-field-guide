from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(usecwd=True))

import time  # noqa: E402

import opik  # noqa: E402

from coach.rule import RULE_NAME, SCORE_NAME  # noqa: E402

PROJECT = "openai-fastapi-photography-coach"


def scores_for(client: opik.Opik, trace_ids: list[str]) -> dict[str, int | None]:
    found: dict[str, int | None] = {}
    for trace_id in trace_ids:
        trace = client.get_trace_content(trace_id)
        values = [s.value for s in (trace.feedback_scores or []) if s.name == SCORE_NAME]
        found[trace_id] = values[0] if values else None
    return found


def main() -> None:
    client = opik.Opik(project_name=PROJECT)
    everything = client.search_traces(project_name=PROJECT, max_results=200)
    # The judge's own runs are logged to this project too (prepare_evaluation / llm_call); skip them.
    traces = [t for t in everything if t.name == "coach-turn"]
    # The online rule runs server-side after the traces land, so poll until every trace is scored.
    for _ in range(30):
        scores = scores_for(client, [t.id for t in traces])
        if all(v is not None for v in scores.values()):
            break
        time.sleep(4)
    print(f"project={PROJECT} coach-turn traces={len(traces)} judge traces={len(everything) - len(traces)}")
    for t in sorted(traces, key=lambda t: t.start_time):
        spans = client.search_spans(project_name=PROJECT, trace_id=t.id)
        shape = ", ".join(f"{s.name}[{s.type}] cost={s.total_estimated_cost} tokens={(s.usage or {}).get('total_tokens')}" for s in spans)
        print(f"- thread={t.thread_id} {RULE_NAME}={scores[t.id]} | {str(t.input.get('user_message', t.input))[:55]!r} | {shape}")
    threads = {t.thread_id for t in traces}
    print(f"threads={sorted(threads)}")


if __name__ == "__main__":
    main()
