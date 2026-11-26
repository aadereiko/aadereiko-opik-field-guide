# optimizer-instrument-family-classifier

![Python 3.12+](https://img.shields.io/badge/python-3.12%2B-blue) ![opik 2.3.4](https://img.shields.io/badge/opik-2.3.4-2e8555) ![opik-optimizer 3.2.0](https://img.shields.io/badge/opik--optimizer-3.2.0-orange)

**Let an optimizer rewrite a so-so prompt for sorting instruments into families, then read the score for every trial in Opik.**

## The problem

A school music shop wants a helper that reads a short clue ("a coiled metal tube with three piston valves...") and names the instrument family: strings, woodwind, brass or percussion. The first prompt anyone writes for this works in a human sense. The model knows the answer. But it replies "It sounds like a trumpet, which is a brass instrument", and a program that wants the single word `brass` cannot use that.

You could tweak the wording by hand and eyeball a few replies. This example does it with measurement instead: a labeled dataset, an exact-match metric, and Opik's Agent Optimizer proposing new prompts and keeping the best one.

## What you'll build

One script, `main.py`, that:

1. Uploads 24 fictional clues (6 per family, some tricky: a saxophone is metal but woodwind, a piano has strings but is hit by hammers) to an Opik dataset.
2. Saves a loose starting prompt to the Opik prompt library as version 1.
3. Runs `MetaPromptOptimizer` (gpt-4o-mini for both classifying and reasoning, at most 6 trials). It scores the starting prompt, asks the model to explain the failures, and tries rewritten prompts.
4. If a rewrite scores higher, saves it as version 2 of the same library prompt and prints it.

## See it in Opik

Open `http://localhost:5173`, workspace `default` (or your own Opik), and look for the project `optimizer-instrument-family-classifier`.

- **Optimization runs.** The script prints a direct link to the run. In my run it held two trials, both scored on all 24 clues: the starting prompt at `family_accuracy` 0.333, then a rewrite at 0.958. The optimizer stopped after one round because the first rewrite was already almost perfect. The big gap is the point: the model was rarely wrong about the family, it was wrong about the answer format.
- **Traces tab** of the project. 49 traces: 48 `evaluation_task` traces (24 clues x 2 trials) and one `optimization_algorithm` trace holding the optimizer's own reasoning call. Each `evaluation_task` has a `llm_task` span with an `llm` span called `completion` inside it, carrying token usage and an estimated cost (49 costed LLM spans, about $0.001 in total), plus a `metrics_calculation` span with the score. Open a failing trial-1 trace and you can read replies like "The instrument described is a gong, which belongs to the percussion family."
- **Prompts** library: `instrument-family-classifier` has two versions. Version 1 is the starting prompt ("Answer in a few words."). Version 2 is the winner, which ends with "only mentioning the family name." The change description on version 2 records the scores.

Your numbers will differ a little. gpt-4o-mini is not deterministic and the optimizer follows the failures it happens to see.

## Run it yourself

1. Put `OPENAI_API_KEY` in a `.env` file in this folder or any folder above it. For a local Opik also set `OPIK_URL_OVERRIDE=http://localhost:5173/api/` and `OPIK_WORKSPACE=default` (see `.env.example`).
2. `uv sync`
3. `uv run main.py` (about two minutes, well under a cent of model usage)
4. Open the "optimization run" link it prints.

## Poke around

- Change `BASELINE_SYSTEM` to end with "Answer with the family." and re-run. The starting score jumps close to 1.0 and there is almost nothing left to optimize. Prompt wording alone moves the score.
- Add a fifth family (for example `keyboard`) to `instruments.py` and watch the optimizer have to learn the new label.
- Loosen `normalize` in `scoring.py` so "It is brass." passes, and see how much of the gain was only formatting.
- Lower `MAX_TRIALS` to 2, or raise `prompts_per_round`, and compare the cost and the final prompt.

## Gotchas we hit

**The prompt never sees my text, and every answer is "Please provide the description..."; accuracy is 0.000 on every trial.** I named the dataset column `description` and used `{description}` in the user message. The evaluation inputs that reached the model only contained `label` and `id`, so the placeholder was filled with nothing. Fix: use a column name that is not `description`. Here it is `clue`:

```python
dataset.insert([{"clue": d, "label": label} for d, label in INSTRUMENTS])
prompt = ChatPrompt(name=..., system=..., user="{clue}", model=MODEL)
```

**`result.llm_cost_total` is `None`, so the script prints "unavailable".** With opik-optimizer 3.2.0 the cost total was not filled in on this run. The spans still carry cost: search the project's spans and read `total_estimated_cost` on each `llm` span.

**The saved library prompt shows a literal `{clue}`.** The optimizer writes placeholders with single braces, the prompt library uses double braces. Convert before saving:

```python
message["content"] = message["content"].replace("{clue}", "{{clue}}")
```

## How it's put together

- `main.py` loads `.env`, builds the dataset, saves the baseline, runs the optimizer, prints the scores and a project-pinned run link, saves the winner.
- `instruments.py` holds the 24 labeled clues.
- `scoring.py` holds the exact-match metric.
- `tests/test_scoring.py` runs offline: the metric, dataset balance, and a `@opik.track` function called with tracking disabled.
- Tests: `env -u OPENAI_API_KEY OPIK_TRACK_DISABLE=true uv run pytest`

---

*built with Opik · inspired by Opik's examples and documentation*
