import json
import os
from collections import Counter
from pathlib import Path

from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(usecwd=True) or Path(__file__).resolve().parent.parent / ".env")

import opik

PROJECT = os.environ.get("OPIK_PROJECT_NAME", "openai-agents-insurance-claims")


def describe_span(span) -> str | None:
    meta = span.metadata or {}
    if meta.get("type") == "handoff":
        return f"handoff    {meta['from_agent']} -> {meta['to_agent']}"
    if span.type == "tool":
        args = json.loads((span.input or {}).get("input", "{}"))
        return f"tool       {span.name}({', '.join(f'{k}={v}' for k, v in args.items() if k != 'description')})"
    return None


def main() -> None:
    client = opik.Opik()
    traces = sorted(
        client.search_traces(project_name=PROJECT, max_results=200),
        key=lambda t: t.start_time,
    )
    print(f"project={PROJECT} traces={len(traces)} threads={len({t.thread_id for t in traces})}")
    filed_per_thread: Counter[str] = Counter()
    for t in traces:
        spans = client.search_spans(project_name=PROJECT, trace_id=t.id, max_results=200)
        shape = Counter(s.type for s in spans)
        cost = sum(s.total_estimated_cost or 0 for s in spans)
        tokens = sum((s.usage or {}).get("total_tokens", 0) for s in spans)
        print(f"\nthread={t.thread_id}  spans={dict(shape)} tokens={tokens} cost=${cost:.5f}")
        for s in sorted(spans, key=lambda s: s.start_time):
            line = describe_span(s)
            if line:
                print(f"  {line}")
            if s.type == "tool" and s.name == "file_claim":
                filed_per_thread[t.thread_id] += 1
    print("\nfile_claim calls per thread:", dict(filed_per_thread))
    client.flush()


if __name__ == "__main__":
    main()
