import csv
import math
import random
from datetime import date, timedelta
from pathlib import Path

OUT = Path(__file__).parent / "data" / "output_2025.csv"
ARRAYS = ["A1", "A2", "B1", "B2", "C1", "C2"]
START = date(2025, 4, 1)
DAYS = 91
STORM_DAY = date(2025, 5, 14)
SOILED_ARRAY = "B2"
SOILED_FROM = date(2025, 5, 20)


def build_rows() -> list[dict]:
    rng = random.Random(7)
    rows = []
    for d in range(DAYS):
        day = START + timedelta(days=d)
        season = 4.6 + 1.6 * math.sin(math.pi * d / DAYS)
        sun = max(0.6, rng.gauss(season, 0.9))
        for array in ARRAYS:
            capacity_kw = 500 if array.startswith("A") else 450
            kwh = capacity_kw * sun * 0.19 * rng.uniform(0.97, 1.03)
            if day == STORM_DAY:
                sun_today, kwh = 0.4, 0.0
            else:
                sun_today = sun
            if array == SOILED_ARRAY and day >= SOILED_FROM:
                kwh *= 0.72
            rows.append(
                {
                    "date": day.isoformat(),
                    "array_id": array,
                    "capacity_kw": capacity_kw,
                    "irradiance_kwh_m2": round(sun_today, 2),
                    "energy_kwh": round(kwh, 1),
                }
            )
    return rows


def main() -> None:
    rows = build_rows()
    with OUT.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print(f"wrote {len(rows)} rows to {OUT}")


if __name__ == "__main__":
    main()
