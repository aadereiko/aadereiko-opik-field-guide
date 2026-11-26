import json
import re
from dataclasses import asdict, dataclass

STATUSES = ("found_alive", "found_deceased", "still_searching", "stood_down")

EXTRACTION_PROMPT = """\
You are the incident log clerk at a mountain rescue base. You receive the
text of a radio exchange between base and a field team, with no speaker
labels and no punctuation guarantees. Reply with JSON only, in this shape:

{
  "team": "the field team's callsign, e.g. 'Alder One'",
  "grid": "six-digit grid reference written as 'EEE NNN', or null",
  "status": "found_alive | found_deceased | still_searching | stood_down",
  "injuries": ["each injury or condition reported, or an empty list"],
  "needs_helicopter": true or false,
  "next_report_minutes": "minutes until the team reports again, or null"
}

Rules:
- Take the team callsign from the field team, never from base.
- Digits spoken one by one ("four seven two") become digits ("472").
- needs_helicopter is true only if an evacuation was requested and not
  later cancelled.
- Never invent a field. Use null when the radio call does not say.
"""

GRID_PATTERN = re.compile(r"^\d{3} \d{3}$")


@dataclass
class LogEntry:
    team: str
    grid: str | None
    status: str
    injuries: list[str]
    needs_helicopter: bool
    next_report_minutes: int | None


class LogEntryError(ValueError):
    pass


def parse_entry(raw: str) -> LogEntry:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise LogEntryError(f"model reply is not JSON: {exc}") from exc

    team = str(data.get("team") or "").strip()
    if not team or team.lower() == "base":
        raise LogEntryError(f"bad team callsign: {data.get('team')!r}")

    status = data.get("status")
    if status not in STATUSES:
        raise LogEntryError(f"unknown status: {status!r}")

    grid = data.get("grid")
    if grid is not None:
        grid = normalize_grid(str(grid))

    minutes = data.get("next_report_minutes")
    if minutes is not None:
        minutes = int(minutes)

    return LogEntry(
        team=team,
        grid=grid,
        status=status,
        injuries=[str(i) for i in data.get("injuries") or []],
        needs_helicopter=bool(data.get("needs_helicopter")),
        next_report_minutes=minutes,
    )


def normalize_grid(text: str) -> str:
    digits = re.sub(r"\D", "", text)
    if len(digits) != 6:
        raise LogEntryError(f"grid reference needs six digits: {text!r}")
    return f"{digits[:3]} {digits[3:]}"


def format_entry(entry: LogEntry) -> str:
    lines = [
        f"Team:       {entry.team}",
        f"Grid:       {entry.grid or 'not given'}",
        f"Status:     {entry.status}",
        f"Injuries:   {', '.join(entry.injuries) or 'none reported'}",
        f"Helicopter: {'requested' if entry.needs_helicopter else 'not needed'}",
    ]
    if entry.next_report_minutes is not None:
        lines.append(f"Next call:  in {entry.next_report_minutes} min")
    return "\n".join(lines)


def entry_to_dict(entry: LogEntry) -> dict:
    return asdict(entry)
