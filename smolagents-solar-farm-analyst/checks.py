import re

import pandas as pd

import farm

CODE_BLOCK = re.compile(r"<code>(.*?)(?:</code>|$)", re.S)


def extract_code(model_output: str) -> list[str]:
    return [m.strip() for m in CODE_BLOCK.findall(model_output) if m.strip()]


def printed_output(step_output: str) -> str:
    body = step_output.split("Execution logs:", 1)[-1]
    return body.split("Last output from code snippet:", 1)[0].strip()


def ground_truth(df: pd.DataFrame) -> dict:
    yields = farm.specific_yield(df)
    fleet = df.groupby("date").energy_kwh.sum()
    outage = pd.Timestamp(farm.zero_output_dates(df)[0])
    return {
        "worst_array": yields.index[0],
        "outage_date": outage,
        "day_before_kwh": round(float(fleet[outage - pd.Timedelta(days=1)]), 2),
        "monthly_mwh": farm.monthly_mwh(df),
    }


def _numbers(text: str) -> set[float]:
    return {round(float(n), 2) for n in re.findall(r"\d+(?:\.\d+)?", text.replace(",", ""))}


def grade(question_index: int, answer: str, truth: dict) -> bool:
    if question_index == 0:
        return truth["worst_array"] in answer
    if question_index == 1:
        d = truth["outage_date"]
        names_date = d.strftime("%Y-%m-%d") in answer or (
            d.strftime("%B") in answer and str(d.day) in answer
        )
        return names_date and truth["day_before_kwh"] in _numbers(answer)
    months = truth["monthly_mwh"]
    best = max(months, key=months.get)
    return all(v in _numbers(answer) for v in months.values()) and _names_only(answer, best, months)


def _names_only(answer: str, best: str, months: dict) -> bool:
    for clause in re.split(r"[,;]\s|\.\s", answer):
        if re.search(r"highest|most|peak|greatest|largest", clause):
            return best in clause and not any(m in clause for m in months if m != best)
    return False
