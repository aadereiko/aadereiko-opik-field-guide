# crewai-theater-production-crew

![Python](https://img.shields.io/badge/python-3.12%2B-3776AB?style=flat&logo=python&logoColor=white)
![CrewAI](https://img.shields.io/badge/crewai-1.15%2B-FF5A50?style=flat)
![Opik](https://img.shields.io/badge/opik-2.3.4-2f54eb?style=flat)

*A volunteer theater crew of three AI agents, one Opik trace per run, and a dollar cost on each agent.*

When several agents work in a chain, you only see the last answer. If the budget comes out wrong, was it the casting step, the scheduling step, or the budget step that went off the rails? And which of them spent the tokens? This project is a small CrewAI crew that plans a fictional community-theater show, packaged as an installable Python package with a command-line entry point. One call to `track_crewai` makes every run show up in Opik as a single trace you can read agent by agent.

## What you'll build

- A Casting Director, a Stage Manager and a Producer, run in sequence on `gpt-4o-mini`.
- They work from `src/theater_crew/data/season_notes.md`: five roles, five auditioners with blackout dates, a hall that is only free on some nights, and a $3,200 budget ceiling. All of it is made up, so the run needs only an OpenAI key.
- A `theater-crew` command (`python -m theater_crew` works too) with `--notes`, `--model` and `--quiet` options.

## See it in Opik

Open the project `crewai-theater-production-crew` (workspace `default`). A clean run leaves exactly one trace, named `kickoff`. Its input is the production notes and its output is the budget the Producer wrote.

Expand the trace: 49 spans in total. Three are `llm` spans (`chat_completion_create`, model `gpt-4o-mini-2024-07-18`) and 46 are `general` spans for the crew's own plumbing. The tree has one `Task: ...` span per task (`Cast the show`, `Schedule rehearsals`, `Draft the budget`), and under each task a span named after its agent. The LLM span sits underneath that agent, so you can read cost per agent. In my run:

| Agent | Tokens | Estimated cost |
|---|---|---|
| Casting Director | 704 | $0.00018 |
| Stage Manager | 1,484 | $0.00057 |
| Producer | 1,683 | $0.00033 |

The whole trace cost about $0.0011. The Stage Manager spent the most because it writes the longest answer (763 completion tokens). The Producer read the most (1,511 prompt tokens) because it gets the notes plus both earlier outputs.

## Run it yourself

1. Put `OPENAI_API_KEY` in a `.env` (this folder or any parent; the CLI walks up to find one). For local Opik also set `OPIK_URL_OVERRIDE=http://localhost:5173/api/` and `OPIK_WORKSPACE=default`. See `.env.example`.
2. `uv sync`
3. `uv run theater-crew --quiet` (about 30 seconds). Drop `--quiet` to watch the agents think.
4. Open the project in Opik and expand the newest `kickoff` trace.
5. Tests, offline and with no keys: `env -u OPENAI_API_KEY OPIK_TRACK_DISABLE=true uv run pytest`

## Poke around

- Open the Producer's LLM span and compare its input with the notes. Does every line item exist in the notes? Models like to invent fees.
- Run `uv run theater-crew --notes my_notes.md` with a changed ceiling, or an actor whose blackout dates clash with the tech rehearsal, and watch the Stage Manager's span.
- Try `--model gpt-4.1-mini` and compare per-agent cost between the two traces.
- Add a fourth agent (a publicist, say) in `crew.py` and see a new branch appear with no Opik changes.

## Gotchas we hit

**Symptom:** the final budget is full of numbers that are not in the notes (a $1,000 hall rental, "actor compensation", a $2,500 ceiling).
**Cause:** an agent only sees what is in its own task description plus the outputs listed in `context=`. My first draft gave the raw notes only to the Casting Director, so the Producer was guessing.
**Fix:** put `{season_notes}` in every task description that needs the facts. The trace shows this clearly: the Producer's LLM input had no ceiling in it.

**Symptom:** a short CLI run can finish with no trace, or a half-finished one.
**Cause:** Opik sends spans in a background batch.
**Fix:** call `opik.flush_tracker()` before the process exits, as `cli.py` does.

## How it's put together

- `src/theater_crew/crew.py`: the three agents, three tasks, and `enable_tracing` (the `track_crewai` call).
- `src/theater_crew/cli.py`: argument parsing, env loading, kickoff, flush.
- `src/theater_crew/env.py`: finds a `.env` before Opik is configured.
- `src/theater_crew/notes.py`: loads the bundled notes and pulls out the budget ceiling.
- `src/theater_crew/data/season_notes.md`: the fictional production notes.
- `tests/`: notes parsing, crew shape, tracing enabled with tracking disabled, and the CLI with a stubbed kickoff.

*built with Opik · inspired by Opik's examples and documentation*
