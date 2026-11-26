import time
from dataclasses import dataclass

import litellm

from .diffs import Diff
from .prompts import build_messages, extract_verdict


@dataclass(frozen=True)
class ReviewResult:
    model: str
    diff_id: str
    review: str
    verdict: str
    latency_s: float
    cost_usd: float
    tokens: int


def review_diff(model: str, diff: Diff) -> ReviewResult:
    start = time.perf_counter()
    response = litellm.completion(
        model=model,
        messages=build_messages(diff),
        temperature=0,
    )
    latency = time.perf_counter() - start
    review = response.choices[0].message.content or ""
    return ReviewResult(
        model=model,
        diff_id=diff.id,
        review=review,
        verdict=extract_verdict(review),
        latency_s=latency,
        cost_usd=response._hidden_params.get("response_cost") or 0.0,
        tokens=response.usage.total_tokens,
    )


def route_all(models: list[str], diffs: list[Diff]) -> list[ReviewResult]:
    results = []
    for model in models:
        for diff in diffs:
            result = review_diff(model, diff)
            print(
                f"  {model.split('/')[-1]:<14} {diff.id:<26} "
                f"{result.latency_s:5.2f}s ${result.cost_usd:.6f} "
                f"{result.tokens:4d} tok  {result.verdict}"
            )
            results.append(result)
    return results
