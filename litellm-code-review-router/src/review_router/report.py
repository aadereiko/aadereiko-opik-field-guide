import statistics
from collections import defaultdict

from .router import ReviewResult


def summarize(results: list[ReviewResult]) -> list[dict]:
    by_model: dict[str, list[ReviewResult]] = defaultdict(list)
    for r in results:
        by_model[r.model].append(r)
    rows = []
    for model, runs in by_model.items():
        rows.append(
            {
                "model": model.split("/")[-1],
                "reviews": len(runs),
                "tokens": sum(r.tokens for r in runs),
                "cost_usd": sum(r.cost_usd for r in runs),
                "mean_latency_s": statistics.mean(r.latency_s for r in runs),
                "approvals": sum(r.verdict == "approve" for r in runs),
            }
        )
    return rows


def format_table(rows: list[dict]) -> str:
    header = f"{'Model':<16}{'Reviews':>8}{'Tokens':>8}{'Total cost':>13}{'Mean latency':>14}{'Approvals':>10}"
    lines = [header, "-" * len(header)]
    for r in rows:
        lines.append(
            f"{r['model']:<16}{r['reviews']:>8}{r['tokens']:>8}"
            f"{'$' + format(r['cost_usd'], '.6f'):>13}{r['mean_latency_s']:>13.2f}s{r['approvals']:>10}"
        )
    return "\n".join(lines)
