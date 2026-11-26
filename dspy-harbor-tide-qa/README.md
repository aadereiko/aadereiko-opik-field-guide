# dspy-harbor-tide-qa

![Python](https://img.shields.io/badge/python-3.12%2B-3776AB?style=flat&logo=python&logoColor=white)
![DSPy](https://img.shields.io/badge/DSPy-3.x-8B0000?style=flat)
![Opik SDK](https://img.shields.io/badge/Opik%20SDK-2.3.4-2f54eb?style=flat)

*A harbour-office Q&A bot that learns its own house style: 0% of the test suite passing before DSPy compiles it, 100% after.*

## The problem

The Kestrel Quay harbour office answers every tide question in one fixed shape: the bare value, then the table it came from, like `3.4 m | table: HT-2`. Nobody ever wrote that rule down as an instruction. It lives in a handful of past answers.

A plain language model knows the facts and ignores the shape. When someone hands you a "self-optimizing" program that fixes this, you have to take the improvement on trust unless you can see what changed in the prompt and what the change bought. This project makes both visible in Opik.

## What you'll build

- `harbor_tide_qa`, a small Python package with a CLI, wrapping a `dspy.ChainOfThought` program on `gpt-4o-mini`.
- A short fictional tide-table document (`HT-1`, `LOCK-1`, `BAR-1` and so on, eight tables in all) that is passed to the program as context.
- An Opik test suite of eight held-out questions. Every answer is judged on three things: it ends with a `| table: <ID>` tag, it is one short phrase, and it cites the right table with the right value.
- A `BootstrapFewShot` compile step that learns four worked examples from eight answered tickets, using a metric that is plain code (a regex and a substring check, so no judge tokens are spent while compiling).

The CLI runs the suite on the raw program, compiles, then runs the same suite again.

## See it in Opik

Open the `dspy-harbor-tide-qa` project in the local Opik (`http://localhost:5173`, workspace `default`).

**Traces tab.** One clean run leaves 20 traces: 16 named `evaluation_task` (8 suite items, twice) and 4 named `ChainOfThought`. The four are the optimizer's teacher attempts during compilation, the ones that passed the metric and became demos. Open an `evaluation_task` and you get a tree: `task` > `answer_question` > `ChainOfThought` > `Predict` > `LM: openai - gpt-4o-mini`. The LM span carries the token usage and an estimated cost (about $0.0003 per answer).

**The prompt grows.** Compare the LM span input of a first-run trace with a second-run one. In my run the uncompiled prompt was 477 to 483 tokens, and the compiled prompt was 1,957 to 1,963. That extra ~1,480 tokens is the four demos DSPy baked in: complete worked examples with reasoning and a house-style answer. Nothing in the signature changed.

**Test suite runs.** Open the `harbor-tide-qa` test suite and look at its experiments. `dspy-uncompiled` passed 0 of 8 items. The facts were right every time (the per-item "gives 50 minutes" style checks passed), but the table-tag assertion failed on all 8, because the model had never seen the convention. `dspy-compiled` passed 8 of 8.

An LLM judge scores the assertions, so a re-run can drop an item or two. That is normal, and wording each assertion so the judge can check it from the answer alone (see Gotchas) keeps it rare.

## Run it yourself

1. Put your key in the repo-root `.env`, or copy the example: `cp .env.example .env` and set `OPENAI_API_KEY`. The CLI walks up from the current directory to find a `.env`.
2. `uv sync`
3. `uv run harbor-tide-qa` (the same as `uv run harbor-tide-qa run`). It takes about a minute.
4. Optional: `uv run harbor-tide-qa ask "How fast does the ebb run?"` asks the uncompiled program one question and traces it.
5. Open the project in Opik as described above.

Run the offline tests with no key and tracking off:

```
env -u OPENAI_API_KEY OPIK_TRACK_DISABLE=true uv run pytest
```

`OPIK_TRACK_DISABLE=true` is the Python SDK's switch that turns tracing into a no-op.

## Poke around

- Set `max_bootstrapped_demos=1` in `cli.py` and run again. See how much of the convention a single demo buys.
- Edit `house_format_metric` to ignore the table id. The optimizer can no longer tell a well-cited demo from a sloppy one, so watch which assertion slips.
- Add a question the tables cannot answer, with an item assertion that the program says so. Neither the signature nor the demos cover refusals.
- Change a table in `data/tide_tables.txt` and see which suite items start failing the fact check.

## Gotchas we hit

**Correct answers fail the "cites the right table" check.** The judge sees the question and the answer, not the tide tables, so a global assertion like "the cited table actually contains the answer" can't be verified. In an early run it failed three correct compiled answers. Put the expected table into each item's own assertion, which is what `build_suite` in `cli.py` does: `f"The answer cites table {table}. {assertion}"`.

**A right answer fails a "gives about 50 minutes" check.** The compiled answer was `50 minutes | table: HT-2` and the assertion said "about 50 minutes", so the judge marked it down. Write item assertions around the bare value (`The answer gives 50 minutes`), not the phrasing of the source text.

**The `ChainOfThought` traces don't belong to any suite item.** Compilation calls the program directly, outside `run_tests`, so those four calls become root traces named `ChainOfThought` instead of nesting under `evaluation_task`. Filter on trace name `evaluation_task` when you count suite answers.

## How it's put together

- `src/harbor_tide_qa/cli.py`: the `run` and `ask` commands, suite creation, and the uncompiled/compile/compiled flow.
- `src/harbor_tide_qa/program.py`: the DSPy signature, the `OpikCallback` wiring, the traced `answer_question` function, and the suite task.
- `src/harbor_tide_qa/examples.py`: the 8 training tickets, the 8 held-out questions, and the global assertions.
- `src/harbor_tide_qa/metrics.py`: the regex/substring metric used while compiling.
- `src/harbor_tide_qa/corpus.py`: loads and splits the tide tables.
- `src/harbor_tide_qa/config.py`: loads `.env` and pins the Opik project name before any client exists.
- `src/harbor_tide_qa/data/tide_tables.txt`: the fictional tide tables.
- `tests/test_logic.py`: offline tests for the corpus, the metric, the tag parser, the suite task, and a call to a traced function with tracking disabled.

*built with Opik · inspired by Opik's examples and documentation*
