from pathlib import Path

import pandas as pd

CSV_PATH = Path(__file__).parent / "data" / "output_2025.csv"

BRIEFING = f"""\
You are a performance analyst for Marlowe Ridge Solar, a fictional 2.8 MW solar farm.
Daily output for April-June 2025 is the CSV file at: {CSV_PATH}

Columns: date (YYYY-MM-DD), array_id, capacity_kw, irradiance_kwh_m2
(sunlight that day, same for every array), energy_kwh (what the array produced).

Load it with pandas and answer with concrete numbers from the data.
Give your final answer as one or two plain sentences, numbers rounded to
two decimals, not as a raw Python object.
"""

QUESTIONS = [
    "Which array is underperforming? Compare each array's kWh per kW of "
    "capacity per unit of irradiance, and say which array is lowest and by "
    "roughly what percent versus the fleet median.",
    "On which date did the whole farm produce no energy, and what was the "
    "total fleet output on the day before it?",
    "What is the total fleet energy per month (April, May, June) in MWh, "
    "and which month was highest?",
]


def load_output(path: Path = CSV_PATH) -> pd.DataFrame:
    df = pd.read_csv(path, parse_dates=["date"])
    return df


def specific_yield(df: pd.DataFrame) -> pd.Series:
    daily = df.assign(ratio=df.energy_kwh / (df.capacity_kw * df.irradiance_kwh_m2))
    daily = daily[daily.energy_kwh > 0]
    return daily.groupby("array_id").ratio.mean().sort_values()


def zero_output_dates(df: pd.DataFrame) -> list[str]:
    fleet = df.groupby("date").energy_kwh.sum()
    return [d.strftime("%Y-%m-%d") for d in fleet[fleet == 0].index]


def monthly_mwh(df: pd.DataFrame) -> dict[str, float]:
    by_month = df.groupby(df.date.dt.strftime("%B")).energy_kwh.sum() / 1000
    return {m: round(v, 2) for m, v in by_month.items()}
