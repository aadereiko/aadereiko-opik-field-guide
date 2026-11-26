# /// script
# requires-python = ">=3.12"
# dependencies = ["opik==2.3.4", "python-dotenv>=1.0"]
# ///
import sys

from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(usecwd=True))

import opik

PROJECT = "n8n-makerspace-booking-review"
REVIEW_NODE = "Review booking (gpt-4o-mini)"


def main() -> int:
    # Reads the same Opik the hooks export to: OPIK_URL_OVERRIDE / OPIK_WORKSPACE from the repo-root .env.
    client = opik.Opik()
    traces = sorted(client.search_traces(project_name=PROJECT, max_results=100), key=lambda t: t.start_time)
    if not traces:
        print(f"No traces in project {PROJECT}. Run ./setup.sh and ./demo.sh first.")
        return 1

    print(f"{len(traces)} executions traced in {PROJECT}\n")
    for trace in traces:
        spans = client.search_spans(project_name=PROJECT, trace_id=trace.id, max_results=50)
        # The hooks store each node's OTel attributes on its span; n8n.node.input and n8n.node.output hold the
        # items that went into and came out of the node, which is how you see what the model was given.
        review = next((s for s in spans if s.name == REVIEW_NODE), None)
        if review is None:
            print(f"- {trace.id}: {len(spans)} spans, no '{REVIEW_NODE}' span")
            continue
        attrs = review.input or {}
        request = (attrs.get("n8n.node.input") or [{}])[0]
        verdict = (attrs.get("n8n.node.output") or [{}])[0].get("message", {}).get("content", {})
        body = request.get("body", {})
        print(f"- {body.get('member')} | {body.get('tool')}, {body.get('hours')} h from {body.get('start')}")
        print(f"  inductions seen by the model: {request.get('inductions')}")
        print(f"  decision: {verdict.get('decision')} | {verdict.get('reason')}")
        print(f"  spans: {', '.join(s.name for s in sorted(spans, key=lambda s: s.start_time))}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
