import re

TABLE_TAG = re.compile(r"\|\s*table:\s*([A-Z]+-\d+)\s*$")


def cited_table(answer: str) -> str | None:
    match = TABLE_TAG.search(answer.strip())
    return match.group(1) if match else None


def house_format_metric(example, prediction, trace=None) -> bool:
    answer = prediction.answer.strip()
    return (
        cited_table(answer) == example.table
        and example.key_fact.lower() in answer.lower()
    )
