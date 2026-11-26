# litellm-code-review-router

*Three OpenAI models review the same pull requests. Opik puts their cost and latency side by side.*

![Python](https://img.shields.io/badge/python-3.12%2B-3776AB?style=flat&logo=python&logoColor=white)
![LiteLLM](https://img.shields.io/badge/litellm-1.79%2B-1C7ED6?style=flat)
![Opik](https://img.shields.io/badge/Opik-2.3.4-2f54eb?style=flat)

Picking a model for an automated code reviewer is a cost question as much as a quality question. A reviewer runs on every pull request, so a model that is five times more expensive per call is five times more expensive per day. Providers also report usage in slightly different ways, which is why this comparison often ends up in a spreadsheet. This example sends one set of review prompts to several models through LiteLLM and logs every call to Opik. The comparison becomes a grouped view of one table.

## What you'll build

A small command-line tool, `review-router`, split into modules:

- It reads four fictional diffs from `data/diffs/`: a retry loop, a SQL search with string-built queries, a discount calculation, and a YAML config loader. Each has a deliberate flaw to find.
- It builds the same review prompt for each diff and sends it to `gpt-4o-mini`, `gpt-4.1-mini` and `gpt-4.1` through `litellm.completion`. LiteLLM gives every provider one call shape, so the model is just a string.
- It prints a line per review, then a summary table of tokens, total cost, mean latency and verdict counts per model.
- LiteLLM's `OpikLogger` callback turns each completion into an Opik trace. The trace carries token usage, an estimated cost, and tags for the model and the diff.

## See it in Opik

Open the `litellm-code-review-router` project at http://localhost:5173 (or your own Opik) and go to the Traces tab. After one run there are 12 traces, all named `chat.completion`: four diffs times three models. Each has a single `llm` span with prompt, completion, token counts and an estimated cost.

Each trace has two tags, the short model name (`gpt-4o-mini`, `gpt-4.1-mini` or `gpt-4.1`) and the diff id (for example `0002-sql-search`). Filter on a model tag and the table shrinks to that model's four calls. Sort by estimated cost and the models separate clearly. In my run the four reviews cost about $0.0004 on `gpt-4o-mini`, $0.0012 on `gpt-4.1-mini` and $0.0057 on `gpt-4.1`, roughly a 14x spread, even though the three models used a similar number of tokens (1,430 to 1,497). Price per token, not answer length, drives the gap.

Duration ranks the models differently. In the same run `gpt-4.1` was the fastest, at about 1.3 s per review, and `gpt-4o-mini` the slowest, at about 2.2 s. The ranking is not stable between runs, so treat a single run as a hint and compare several. Open the span of any trace to read the actual review and see whether the cheap model caught the same bugs.

The summary table printed by the CLI shows the same numbers from LiteLLM's own response data:

```
Model            Reviews  Tokens   Total cost  Mean latency Approvals
---------------------------------------------------------------------
gpt-4o-mini            4    1430    $0.000400         2.16s         0
gpt-4.1-mini           4    1497    $0.001175         1.66s         0
gpt-4.1                4    1470    $0.005658         1.34s         0
```

The cost per model in Opik matches this table to the cent fraction, because both come from the same LiteLLM calculation.

## Run it yourself

1. Put `OPENAI_API_KEY` in a `.env` file. The tool looks in the current folder and every parent, so a repo-root `.env` works. `.env.example` shows the format.
2. Point Opik at your instance. For a local stack: `export OPIK_URL_OVERRIDE=http://localhost:5173/api/ OPIK_WORKSPACE=default`. With `opik configure` already done, skip this.
3. `uv sync`
4. `uv run review-router`
5. Open the `litellm-code-review-router` project in Opik.

A full run takes about 30 seconds and costs under one cent.

Offline tests need no keys and no Opik: `env -u OPENAI_API_KEY OPIK_TRACK_DISABLE=true uv run pytest`. `OPIK_TRACK_DISABLE=true` switches Opik tracking off, and one test shows a review call working with the callback installed and tracking off.

## Poke around

- Run `uv run review-router --models openai/gpt-4o-mini openai/gpt-4.1-mini` to compare just two models. Nothing else changes.
- Add your own `.diff` file to `data/diffs/`. The first line must be `title: ...`. It shows up as a new trace per model.
- Change the system prompt in `prompts.py` to ask for one sentence only, and watch the token and cost columns shrink.
- Group or filter traces by the diff-id tag, then read the three reviews of `0002-sql-search` next to each other. Do all three call out the string-built SQL?

## Gotchas we hit

**`NotFoundError: The model gpt-4.1-nano has been deprecated`.** The cheapest OpenAI tier I first tried is gone for this account, and LiteLLM surfaces the provider's 404 as an exception that stops the whole loop. Pick models that exist today in `MODELS` (in `config.py`), for example `openai/gpt-4.1`, and check a one-line call before a big run.

**Filtering by the model name in Opik finds nothing.** Opik stores the dated snapshot the provider answered with (`gpt-4.1-2025-04-14`, `gpt-4o-mini-2024-07-18`), not the alias you asked for. That is why `trace_metadata` in `tracing.py` adds the short alias as a tag:

```python
{"opik": {"tags": [model.split("/")[-1], diff.id]}}
```

Filter on the tag and the grouping stays stable when a snapshot changes.

## How it's put together

- `src/review_router/config.py`: model list, project name, `.env` loading.
- `src/review_router/diffs.py`: reads and parses the `.diff` files.
- `src/review_router/prompts.py`: the review prompt and verdict parsing.
- `src/review_router/router.py`: one LiteLLM call per model and diff, with latency, cost and tokens.
- `src/review_router/report.py`: the per-model summary table.
- `src/review_router/tracing.py`: the Opik callback, tags and flush.
- `src/review_router/cli.py`: the `review-router` entry point.
- `data/diffs/`: four fictional pull requests.
- `tests/test_review_router.py`: offline tests with a stubbed LiteLLM call.

---

*built with Opik · inspired by Opik's examples and documentation*
