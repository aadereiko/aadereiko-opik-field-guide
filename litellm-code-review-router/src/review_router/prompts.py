from .diffs import Diff

SYSTEM_PROMPT = (
    "You are a senior engineer reviewing a pull request. Reply with: one sentence "
    "on what the change does, then a bullet list of concrete problems (bugs, "
    "security, readability), most serious first, then a verdict line that is "
    "exactly 'Verdict: approve' or 'Verdict: request changes'. Keep it under 120 words."
)


def build_messages(diff: Diff) -> list[dict[str, str]]:
    user = f"Pull request: {diff.title}\n\n```diff\n{diff.patch}\n```"
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user},
    ]


def extract_verdict(review: str) -> str:
    for line in reversed(review.strip().splitlines()):
        if line.strip().lower().startswith("verdict:"):
            return line.split(":", 1)[1].strip().lower()
    return "unknown"
